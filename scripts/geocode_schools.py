"""
Geocode schools in Supabase by matching city/state to Brazilian municipality coordinates.
Uses the municipios-brasileiros CSV from GitHub for coordinate data.
Updates schools table via Supabase REST API.
"""

import urllib.request
import urllib.parse
import json
import csv
import io
import unicodedata
import time
import sys

SUPABASE_URL = "https://frdpscbdtudaulscexyp.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkwODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s"

CSV_URL = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv"

# UF code to state abbreviation mapping
UF_MAP = {
    11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
    21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL",
    28: "SE", 29: "BA",
    31: "MG", 32: "ES", 33: "RJ", 35: "SP",
    41: "PR", 42: "SC", 43: "RS",
    50: "MS", 51: "MT", 52: "GO", 53: "DF",
}


def normalize(text):
    """Strip accents and uppercase for matching."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).upper().strip()


def fetch_municipalities_csv():
    """Download and parse the municipalities CSV."""
    print("Downloading municipalities CSV from GitHub...")
    req = urllib.request.Request(CSV_URL)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()

    # Try UTF-8 first, then latin-1
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    reader = csv.reader(io.StringIO(text))
    header = next(reader)
    print(f"  CSV header: {header}")

    # Find column indices
    # Expected: codigo_ibge, nome, latitude, longitude, capital, codigo_uf
    col_map = {h.strip().lower(): i for i, h in enumerate(header)}

    nome_idx = col_map.get("nome", col_map.get("nome_municipio"))
    lat_idx = col_map.get("latitude")
    lon_idx = col_map.get("longitude")
    uf_idx = col_map.get("codigo_uf")

    print(f"  Columns: nome={nome_idx}, lat={lat_idx}, lon={lon_idx}, uf={uf_idx}")

    municipalities = {}  # (normalized_name, state) -> (lat, lon)
    raw_names = {}  # (normalized_name, state) -> original_name
    count = 0

    for row in reader:
        if len(row) < max(nome_idx, lat_idx, lon_idx, uf_idx) + 1:
            continue

        nome = row[nome_idx].strip()
        lat = row[lat_idx].strip()
        lon = row[lon_idx].strip()
        uf_code = int(row[uf_idx].strip())

        state = UF_MAP.get(uf_code)
        if not state:
            continue

        key = (normalize(nome), state)
        municipalities[key] = (float(lat), float(lon))
        raw_names[key] = nome
        count += 1

    print(f"  Loaded {count} municipalities")
    return municipalities, raw_names


def supabase_request(method, path, body=None, params=None):
    """Make a request to Supabase REST API."""
    url = f"{SUPABASE_URL}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)

    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_data = resp.read()
            if resp_data:
                return json.loads(resp_data)
            return None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  HTTP {e.code}: {err_body[:200]}")
        raise


def fetch_distinct_cities():
    """Fetch all distinct (city, state) pairs from schools table."""
    print("\nFetching distinct cities from schools table...")

    # Use RPC or direct query - we'll paginate through select distinct
    # Supabase REST doesn't support SELECT DISTINCT directly well,
    # so we'll use a workaround with RPC or just fetch via PostgREST

    # Actually we can call the SQL endpoint via the management API,
    # but it's easier to just fetch all distinct combos by state

    all_cities = []
    states = [
        "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
        "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
        "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
    ]

    for state in states:
        # Fetch distinct cities for this state using select with distinct-ish approach
        # PostgREST doesn't have DISTINCT, so we fetch city,state and dedupe
        offset = 0
        state_cities = set()
        while True:
            url = f"{SUPABASE_URL}/rest/v1/schools"
            params_str = urllib.parse.urlencode({
                "select": "city",
                "state": f"eq.{state}",
                "latitude": "is.null",
                "limit": "1000",
                "offset": str(offset),
            }, quote_via=urllib.parse.quote)

            headers = {
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "Content-Type": "application/json",
            }

            req = urllib.request.Request(f"{url}?{params_str}", headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())

            if not data:
                break

            for row in data:
                if row.get("city"):
                    state_cities.add(row["city"])

            if len(data) < 1000:
                break
            offset += 1000

        for city in state_cities:
            all_cities.append((city, state))

        if state_cities:
            sys.stdout.write(f"  {state}: {len(state_cities)} cities  ")
            sys.stdout.flush()

    print(f"\n  Total distinct (city, state) pairs with NULL lat: {len(all_cities)}")
    return all_cities


def update_schools_for_city(city, state, lat, lon):
    """Update all schools in a city/state with coordinates."""
    url = f"{SUPABASE_URL}/rest/v1/schools"

    # Build query string manually to handle encoding properly
    params = {
        "state": f"eq.{state}",
        "city": f"eq.{city}",
        "latitude": "is.null",
    }
    params_str = "&".join(f"{k}={urllib.parse.quote(str(v), safe='.')}" for k, v in params.items())

    full_url = f"{url}?{params_str}"

    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=headers-only",
    }

    body = json.dumps({"latitude": lat, "longitude": lon}).encode()
    req = urllib.request.Request(full_url, data=body, headers=headers, method="PATCH")

    with urllib.request.urlopen(req, timeout=30) as resp:
        # Check content-range header for count
        content_range = resp.getheader("Content-Range")
        return content_range


def main():
    start = time.time()

    # Step 1: Load municipality coordinates
    municipalities, raw_names = fetch_municipalities_csv()

    # Step 2: Fetch distinct cities from schools
    cities = fetch_distinct_cities()

    # Step 3: Match and update
    print(f"\nMatching {len(cities)} city/state pairs to municipalities...")

    matched = 0
    unmatched = []
    updated_schools = 0
    errors = 0

    for i, (city, state) in enumerate(cities):
        key = (normalize(city), state)

        coords = municipalities.get(key)

        if not coords:
            unmatched.append((city, state))
            continue

        lat, lon = coords
        matched += 1

        try:
            update_schools_for_city(city, state, lat, lon)
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"\n  Error updating {city}/{state}: {e}")

        if (i + 1) % 100 == 0:
            sys.stdout.write(f"\r  Processed {i+1}/{len(cities)} cities ({matched} matched, {len(unmatched)} unmatched)")
            sys.stdout.flush()

    print(f"\r  Processed {len(cities)}/{len(cities)} cities ({matched} matched, {len(unmatched)} unmatched)    ")

    # Step 4: Try fuzzy matching for unmatched
    if unmatched:
        print(f"\nAttempting fuzzy matching for {len(unmatched)} unmatched cities...")

        # Build reverse lookup by state for fuzzy matching
        by_state = {}
        for (norm_name, st), coords in municipalities.items():
            if st not in by_state:
                by_state[st] = {}
            by_state[st][norm_name] = coords

        fuzzy_matched = 0
        still_unmatched = []

        for city, state in unmatched:
            norm_city = normalize(city)
            state_munis = by_state.get(state, {})

            # Try common substitutions
            found = False

            # Try removing "'" characters
            alt = norm_city.replace("'", "")
            if alt in state_munis:
                lat, lon = state_munis[alt]
                try:
                    update_schools_for_city(city, state, lat, lon)
                    fuzzy_matched += 1
                    found = True
                except Exception:
                    pass

            if not found:
                # Try substring matching (city name contained in municipality or vice versa)
                for muni_name, coords in state_munis.items():
                    # Check if one contains the other
                    if norm_city in muni_name or muni_name in norm_city:
                        lat, lon = coords
                        try:
                            update_schools_for_city(city, state, lat, lon)
                            fuzzy_matched += 1
                            found = True
                        except Exception:
                            pass
                        break

            if not found:
                still_unmatched.append((city, state))

        print(f"  Fuzzy matched: {fuzzy_matched}")
        matched += fuzzy_matched
        unmatched = still_unmatched

    # Step 5: Statistics
    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"GEOCODING RESULTS")
    print(f"{'='*60}")
    print(f"Total city/state pairs processed: {len(cities)}")
    print(f"Matched: {matched}")
    print(f"Unmatched: {len(unmatched)}")
    print(f"Errors: {errors}")
    print(f"Time: {elapsed:.1f}s")

    if unmatched:
        print(f"\nSample unmatched cities (up to 30):")
        for city, state in sorted(unmatched)[:30]:
            print(f"  {city} / {state}")

    # Step 6: Verify
    print(f"\nVerifying results...")
    url = f"{SUPABASE_URL}/rest/v1/schools"
    params_str = urllib.parse.urlencode({
        "select": "id",
        "latitude": "is.null",
        "limit": "1",
    })
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Prefer": "count=exact",
    }
    req = urllib.request.Request(f"{url}?{params_str}", headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        content_range = resp.getheader("Content-Range")
        print(f"  Schools still with NULL latitude: {content_range}")

    # Also count schools WITH coordinates
    params_str2 = urllib.parse.urlencode({
        "select": "id",
        "latitude": "not.is.null",
        "limit": "1",
    })
    req2 = urllib.request.Request(f"{url}?{params_str2}", headers=headers)
    with urllib.request.urlopen(req2, timeout=30) as resp2:
        content_range2 = resp2.getheader("Content-Range")
        print(f"  Schools WITH coordinates: {content_range2}")


if __name__ == "__main__":
    main()
