#!/usr/bin/env python3
"""
Extrai NO_BAIRRO do microdados INEP 2023 e atualiza a tabela schools no Supabase.
Usa inep_code (CO_ENTIDADE) como chave de match.
Processa em lotes de 500 via PATCH.
"""
import zipfile
import csv
import io
import json
import urllib.request
import sys
import time

SUPABASE_URL = 'https://frdpscbdtudaulscexyp.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkwODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s'
BATCH_SIZE = 500

def extract_bairros():
    """Extract inep_code -> bairro mapping from INEP zip."""
    print("Extraindo bairros do zip INEP 2023...")
    z = zipfile.ZipFile('scripts/inep_2023.zip')
    csv_path = 'microdados_censo_escolar_2023/dados/microdados_ed_basica_2023.csv'

    bairros = {}
    with z.open(csv_path) as f:
        # Read as latin-1
        text = io.TextIOWrapper(f, encoding='latin-1')
        reader = csv.reader(text, delimiter=';')
        header = next(reader)

        # Find column indices
        co_entidade_idx = header.index('CO_ENTIDADE')
        no_bairro_idx = header.index('NO_BAIRRO')
        situacao_idx = header.index('TP_SITUACAO_FUNCIONAMENTO')

        for row in reader:
            if len(row) <= max(co_entidade_idx, no_bairro_idx, situacao_idx):
                continue

            # Only active schools (1 = em atividade)
            situacao = row[situacao_idx].strip()
            if situacao != '1':
                continue

            inep_code = row[co_entidade_idx].strip()
            bairro = row[no_bairro_idx].strip()

            if inep_code and bairro:
                bairros[inep_code] = bairro

    print(f"  {len(bairros)} escolas ativas com bairro encontradas")
    return bairros


def update_supabase(bairros):
    """Update schools table in batches using individual PATCH calls per inep_code."""
    print(f"\nAtualizando Supabase em lotes...")

    items = list(bairros.items())
    updated = 0
    errors = 0
    skipped = 0

    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i:i+BATCH_SIZE]

        for inep_code, bairro in batch:
            url = f"{SUPABASE_URL}/rest/v1/schools?inep_code=eq.{inep_code}"
            data = json.dumps({"neighborhood": bairro}).encode('utf-8')

            req = urllib.request.Request(url, data=data, method='PATCH')
            req.add_header('Content-Type', 'application/json')
            req.add_header('apikey', SERVICE_KEY)
            req.add_header('Authorization', f'Bearer {SERVICE_KEY}')
            req.add_header('Prefer', 'return=minimal')

            try:
                resp = urllib.request.urlopen(req)
                updated += 1
            except urllib.error.HTTPError as e:
                errors += 1
                if errors <= 5:
                    print(f"  ERRO {inep_code}: {e.code} {e.read().decode()[:100]}")
            except Exception as e:
                errors += 1
                if errors <= 5:
                    print(f"  ERRO {inep_code}: {e}")

        done = min(i + BATCH_SIZE, len(items))
        if done % 5000 < BATCH_SIZE or done >= len(items):
            print(f"  Progresso: {done}/{len(items)} ({updated} ok, {errors} erros)")

    print(f"\n=== RESULTADO ===")
    print(f"Atualizados: {updated}")
    print(f"Erros: {errors}")
    print(f"Total processado: {updated + errors}")


if __name__ == '__main__':
    bairros = extract_bairros()
    update_supabase(bairros)
