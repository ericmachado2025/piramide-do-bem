#!/usr/bin/env python3
"""
Extrai CO_ENTIDADE + NO_BAIRRO do microdados INEP 2023 (escolas ativas).
Salva em JSON para uso posterior.
"""
import zipfile
import csv
import io
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

z = zipfile.ZipFile('scripts/inep_2023.zip')
csv_path = 'microdados_censo_escolar_2023/dados/microdados_ed_basica_2023.csv'

bairros = {}
with z.open(csv_path) as f:
    text = io.TextIOWrapper(f, encoding='latin-1')
    reader = csv.reader(text, delimiter=';')
    header = next(reader)

    co_idx = header.index('CO_ENTIDADE')
    bairro_idx = header.index('NO_BAIRRO')
    sit_idx = header.index('TP_SITUACAO_FUNCIONAMENTO')

    total = 0
    for row in reader:
        total += 1
        if len(row) <= max(co_idx, bairro_idx, sit_idx):
            continue
        if row[sit_idx].strip() != '1':
            continue
        inep = row[co_idx].strip()
        bairro = row[bairro_idx].strip()
        if inep and bairro:
            bairros[inep] = bairro

print(f"Total linhas: {total}")
print(f"Escolas ativas com bairro: {len(bairros)}")

with open('scripts/bairros_inep.json', 'w', encoding='utf-8') as f:
    json.dump(bairros, f, ensure_ascii=False)

print("Salvo em scripts/bairros_inep.json")
