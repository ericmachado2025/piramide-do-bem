#!/usr/bin/env python3
"""
Carrega bairros na tabela _tmp_bairros via PostgREST (Supabase REST API).
"""
import json
import urllib.request
import urllib.error
import sys

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://frdpscbdtudaulscexyp.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkwODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s'
BATCH_SIZE = 1000

with open('scripts/bairros_inep.json', 'r', encoding='utf-8') as f:
    bairros = json.load(f)

items = list(bairros.items())
print(f"Total: {len(items)} registros para inserir em _tmp_bairros")

success = 0
errors = 0

for i in range(0, len(items), BATCH_SIZE):
    batch = items[i:i+BATCH_SIZE]
    records = [{"inep_code": k, "neighborhood": v} for k, v in batch]

    data = json.dumps(records).encode('utf-8')
    url = f"{SUPABASE_URL}/rest/v1/_tmp_bairros"

    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('apikey', SERVICE_KEY)
    req.add_header('Authorization', f'Bearer {SERVICE_KEY}')
    req.add_header('Prefer', 'return=minimal,resolution=ignore-duplicates')

    try:
        resp = urllib.request.urlopen(req, timeout=60)
        success += len(batch)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')[:300]
        errors += len(batch)
        print(f"  Batch {i//BATCH_SIZE + 1} ERRO {e.code}: {err_body}")
        if "permission denied" in err_body.lower() or "does not exist" in err_body.lower():
            print("Erro fatal, abortando.")
            break
    except Exception as e:
        errors += len(batch)
        print(f"  Batch {i//BATCH_SIZE + 1} ERRO: {e}")

    done = min(i + BATCH_SIZE, len(items))
    if done % 10000 < BATCH_SIZE or done >= len(items):
        print(f"  Progresso: {done}/{len(items)} ({success} ok, {errors} erros)")

print(f"\n=== RESULTADO ===")
print(f"Inseridos: {success}")
print(f"Erros: {errors}")
