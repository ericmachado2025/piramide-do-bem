"""Fix corrupted city names using IBGE API - file-based approach."""
import json
import subprocess
import sys
import io
import unicodedata
import urllib.request
import gzip
from collections import defaultdict

REPLACEMENT_CHAR = "\ufffd"

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

def strip_accents(s):
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def escape_sql(s):
    return s.replace("'", "''")

def build_fffd_sql(s):
    parts = s.split(REPLACEMENT_CHAR)
    if len(parts) == 1:
        return f"'{escape_sql(s)}'"
    sql_parts = []
    for i, part in enumerate(parts):
        if i > 0:
            sql_parts.append("chr(65533)")
        if part:
            sql_parts.append(f"'{escape_sql(part)}'")
    return " || ".join(sql_parts)

def run_sql_file(filepath):
    result = subprocess.run(
        ["npx", "supabase", "db", "query", "--linked", "-f", filepath],
        capture_output=True, timeout=120,
        cwd=r"C:\Users\robso\Projetos\piramide-do-bem",
        shell=True
    )
    if result.returncode != 0:
        err = result.stderr.decode("utf-8", errors="replace")[:300]
        return False, err
    return True, ""

def run_sql(sql):
    result = subprocess.run(
        ["npx", "supabase", "db", "query", "--linked", sql],
        capture_output=True, timeout=120,
        cwd=r"C:\Users\robso\Projetos\piramide-do-bem",
        shell=True
    )
    if result.returncode != 0:
        return None
    try:
        return json.loads(result.stdout.decode("utf-8", errors="replace")).get("rows", [])
    except:
        return None

# Fetch IBGE
print("Fetching IBGE municipalities...")
url = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
req = urllib.request.Request(url, headers={"Accept-Encoding": "gzip"})
with urllib.request.urlopen(req, timeout=60) as resp:
    raw = resp.read()
    if resp.headers.get("Content-Encoding") == "gzip":
        raw = gzip.decompress(raw)
    municipios = json.loads(raw.decode("utf-8"))
print(f"Got {len(municipios)} municipalities")

# Build lookup
lookup = {}
by_state = defaultdict(list)
for m in municipios:
    name = m["nome"]
    try:
        uf = m["microrregiao"]["mesorregiao"]["UF"]["sigla"]
    except:
        continue
    stripped = strip_accents(name).upper()
    lookup[(uf, stripped)] = name
    by_state[uf].append((stripped, name))

# Get corrupted cities
raw = subprocess.run(
    ["npx", "supabase", "db", "query", "--linked",
     "SELECT DISTINCT city, state FROM schools WHERE city LIKE '%' || chr(65533) || '%' ORDER BY state, city"],
    capture_output=True, timeout=120,
    cwd=r"C:\Users\robso\Projetos\piramide-do-bem", shell=True
)
corrupted_rows = json.loads(raw.stdout.decode("utf-8"))["rows"]
print(f"Found {len(corrupted_rows)} corrupted cities")

# Match
matched = []
for row in corrupted_rows:
    city = row["city"]
    state = row["state"].strip()
    stripped = city.replace(REPLACEMENT_CHAR, "").upper()

    # Direct match
    if (state, stripped) in lookup:
        matched.append((city, state, lookup[(state, stripped)]))
        continue

    # Fuzzy char-by-char
    found = False
    for ibge_stripped, ibge_name in by_state.get(state, []):
        if len(city) != len(ibge_stripped):
            continue
        ok = True
        for a, b in zip(city.upper(), ibge_stripped):
            if a == REPLACEMENT_CHAR:
                continue
            if strip_accents(a).upper() != b:
                ok = False
                break
        if ok:
            matched.append((city, state, ibge_name))
            found = True
            break
    if not found:
        print(f"  Unmatched: [{state}] {city}")

print(f"Matched: {len(matched)}")

# Execute in batches via file
batch_size = 10
total_ok = 0
total_fail = 0
for i in range(0, len(matched), batch_size):
    batch = matched[i:i+batch_size]
    lines = ["BEGIN;"]
    for old_city, state, new_city in batch:
        old_expr = build_fffd_sql(old_city)
        lines.append(f"UPDATE schools SET city = '{escape_sql(new_city)}' WHERE city = {old_expr} AND state = '{escape_sql(state)}';")
    lines.append("COMMIT;")

    sql_path = r"C:\Users\robso\Projetos\piramide-do-bem\scripts\_batch.sql"
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    ok, err = run_sql_file(sql_path)
    if ok:
        total_ok += len(batch)
    else:
        total_fail += len(batch)
        if total_fail <= 30:
            print(f"  Batch error: {err[:200]}")

    done = i + len(batch)
    if done % 200 == 0 or done == len(matched):
        print(f"  Progress: {done}/{len(matched)} ({total_ok} ok, {total_fail} failed)")

# Verify
remaining = run_sql("SELECT COUNT(DISTINCT city) as cnt FROM schools WHERE city LIKE '%' || chr(65533) || '%'")
if remaining:
    print(f"\nRemaining corrupted cities: {remaining[0]['cnt']}")

# Fix remaining 5 unmatched manually
manual_fixes = [
    ("Barão de Monte Alto", "MG", "Bar" + REPLACEMENT_CHAR + "o de Monte Alto"),
    ("Santo Antônio do Leverger", "MT", "Santo Ant" + REPLACEMENT_CHAR + "nio do Leverger"),
    ("Arês", "RN", "Ar" + REPLACEMENT_CHAR + "s"),
    ("Açu", "RN", "A" + REPLACEMENT_CHAR + "u"),
    ("São Luiz", "RR", "S" + REPLACEMENT_CHAR + "o Luiz"),
]
for correct, state, corrupted in manual_fixes:
    old_expr = build_fffd_sql(corrupted)
    lines = [f"UPDATE schools SET city = '{escape_sql(correct)}' WHERE city = {old_expr} AND state = '{escape_sql(state)}';"]
    with open(r"C:\Users\robso\Projetos\piramide-do-bem\scripts\_batch.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    ok, err = run_sql_file(r"C:\Users\robso\Projetos\piramide-do-bem\scripts\_batch.sql")
    if not ok:
        print(f"  Manual fix failed for {correct}: {err[:100]}")

print("Done!")
