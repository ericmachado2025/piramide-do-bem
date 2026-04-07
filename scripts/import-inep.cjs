#!/usr/bin/env node
/**
 * Importa escolas INEP para Supabase em lotes de 500
 */
const fs = require('fs');

const SUPABASE_URL = 'https://frdpscbdtudaulscexyp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkwODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s';

const BATCH_SIZE = 500;

async function main() {
  const csv = fs.readFileSync('scripts/inep_schools_active.csv', 'utf8');
  const lines = csv.trim().split('\n').slice(1); // skip header

  console.log(`Total escolas a importar: ${lines.length}`);

  let imported = 0;
  let errors = 0;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);
    const records = [];

    for (const line of batch) {
      const parts = line.split(';');
      if (parts.length < 4) continue;

      const [inep_code, name, city, state] = parts;
      if (!inep_code || !name || !city || !state) continue;

      records.push({
        inep_code: inep_code.trim(),
        name: name.trim(),
        city: city.trim(),
        state: state.trim().substring(0, 2),
        school_type: 'fundamental',
        active: true
      });
    }

    if (records.length === 0) continue;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/schools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=minimal,resolution=ignore-duplicates'
        },
        body: JSON.stringify(records)
      });

      if (res.ok) {
        imported += records.length;
      } else {
        const text = await res.text();
        // Try individual insert on batch failure
        if (res.status === 409 || text.includes('duplicate')) {
          // Use upsert
          const res2 = await fetch(`${SUPABASE_URL}/rest/v1/schools`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Prefer': 'return=minimal,resolution=merge-duplicates'
            },
            body: JSON.stringify(records)
          });
          if (res2.ok) {
            imported += records.length;
          } else {
            console.error(`Batch ${Math.floor(i/BATCH_SIZE)+1} upsert failed: ${res2.status}`);
            errors += records.length;
          }
        } else {
          console.error(`Batch ${Math.floor(i/BATCH_SIZE)+1} failed: ${res.status} - ${text.substring(0, 200)}`);
          errors += records.length;
        }
      }
    } catch (e) {
      console.error(`Batch ${Math.floor(i/BATCH_SIZE)+1} error: ${e.message}`);
      errors += batch.length;
    }

    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= lines.length) {
      console.log(`  Progresso: ${Math.min(i + BATCH_SIZE, lines.length)}/${lines.length} (${imported} ok, ${errors} erros)`);
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`Importadas: ${imported}`);
  console.log(`Erros: ${errors}`);
  console.log(`Total: ${imported + errors}`);
}

main().catch(console.error);
