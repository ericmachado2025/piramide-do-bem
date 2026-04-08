"""Import IES (higher education institutions) from e-MEC public CSV."""
import csv
import io
import json
import sys
import unicodedata
import urllib.request

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://frdpscbdtudaulscexyp.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkwODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s"
CSV_URL = "https://raw.githubusercontent.com/nazareno/enade-vis/master/data/ies_Brasil.csv"

def normalize_name(name):
    s = name.strip()
    if s == s.upper() and len(s) > 5:
        s = s.title()
    return s

print("Downloading IES CSV...")
req = urllib.request.Request(CSV_URL)
with urllib.request.urlopen(req, timeout=30) as resp:
    raw = resp.read().decode("utf-8-sig")

reader = csv.DictReader(io.StringIO(raw), delimiter=";")
rows = list(reader)
print(f"Total rows in CSV: {len(rows)}")

# Filter active and deduplicate
seen = set()
ies_list = []
for row in rows:
    situacao = row.get("Situação", row.get("Situa\xe7\xe3o", "")).strip()
    if situacao != "Ativa":
        continue

    name_key = row.get("Instituição(IES)", row.get("Institui\xe7\xe3o(IES)", "")).strip()
    city = row.get("Município", row.get("Munic\xedpio", "")).strip()
    state = row.get("UF", "").strip()

    if not name_key or not city or not state:
        continue

    # Normalize for dedup
    dedup_key = (unicodedata.normalize("NFKD", name_key).upper(), city.upper(), state.upper())
    if dedup_key in seen:
        continue
    seen.add(dedup_key)

    ies_list.append({
        "name": normalize_name(name_key),
        "city": city.title() if city == city.upper() else city,
        "state": state.upper(),
        "school_type": "superior",
        "active": True,
    })

print(f"Active unique IES: {len(ies_list)}")

# Insert in batches via REST API
batch_size = 100
inserted = 0
ignored = 0

for i in range(0, len(ies_list), batch_size):
    batch = ies_list[i:i+batch_size]
    body = json.dumps(batch).encode("utf-8")

    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/schools",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SERVICE_KEY}",
            "apikey": SERVICE_KEY,
            "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            if status in (200, 201):
                inserted += len(batch)
            else:
                ignored += len(batch)
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="replace")[:300]
        print(f"  Batch {i//batch_size+1} error {e.code}: {body_err}")
        ignored += len(batch)

    done = min(i + batch_size, len(ies_list))
    if done % 500 == 0 or done == len(ies_list):
        print(f"  Progress: {done}/{len(ies_list)}")

print(f"\nResult: {inserted} inserted, {ignored} ignored/errors")
