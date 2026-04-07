"""
Fix corrupted encoding in Supabase schools table.
- Cities: fuzzy match against IBGE municipality API
- School names: pattern-based replacement (PROFª, DRª, ENGº, 1º, etc.)
"""

import gzip
import io
import json
import os
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
from collections import defaultdict

REPLACEMENT_CHAR = "\ufffd"
FFFD_3BYTES = "ï¿½"  # U+FFFD as UTF-8 bytes decoded as Latin-1/cp1252

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


# ── Step 1: Fetch IBGE municipalities ──────────────────────────────────

def fetch_ibge_municipalities():
    """Fetch all Brazilian municipalities from IBGE API."""
    url = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
    print("Fetching municipalities from IBGE API...")
    req = urllib.request.Request(url, headers={"Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
        data = json.loads(raw.decode("utf-8"))
    print(f"  Got {len(data)} municipalities")
    return data


def build_ibge_lookup(municipalities):
    """Build lookup: (state_abbrev, stripped_name) -> correct_name"""
    lookup = {}  # (state, stripped_name_upper) -> full_name
    by_state = defaultdict(list)  # state -> [(stripped_upper, full_name)]

    for m in municipalities:
        name = m["nome"]
        micro = m.get("microrregiao")
        if micro and micro.get("mesorregiao"):
            uf = micro["mesorregiao"]["UF"]
        elif m.get("regiao-imediata") and m["regiao-imediata"].get("regiao-intermediaria"):
            uf = m["regiao-imediata"]["regiao-intermediaria"]["UF"]
        else:
            continue
        state = uf["sigla"]
        stripped = strip_accents(name)
        lookup[(state, stripped.upper())] = name
        by_state[state].append((stripped.upper(), name))

    return lookup, by_state


def strip_accents(s):
    """Remove accents from string, keeping base characters."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


# ── Step 2: Run SQL queries ───────────────────────────────────────────

def run_query(sql):
    """Run SQL via npx supabase db query --linked."""
    result = subprocess.run(
        ["npx", "supabase", "db", "query", "--linked", sql],
        capture_output=True, timeout=120,
        cwd=r"C:\Users\robso\Projetos\piramide-do-bem",
        shell=True
    )
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")[:500]
        print(f"  SQL ERROR: {stderr}")
        return None
    try:
        stdout_text = result.stdout.decode("utf-8", errors="replace")
        data = json.loads(stdout_text)
        return data.get("rows", [])
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        print(f"  Parse error: {e}")
        return None


def run_query_raw(sql):
    """Run SQL and return raw stdout bytes decoded as UTF-8."""
    result = subprocess.run(
        ["npx", "supabase", "db", "query", "--linked", sql],
        capture_output=True, timeout=120,
        cwd=r"C:\Users\robso\Projetos\piramide-do-bem",
        shell=True
    )
    if result.returncode != 0:
        return None
    return result.stdout


def run_query_file(sql):
    """Write SQL to a temp file and execute via --file flag."""
    tmp = os.path.join(r"C:\Users\robso\Projetos\piramide-do-bem\scripts", "_tmp_fix.sql")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(sql)
    try:
        result = subprocess.run(
            ["npx", "supabase", "db", "query", "--linked", "-f", tmp],
            capture_output=True, timeout=300,
            cwd=r"C:\Users\robso\Projetos\piramide-do-bem",
            shell=True
        )
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")[:500]
            print(f"  SQL FILE ERROR: {stderr}")
            return None
        try:
            stdout_text = result.stdout.decode("utf-8", errors="replace")
            data = json.loads(stdout_text)
            return data.get("rows", [])
        except (json.JSONDecodeError, UnicodeDecodeError):
            return []
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


# ── Step 3: Fuzzy match corrupted cities ───────────────────────────────

def normalize_corrupted(name):
    """Normalize a corrupted city name by removing FFFD (in both forms)
    and stripping accents, for comparison with IBGE names."""
    # Handle both real U+FFFD and the 3-byte mojibake form
    cleaned = name.replace(REPLACEMENT_CHAR, "").replace(FFFD_3BYTES, "")
    return strip_accents(cleaned).upper()


def match_city(corrupted_name, state, lookup, by_state):
    """Match a corrupted city name to the correct IBGE name."""
    stripped_corrupted = normalize_corrupted(corrupted_name)

    # Direct lookup
    if (state, stripped_corrupted) in lookup:
        return lookup[(state, stripped_corrupted)]

    # Fuzzy: compare char-by-char, FFFD matches any single char
    state_cities = by_state.get(state, [])

    # Normalize the corrupted name, replacing FFFD sequences with single placeholder
    c_normalized = corrupted_name.replace(FFFD_3BYTES, REPLACEMENT_CHAR)

    for ibge_stripped, ibge_name in state_cities:
        if fuzzy_match(c_normalized, ibge_stripped):
            return ibge_name

    return None


def fuzzy_match(corrupted, ibge_stripped):
    """Check if corrupted name (with FFFD) matches IBGE stripped name."""
    c_upper = corrupted.upper()
    ibge_upper = ibge_stripped.upper()

    if len(c_upper) != len(ibge_upper):
        return False

    for c_char, i_char in zip(c_upper, ibge_upper):
        if c_char == REPLACEMENT_CHAR:
            continue
        c_stripped = strip_accents(c_char).upper()
        if c_stripped != i_char:
            return False
    return True


# ── Step 4: Execute fixes ─────────────────────────────────────────────

def escape_sql(s):
    """Escape single quotes for SQL."""
    return s.replace("'", "''")


def main():
    # ── Fix school names FIRST (simpler, uses chr(65533) in SQL) ──
    print("\n=== FIXING CORRUPTED SCHOOL NAMES ===\n")

    # Use SQL-level chr(65533) for matching and replacing
    # This avoids encoding issues in subprocess
    school_fixes = [
        # PROFª
        ("'PROF' || chr(65533) || ' '", "'PROFª '"),
        ("'PROF' || chr(65533)", "'PROFª'"),
        # DRª
        ("'DR' || chr(65533) || ' '", "'DRª '"),
        ("'DR' || chr(65533)", "'DRª'"),
        # ENGº
        ("'ENG' || chr(65533) || ' '", "'ENGº '"),
        ("'ENG' || chr(65533)", "'ENGº'"),
        # Nª Sª
        ("'N' || chr(65533) || ' '", "'Nª '"),
        ("'N' || chr(65533)", "'Nª'"),
        ("'S' || chr(65533) || ' '", "'Sª '"),
        ("'S' || chr(65533)", "'Sª'"),
        # Mª
        ("'M' || chr(65533) || ' '", "'Mª '"),
        ("'M' || chr(65533)", "'Mª'"),
    ]

    # Add ordinal numbers 1-9
    for d in range(1, 10):
        school_fixes.insert(len(school_fixes) - 4, (f"'{d}' || chr(65533) || ' '", f"'{d}º '"))
        school_fixes.insert(len(school_fixes) - 4, (f"'{d}' || chr(65533)", f"'{d}º'"))

    # Final catch-all: remove any remaining FFFD
    school_fixes.append(("chr(65533)", "''"))

    print("  Applying pattern-based fixes to school names...")
    for old_expr, new_expr in school_fixes:
        sql = (
            f"UPDATE schools SET name = REPLACE(name, {old_expr}, {new_expr}) "
            f"WHERE name LIKE '%' || chr(65533) || '%'"
        )
        run_query(sql)

    remaining = run_query("SELECT COUNT(*) as cnt FROM schools WHERE name LIKE '%' || chr(65533) || '%'")
    if remaining:
        cnt = remaining[0]["cnt"]
        print(f"  Remaining corrupted school names: {cnt}")

    # ── Fix cities ──
    print("\n=== FIXING CORRUPTED CITY NAMES ===\n")

    municipalities = fetch_ibge_municipalities()
    lookup, by_state = build_ibge_lookup(municipalities)

    # Get corrupted cities - use raw bytes to properly decode UTF-8
    raw = run_query_raw(
        "SELECT DISTINCT city, state FROM schools WHERE city LIKE '%' || chr(65533) || '%' ORDER BY state, city"
    )
    if raw is None:
        sys.exit("Failed to fetch corrupted cities")

    corrupted_rows = json.loads(raw.decode("utf-8"))["rows"]
    print(f"  Found {len(corrupted_rows)} corrupted city names")

    # Manual fixes for cities that don't match IBGE exactly
    # (different prepositions or spellings between DB and IBGE)
    manual_fixes = {
        ("MG", "BARO DE MONTE ALTO"): "Barão de Monte Alto",  # IBGE has "do" but DB has "de"
        ("MT", "SANTO ANTONIO DO LEVERGER"): "Santo Antônio do Leverger",  # IBGE has "de" but DB has "do"
        ("RN", "ARES"): "Arês",  # IBGE: Arez
        ("RN", "ACU"): "Açu",  # IBGE: Assú
        ("RR", "SAO LUIZ"): "São Luiz",  # IBGE: São Luiz do Anauá
    }

    matched = []
    unmatched = []

    for row in corrupted_rows:
        city = row["city"]
        state = row["state"].strip()
        correct = match_city(city, state, lookup, by_state)
        if not correct:
            # Try manual fixes
            key = (state, normalize_corrupted(city))
            correct = manual_fixes.get(key)
        if correct:
            matched.append((city, state, correct))
        else:
            unmatched.append((city, state))

    print(f"  Matched: {len(matched)}")
    print(f"  Unmatched: {len(unmatched)}")

    if unmatched:
        print("\n  Unmatched cities (first 20):")
        for city, state in unmatched[:20]:
            print(f"    [{state}] {city}")
        if len(unmatched) > 20:
            print(f"    ... and {len(unmatched) - 20} more")

    # Execute city updates
    # Since we can't reliably pass U+FFFD through subprocess args,
    # we'll use SQL expressions with chr(65533) to build the old value.
    # Strategy: For each corrupted city, build a SQL condition that reconstructs
    # the corrupted string using chr(65533).
    if matched:
        print(f"\n  Executing {len(matched)} city UPDATE statements via SQL file...")
        total_updated = 0
        failed = 0

        # Build all SQL statements
        all_stmts = []
        for old_city, state, new_city in matched:
            old_city_sql = build_fffd_sql_literal(old_city)
            stmt = (
                f"UPDATE schools SET city = '{escape_sql(new_city)}' "
                f"WHERE city = {old_city_sql} "
                f"AND state = '{escape_sql(state)}'"
            )
            all_stmts.append(stmt)

        # Execute in large batches via file (no command line length limit)
        batch_size = 200
        for i in range(0, len(all_stmts), batch_size):
            batch = all_stmts[i:i + batch_size]
            sql = ";\n".join(batch) + ";"
            result = run_query_file(sql)
            if result is not None:
                total_updated += len(batch)
            else:
                failed += len(batch)

            done = i + len(batch)
            if done % 400 == 0 or done == len(all_stmts):
                print(f"    Progress: {done}/{len(all_stmts)} ({total_updated} ok, {failed} failed)")

        print(f"\n  City fixes complete. {total_updated} mappings applied, {failed} failed.")

    # ── Final verification ──
    print("\n=== FINAL VERIFICATION ===\n")
    city_remaining = run_query("SELECT COUNT(*) as cnt FROM schools WHERE city LIKE '%' || chr(65533) || '%'")
    name_remaining = run_query("SELECT COUNT(*) as cnt FROM schools WHERE name LIKE '%' || chr(65533) || '%'")

    if city_remaining:
        print(f"  Corrupted cities remaining: {city_remaining[0]['cnt']}")
    if name_remaining:
        print(f"  Corrupted school names remaining: {name_remaining[0]['cnt']}")

    # Show some sample fixed cities
    samples = run_query(
        "SELECT DISTINCT city, state FROM schools WHERE city IN ('Goiânia','São Paulo','Belém','Maceió') ORDER BY city LIMIT 5"
    )
    if samples:
        print("\n  Sample fixed cities:")
        for s in samples:
            print(f"    [{s['state'].strip()}] {s['city']}")

    print("\nDone!")


def build_fffd_sql_literal(s):
    """Build a SQL expression that reconstructs a string containing U+FFFD.
    E.g., 'Goi' || chr(65533) || 's' for 'Goi\ufffds'
    """
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


if __name__ == "__main__":
    main()
