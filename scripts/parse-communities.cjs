import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.join(__dirname, 'communities_utf8.sql');
const outputFile = path.join(__dirname, 'communities-parsed.json');

const sql = fs.readFileSync(sqlFile, 'utf-8');

/**
 * Parse a SQL VALUES clause, handling:
 * - Numbers (including negative): -6894867367826812928
 * - N'string' with possible embedded quotes ('' escaping)
 * - NULL
 * - CAST(N'...' AS DateTime2)
 */
function parseValues(valuesStr) {
  const results = [];
  let i = 0;
  const s = valuesStr.trim();

  while (i < s.length) {
    // Skip whitespace and commas
    while (i < s.length && (s[i] === ' ' || s[i] === ',' || s[i] === '\t')) i++;
    if (i >= s.length) break;

    if (s.substring(i, i + 4) === 'NULL') {
      results.push(null);
      i += 4;
    } else if (s.substring(i, i + 4) === 'CAST') {
      // CAST(N'...' AS DateTime2) - extract the string inside
      const start = s.indexOf("N'", i);
      const end = findClosingQuote(s, start + 2);
      results.push(s.substring(start + 2, end));
      // Skip past the closing paren of CAST(...)
      i = s.indexOf(')', end) + 1;
    } else if (s.substring(i, i + 2) === "N'") {
      // N'string value'
      const end = findClosingQuote(s, i + 2);
      let val = s.substring(i + 2, end);
      val = val.replace(/''/g, "'"); // unescape doubled quotes
      results.push(val);
      i = end + 1;
    } else if (s[i] === '-' || (s[i] >= '0' && s[i] <= '9')) {
      // Number
      let numStr = '';
      while (i < s.length && (s[i] === '-' || s[i] === '.' || (s[i] >= '0' && s[i] <= '9'))) {
        numStr += s[i];
        i++;
      }
      results.push(numStr); // Keep as string to avoid BigInt issues with JS numbers
    } else {
      // Unknown token, skip
      i++;
    }
  }
  return results;
}

function findClosingQuote(s, start) {
  let i = start;
  while (i < s.length) {
    if (s[i] === "'") {
      if (i + 1 < s.length && s[i + 1] === "'") {
        i += 2; // escaped quote
      } else {
        return i;
      }
    } else {
      i++;
    }
  }
  return i;
}

function extractInserts(tableName, columnNames) {
  const pattern = `INSERT [communities].[${tableName}]`;
  const rows = [];
  const lines = sql.split('\n');

  for (const line of lines) {
    if (!line.startsWith(pattern)) continue;

    // Extract VALUES(...) part
    const valIdx = line.indexOf(') VALUES (');
    if (valIdx === -1) continue;

    const valuesStr = line.substring(valIdx + 10, line.lastIndexOf(')'));
    const values = parseValues(valuesStr);

    // Extract column names from the INSERT statement itself
    const colStart = line.indexOf('(') + 1;
    const colEnd = line.indexOf(')');
    const sqlCols = line.substring(colStart, colEnd)
      .split(',')
      .map(c => c.trim().replace(/\[/g, '').replace(/\]/g, ''));

    // Build object mapping requested columns
    const obj = {};
    for (const col of columnNames) {
      const idx = sqlCols.indexOf(col);
      if (idx !== -1 && idx < values.length) {
        obj[toCamelCase(col)] = values[idx];
      } else {
        obj[toCamelCase(col)] = null;
      }
    }
    rows.push(obj);
  }
  return rows;
}

function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// Parse all tables
const categories = extractInserts('Categories', [
  'Id', 'PublicId', 'Name', 'Description', 'Slug', 'IconClass', 'ColorHex', 'DisplayOrder', 'Status'
]);

const types = extractInserts('Types', [
  'Id', 'PublicId', 'CategoryId', 'Name', 'Description', 'Slug', 'IconClass', 'ColorHex', 'DisplayOrder', 'Status'
]);

const communities = extractInserts('Communities', [
  'Id', 'PublicId', 'TypeId', 'Name', 'Description', 'Slug', 'IconClass', 'ColorHex', 'DisplayOrder', 'Status'
]);

const characters = extractInserts('Characters', [
  'Id', 'PublicId', 'CommunityId', 'LevelId', 'Name', 'RealName', 'Description', 'Archetype', 'Gender', 'DisplayOrder', 'Status'
]);

const result = { categories, types, communities, characters };

fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8');

// Summary
console.log('=== Parse Summary ===');
console.log(`Categories: ${categories.length}`);
console.log(`Types: ${types.length}`);
console.log(`Communities: ${communities.length}`);
console.log(`Characters: ${characters.length}`);
console.log('');

console.log('--- Categories ---');
categories.forEach(c => console.log(`  [${c.displayOrder}] ${c.name} - ${c.description} (${c.slug})`));
console.log('');

console.log('--- Types ---');
types.forEach(t => console.log(`  [${t.displayOrder}] ${t.name} - ${t.description} (${t.slug})`));
console.log('');

console.log('--- All Community Names (by type) ---');
// Group communities by typeId
const typeMap = {};
types.forEach(t => { typeMap[t.id] = t.name; });
const grouped = {};
communities.forEach(c => {
  const typeName = typeMap[c.typeId] || 'Unknown';
  if (!grouped[typeName]) grouped[typeName] = [];
  grouped[typeName].push(c);
});

for (const [typeName, comms] of Object.entries(grouped)) {
  console.log(`\n  ${typeName}:`);
  comms.sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder));
  comms.forEach(c => console.log(`    [${c.displayOrder}] ${c.name} (${c.slug}) - ${c.description}`));
}

console.log(`\n--- Characters per Community (top 10 by count) ---`);
const charCount = {};
characters.forEach(c => {
  charCount[c.communityId] = (charCount[c.communityId] || 0) + 1;
});
const commMap = {};
communities.forEach(c => { commMap[c.id] = c.name; });
const sorted = Object.entries(charCount)
  .map(([id, count]) => ({ name: commMap[id] || id, count }))
  .sort((a, b) => b.count - a.count);
sorted.slice(0, 10).forEach(c => console.log(`  ${c.name}: ${c.count} characters`));

console.log(`\nOutput written to: ${outputFile}`);
