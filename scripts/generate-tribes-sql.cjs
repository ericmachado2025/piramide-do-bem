#!/usr/bin/env node
/**
 * Gera SQL de INSERT para tribes e characters
 * baseado no Communities.sql parseado
 */

const fs = require('fs');
const data = require('./communities-parsed.json');

// Mapear types por id
const typeById = {};
data.types.forEach(t => { typeById[t.id] = t; });

// Mapear categories por id
const catById = {};
data.categories.forEach(c => { catById[c.id] = c; });

// Definir as 8 tribos da Pirâmide → quais Types do OpenConnection cada uma agrupa
const TRIBE_DEFS = [
  {
    name: 'Marvel',
    slug: 'marvel',
    icon: 'fa-mask',
    color: '#E23636',
    description: 'Universo Marvel — de recruta a super-herói',
    order: 1,
    typeNames: ['Marvel Universe']
  },
  {
    name: 'Dragon Ball',
    slug: 'dragon-ball',
    icon: 'fa-bolt',
    color: '#FF6B00',
    description: 'Liberte seu poder Saiyajin',
    order: 2,
    typeNames: ['Dragon Ball']
  },
  {
    name: 'Harry Potter',
    slug: 'harry-potter',
    icon: 'fa-hat-wizard',
    color: '#7B2D8E',
    description: 'De primeiro ano a lenda de Hogwarts',
    order: 3,
    typeNames: ['Harry Potter']
  },
  {
    name: 'Star Wars',
    slug: 'star-wars',
    icon: 'fa-jedi',
    color: '#FFE81F',
    description: 'Do templo ao conselho Jedi',
    order: 4,
    typeNames: ['Star Wars']
  },
  {
    name: 'Naruto',
    slug: 'naruto',
    icon: 'fa-wind',
    color: '#FF7518',
    description: 'De genin a Hokage',
    order: 5,
    typeNames: ['Naruto', 'My Hero Academia']
  },
  {
    name: 'Atletas',
    slug: 'atletas',
    icon: 'fa-trophy',
    color: '#00B4D8',
    description: 'De iniciante a platina',
    order: 6,
    typeNames: ['Soccer', 'Basketball', 'Tennis', 'Formula 1', 'MMA', 'Boxing', 'Golf', 'Swimming', 'Athletics', 'Gymnastics']
  },
  {
    name: 'Rockstars',
    slug: 'rockstars',
    icon: 'fa-guitar',
    color: '#9B59B6',
    description: 'Da garagem ao Hall of Fame',
    order: 7,
    typeNames: ['Rock', 'Pop', 'Hip Hop', 'Electronic', 'Metal', 'Classical', 'Jazz', 'Country']
  },
  {
    name: 'Aventureiros',
    slug: 'aventureiros',
    icon: 'fa-dungeon',
    color: '#2ECC71',
    description: 'De aldeão a lenda',
    order: 8,
    typeNames: ['Dungeons Dragons', 'Magic Gathering', 'Pokemon TCG', 'Yu-Gi-Oh', 'Warhammer', 'Pathfinder', 'Call Cthulhu', 'Vampire Masquerade', 'Shadowrun', 'Starfinder']
  }
];

const MIN_POINTS = [0, 100, 300, 600, 1000];

// Normalizar gender
function normalizeGender(g) {
  if (!g) return 'NEUTRAL';
  const u = g.toUpperCase();
  if (u === 'MALE' || u === 'M') return 'MALE';
  if (u === 'FEMALE' || u === 'F') return 'FEMALE';
  return 'NEUTRAL';
}

// Normalizar archetype
function normalizeArchetype(a) {
  if (!a) return 'HERO';
  const u = a.toUpperCase();
  if (u === 'HERO' || u === 'ALLY') return 'HERO';
  if (u === 'ANTI_HERO') return 'ANTI_HERO';
  if (u === 'VILLAIN') return 'VILLAIN';
  return 'HERO'; // General, Warrior, Entity → HERO
}

let sqlLines = [];
sqlLines.push('-- ============================================');
sqlLines.push('-- SEED: Tribos e Personagens (do Communities.sql)');
sqlLines.push('-- ============================================');
sqlLines.push('');

let totalTribes = 0;
let totalChars = 0;

for (const tribeDef of TRIBE_DEFS) {
  // Find matching types
  const matchingTypes = data.types.filter(t => tribeDef.typeNames.includes(t.name));

  if (matchingTypes.length === 0) {
    console.error(`WARN: No types found for tribe ${tribeDef.name}`);
    continue;
  }

  // Use first type's PublicId as tribe id
  const tribeId = matchingTypes[0].publicId;

  // Gather all communities under these types
  const typeIds = new Set(matchingTypes.map(t => t.id));
  const communities = data.communities.filter(c => typeIds.has(c.typeId));

  // Gather all characters from these communities
  const commIds = new Set(communities.map(c => c.id));
  const allChars = data.characters.filter(ch => commIds.has(ch.communityId) && ch.status === 'ACTIVE');

  // Insert tribe
  const desc = tribeDef.description.replace(/'/g, "''");
  sqlLines.push(`INSERT INTO tribes (id, name, slug, icon_class, color_hex, description, display_order) VALUES ('${tribeId}', '${tribeDef.name}', '${tribeDef.slug}', '${tribeDef.icon}', '${tribeDef.color}', '${desc}', ${tribeDef.order});`);
  totalTribes++;

  // Group characters by archetype + gender
  const groups = {};
  for (const ch of allChars) {
    const arch = normalizeArchetype(ch.archetype);
    const gen = normalizeGender(ch.gender);
    const key = `${arch}_${gen}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ch);
  }

  // For each group, sort by displayOrder and pick top 5 for tiers
  for (const [key, chars] of Object.entries(groups)) {
    chars.sort((a, b) => a.displayOrder - b.displayOrder);
    const top5 = chars.slice(0, 5);

    for (let i = 0; i < top5.length; i++) {
      const ch = top5[i];
      const tier = i + 1;
      const charName = ch.name.replace(/'/g, "''");
      const realName = ch.realName ? ch.realName.replace(/'/g, "''") : null;
      const charDesc = ch.description ? ch.description.replace(/'/g, "''") : '';
      const [arch, gen] = key.split('_');

      sqlLines.push(`INSERT INTO characters (id, tribe_id, tier, name, real_name, description, archetype, gender, display_order, min_points) VALUES ('${ch.publicId}', '${tribeId}', ${tier}, '${charName}', ${realName ? "'" + realName + "'" : 'NULL'}, '${charDesc}', '${arch}', '${gen}', ${ch.displayOrder}, ${MIN_POINTS[i]});`);
      totalChars++;
    }
  }

  sqlLines.push('');
}

const sqlContent = sqlLines.join('\n');
fs.writeFileSync('scripts/seed-tribes-characters.sql', sqlContent);

console.log(`=== Gerado: seed-tribes-characters.sql ===`);
console.log(`Tribos: ${totalTribes}`);
console.log(`Personagens: ${totalChars}`);

// Show breakdown per tribe
for (const tribeDef of TRIBE_DEFS) {
  const matchingTypes = data.types.filter(t => tribeDef.typeNames.includes(t.name));
  if (matchingTypes.length === 0) continue;
  const typeIds = new Set(matchingTypes.map(t => t.id));
  const communities = data.communities.filter(c => typeIds.has(c.typeId));
  const commIds = new Set(communities.map(c => c.id));
  const allChars = data.characters.filter(ch => commIds.has(ch.communityId) && ch.status === 'ACTIVE');

  const groups = {};
  for (const ch of allChars) {
    const arch = normalizeArchetype(ch.archetype);
    const gen = normalizeGender(ch.gender);
    const key = `${arch}_${gen}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ch);
  }

  const charCount = Object.values(groups).reduce((sum, g) => sum + Math.min(g.length, 5), 0);
  console.log(`  ${tribeDef.name}: ${Object.keys(groups).length} combos → ${charCount} personagens (${communities.length} communities)`);
}
