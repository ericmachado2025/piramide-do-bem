#!/usr/bin/env python3
"""
Enriquecer tabelas Supabase com dados de geolocalização do SQL Server local.
Fonte: OpenConnectionDb_dev (geography.Cities, geography.Districts, geography.States)
"""
import subprocess
import json
import urllib.request
import urllib.error
import sys
import csv
import io

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://frdpscbdtudaulscexyp.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkwODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s'
SQLCMD = 'sqlcmd'
SERVER = r'(localdb)\MSSQLLocalDB'
DB = 'OpenConnectionDb_dev'


def run_sql(query):
    """Run SQL query on local SQL Server and return output as string."""
    r = subprocess.run(
        [SQLCMD, '-S', SERVER, '-d', DB, '-Q', query, '-W', '-s', '|', '-h', '-1'],
        capture_output=True, timeout=60
    )
    return r.stdout.decode('utf-8', errors='replace').strip()


def supabase_patch(table, filters, data):
    """PATCH records in Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='PATCH')
    req.add_header('Content-Type', 'application/json')
    req.add_header('apikey', SERVICE_KEY)
    req.add_header('Authorization', f'Bearer {SERVICE_KEY}')
    req.add_header('Prefer', 'return=minimal')
    try:
        urllib.request.urlopen(req, timeout=30)
        return True
    except urllib.error.HTTPError as e:
        return False


def supabase_get(table, params=''):
    """GET records from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    req = urllib.request.Request(url)
    req.add_header('apikey', SERVICE_KEY)
    req.add_header('Authorization', f'Bearer {SERVICE_KEY}')
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode('utf-8'))


def enrich_states():
    """Update state lat/long from SQL Server."""
    print("=== Enriquecendo estados ===")
    output = run_sql(
        "SELECT IbgeUFSigla, AVG(Latitude) as lat, AVG(Longitude) as lng "
        "FROM geography.Cities WHERE CountryISO2 = 'BR' AND IsMunicipality = 1 "
        "GROUP BY IbgeUFSigla ORDER BY IbgeUFSigla"
    )
    updated = 0
    for line in output.split('\n'):
        parts = line.strip().split('|')
        if len(parts) < 3 or not parts[0].strip():
            continue
        uf = parts[0].strip()
        lat = float(parts[1].strip())
        lng = float(parts[2].strip())
        if supabase_patch('states', f'abbreviation=eq.{uf}', {'latitude': lat, 'longitude': lng}):
            updated += 1
    print(f"  {updated} estados atualizados com coordenadas")


def enrich_cities():
    """Update city lat/long from SQL Server (precise IBGE coordinates)."""
    print("\n=== Enriquecendo cidades ===")
    output = run_sql(
        "SELECT IbgeMunCode, Name, Latitude, Longitude "
        "FROM geography.Cities WHERE CountryISO2 = 'BR' AND IsMunicipality = 1 "
        "AND Latitude IS NOT NULL AND Longitude IS NOT NULL"
    )

    # Build mapping ibge_code -> (lat, lng)
    coords = {}
    for line in output.split('\n'):
        parts = line.strip().split('|')
        if len(parts) < 4 or not parts[0].strip():
            continue
        ibge = parts[0].strip()
        try:
            lat = float(parts[2].strip())
            lng = float(parts[3].strip())
            coords[ibge] = (lat, lng)
        except (ValueError, IndexError):
            continue

    print(f"  {len(coords)} cidades com coordenadas do SQL Server")

    # Get Supabase cities that need coordinates
    cities = supabase_get('cities', 'select=id,public_id,latitude,longitude&latitude=is.null&limit=10000')
    print(f"  {len(cities)} cidades sem coordenadas no Supabase")

    updated = 0
    for c in cities:
        ibge = c['public_id']
        if ibge in coords:
            lat, lng = coords[ibge]
            if supabase_patch('cities', f'id=eq.{c["id"]}', {'latitude': lat, 'longitude': lng}):
                updated += 1

    # Also update cities that already have coords but might be less precise
    already = supabase_get('cities', 'select=id,public_id&latitude=not.is.null&limit=10000')
    enriched = 0
    for c in already:
        ibge = c['public_id']
        if ibge in coords:
            lat, lng = coords[ibge]
            if supabase_patch('cities', f'id=eq.{c["id"]}', {'latitude': lat, 'longitude': lng}):
                enriched += 1

    print(f"  {updated} novas + {enriched} atualizadas com coordenadas precisas")


if __name__ == '__main__':
    enrich_states()
    enrich_cities()
    print("\n=== Concluido ===")
