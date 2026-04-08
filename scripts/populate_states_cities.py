"""
Populate states, cities, neighborhoods tables from IBGE data + link schools.

Downloads CSV data from kelvins/municipios-brasileiros GitHub repo,
inserts into Supabase tables, then links schools via PostgREST PATCH.

For neighborhoods and school linking (steps 4-7), use SQL directly:

  -- Link schools to states
  UPDATE schools s SET state_id = st.id
  FROM states st WHERE s.state = st.abbreviation AND s.state_id IS NULL;

  -- Link schools to cities
  UPDATE schools s SET city_id = c.id
  FROM cities c JOIN states st ON c.state_id = st.id
  WHERE s.city = c.name AND s.state = st.abbreviation AND s.city_id IS NULL;

  -- Insert neighborhoods from schools
  INSERT INTO neighborhoods (public_id, city_id, name)
  SELECT DISTINCT ON (city_id, neighborhood)
    left(encode(sha256((city_id::text || '_' || neighborhood)::bytea), 'hex'), 16),
    city_id, neighborhood
  FROM schools
  WHERE city_id IS NOT NULL AND neighborhood IS NOT NULL
  ON CONFLICT (public_id) DO NOTHING;

  -- Link schools to neighborhoods
  UPDATE schools s SET neighborhood_id = n.id
  FROM neighborhoods n
  WHERE s.city_id = n.city_id AND s.neighborhood = n.name
  AND s.neighborhood_id IS NULL;
"""
import csv
import io
import json
import ssl
import sys
import urllib.request
import urllib.parse


def log(msg):
    print(msg, flush=True)


# --------------- Config ---------------
SUPABASE_URL = "https://frdpscbdtudaulscexyp.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwi"
    "cm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkw"
    "ODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s"
)

STATES_CSV_URL = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/estados.csv"
CITIES_CSV_URL = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def api_request(method, path, body=None, headers_extra=None, expect_json=True):
    """Make a request to Supabase REST API."""
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if headers_extra:
        headers.update(headers_extra)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        raw = resp.read().decode("utf-8")
        if expect_json and raw.strip():
            return json.loads(raw)
        return raw
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        log(f"  HTTP {e.code} on {method} {path[:80]}: {err_body[:300]}")
        raise


def download_csv(url):
    """Download a CSV and return list of dicts."""
    req = urllib.request.Request(url)
    resp = urllib.request.urlopen(req, context=ctx)
    raw = resp.read()
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def batch_upsert(table, rows, on_conflict="public_id", batch_size=500):
    """Upsert rows in batches."""
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        api_request(
            "POST",
            f"/rest/v1/{table}?on_conflict={on_conflict}",
            body=batch,
            headers_extra={
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            expect_json=False,
        )
        total += len(batch)
        log(f"  {table}: upserted batch {i // batch_size + 1} ({total}/{len(rows)})")
    return total


def fetch_all_paged(path, page_size=1000):
    """Fetch all rows using offset/limit pagination."""
    all_rows = []
    offset = 0
    while True:
        sep = "&" if "?" in path else "?"
        page = api_request("GET", f"{path}{sep}order=id&offset={offset}&limit={page_size}")
        if not page:
            break
        all_rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return all_rows


# ===================== STEP 1: Download CSVs =====================
log("=== Step 1: Downloading CSVs ===")
states_csv = download_csv(STATES_CSV_URL)
cities_csv = download_csv(CITIES_CSV_URL)
log(f"  Downloaded {len(states_csv)} states, {len(cities_csv)} cities")

# ===================== STEP 2: Insert States =====================
log("\n=== Step 2: Upserting states ===")
states_rows = []
for row in states_csv:
    states_rows.append({
        "public_id": row["uf"].strip(),
        "name": row["nome"].strip(),
        "abbreviation": row["uf"].strip(),
        "region": row.get("regiao", "").strip() or None,
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
    })

batch_upsert("states", states_rows, batch_size=50)
log(f"  States done: {len(states_rows)} rows")

# ===================== STEP 3: Insert Cities =====================
log("\n=== Step 3: Upserting cities ===")

db_states = fetch_all_paged("/rest/v1/states?select=id,abbreviation")
abbr_to_id = {}
for s in db_states:
    abbr = s["abbreviation"].strip()
    abbr_to_id[abbr] = s["id"]
log(f"  Fetched {len(db_states)} states from DB")

uf_code_to_abbr = {}
for row in states_csv:
    uf_code_to_abbr[row["codigo_uf"].strip()] = row["uf"].strip()

cities_rows = []
skipped = 0
for row in cities_csv:
    uf_code = row["codigo_uf"].strip()
    abbr = uf_code_to_abbr.get(uf_code)
    if not abbr or abbr not in abbr_to_id:
        skipped += 1
        continue
    cities_rows.append({
        "public_id": row["codigo_ibge"].strip(),
        "state_id": abbr_to_id[abbr],
        "name": row["nome"].strip(),
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
    })

batch_upsert("cities", cities_rows, batch_size=500)
log(f"  Cities done: {len(cities_rows)} rows, {skipped} skipped")

# ===================== STEP 4: Link schools (via PostgREST) =====================
log("\n=== Step 4: Linking schools -> states (via PATCH) ===")
for abbr, state_id in abbr_to_id.items():
    encoded_abbr = urllib.parse.quote(abbr, safe="")
    path = f"/rest/v1/schools?state=eq.{encoded_abbr}&state_id=is.null"
    try:
        api_request(
            "PATCH", path,
            body={"state_id": state_id},
            headers_extra={"Prefer": "return=minimal"},
            expect_json=False,
        )
    except urllib.error.HTTPError:
        log(f"  Warning: failed to patch schools for state {abbr}")
log(f"  Patched schools.state_id for {len(abbr_to_id)} states")

log("\n=== Step 5: Linking schools -> cities (via PATCH) ===")
db_cities = fetch_all_paged("/rest/v1/cities?select=id,name,state_id")
log(f"  Fetched {len(db_cities)} cities from DB")

patched = 0
errors = 0
for city in db_cities:
    encoded_name = urllib.parse.quote(city["name"], safe="")
    path = (
        f"/rest/v1/schools?city=eq.{encoded_name}"
        f"&state_id=eq.{city['state_id']}"
        f"&city_id=is.null"
    )
    try:
        api_request(
            "PATCH", path,
            body={"city_id": city["id"]},
            headers_extra={"Prefer": "return=minimal"},
            expect_json=False,
        )
        patched += 1
    except urllib.error.HTTPError:
        errors += 1
    if patched % 500 == 0 and patched > 0:
        log(f"  Progress: {patched}/{len(db_cities)} cities processed")

log(f"  Patched schools.city_id: {patched} OK, {errors} errors")

# ===================== Steps 6-7: Neighborhoods =====================
log("\n=== Step 6-7: Neighborhoods ===")
log("  NOTE: For neighborhoods, run the following SQL directly:")
log("  -- Insert neighborhoods from schools")
log("  INSERT INTO neighborhoods (public_id, city_id, name)")
log("  SELECT DISTINCT ON (city_id, neighborhood)")
log("    left(encode(sha256((city_id || '_' || neighborhood)::bytea), 'hex'), 16),")
log("    city_id, neighborhood")
log("  FROM schools WHERE city_id IS NOT NULL AND neighborhood IS NOT NULL")
log("  ON CONFLICT (public_id) DO NOTHING;")
log("")
log("  -- Link schools to neighborhoods")
log("  UPDATE schools s SET neighborhood_id = n.id")
log("  FROM neighborhoods n")
log("  WHERE s.city_id = n.city_id AND s.neighborhood = n.name")
log("  AND s.neighborhood_id IS NULL;")

log("\n=== DONE ===")
log(f"  States:  {len(states_rows)} upserted")
log(f"  Cities:  {len(cities_rows)} upserted")
