"""Parse Communities_levels.sql and Communities.sql (UTF-16LE SQL Server format),
generate PostgreSQL INSERTs for community_levels, and UPDATE characters with correct level_ids."""
import re
import subprocess
import sys
import io
import json

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def read_utf16(path):
    with open(path, 'r', encoding='utf-16-le') as f:
        return f.read()

def run_sql_file(path):
    result = subprocess.run(
        ["npx", "supabase", "db", "query", "--linked", "-f", path],
        capture_output=True, timeout=120,
        cwd=r"C:\Users\robso\Projetos\piramide-do-bem", shell=True
    )
    if result.returncode != 0:
        err = result.stderr.decode("utf-8", errors="replace")[:500]
        print(f"SQL ERROR: {err}")
        return False
    return True

def run_sql(sql):
    result = subprocess.run(
        ["npx", "supabase", "db", "query", "--linked", sql],
        capture_output=True, timeout=120,
        cwd=r"C:\Users\robso\Projetos\piramide-do-bem", shell=True
    )
    if result.returncode != 0:
        return None
    try:
        return json.loads(result.stdout.decode("utf-8", errors="replace")).get("rows", [])
    except:
        return None

def escape(s):
    return s.replace("'", "''")

# ── Step 1: Parse Communities_levels.sql ──
print("Parsing Communities_levels.sql...")
levels_content = read_utf16("scripts/Communities_levels.sql")

# Pattern for VALUES in the INSERT
# VALUES (Id, PublicId, CommunityId, BlobId, Name, Description, Tier, MinPoints, MaxPoints, ColorHex, DisplayOrder, Status, ...)
level_pattern = re.compile(
    r"VALUES\s*\(\s*(-?\d+)\s*,\s*N'([^']+)'\s*,\s*(-?\d+)\s*,\s*-?\d+\s*,\s*N'([^']*)'\s*,\s*N'([^']*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(NULL|\d+)\s*,\s*N'([^']*)'\s*,\s*(\d+)\s*,\s*N'([^']*)'",
    re.IGNORECASE
)

levels = []
for m in level_pattern.finditer(levels_content):
    levels.append({
        'snowflake_id': m.group(1),
        'public_id': m.group(2),
        'community_snowflake_id': m.group(3),
        'name': m.group(4),
        'description': m.group(5),
        'tier': int(m.group(6)),
        'min_points': int(m.group(7)),
        'max_points': None if m.group(8) == 'NULL' else int(m.group(8)),
        'color_hex': m.group(9),
        'display_order': int(m.group(10)),
    })

print(f"  Found {len(levels)} levels")

# Build level snowflake -> public_id mapping
level_sf_to_uuid = {}
for l in levels:
    level_sf_to_uuid[l['snowflake_id']] = l['public_id']

# ── Step 2: Parse Communities.sql for community and character mappings ──
print("Parsing Communities.sql...")
communities_content = read_utf16("scripts/Communities.sql")

# Extract community snowflake_id -> public_id mapping
# Communities INSERT pattern
comm_pattern = re.compile(
    r"INSERT\s+\[communities\]\.\[Communities\].*?VALUES\s*\(\s*(-?\d+)\s*,\s*N'([^']+)'",
    re.IGNORECASE
)

comm_sf_to_uuid = {}
for m in comm_pattern.finditer(communities_content):
    comm_sf_to_uuid[m.group(1)] = m.group(2)

print(f"  Found {len(comm_sf_to_uuid)} community mappings")

# Extract character snowflake_id -> (public_id, level_snowflake_id)
# Characters INSERT: (Id, PublicId, CommunityId, LevelId, Name, ...)
char_pattern = re.compile(
    r"INSERT\s+\[communities\]\.\[Characters\].*?VALUES\s*\(\s*(-?\d+)\s*,\s*N'([^']+)'\s*,\s*(-?\d+)\s*,\s*(-?\d+)",
    re.IGNORECASE
)

characters = []
for m in char_pattern.finditer(communities_content):
    characters.append({
        'snowflake_id': m.group(1),
        'public_id': m.group(2),
        'community_snowflake_id': m.group(3),
        'level_snowflake_id': m.group(4),
    })

print(f"  Found {len(characters)} character mappings")

# ── Step 3: Check community_id mapping to existing PG communities ──
# Communities in PG use their public_id as the 'id' column
# Verify by checking a few
print("\nVerifying community mapping...")
missing_communities = set()
for l in levels:
    comm_uuid = comm_sf_to_uuid.get(l['community_snowflake_id'])
    if not comm_uuid:
        missing_communities.add(l['community_snowflake_id'])

if missing_communities:
    print(f"  WARNING: {len(missing_communities)} levels reference unknown communities")
else:
    print("  All level->community mappings found")

# ── Step 4: Generate SQL ──
print("\nGenerating SQL...")

# Add max_points and color_hex columns if missing
alter_sql = []
alter_sql.append("ALTER TABLE community_levels ADD COLUMN IF NOT EXISTS max_points INT;")
alter_sql.append("ALTER TABLE community_levels ADD COLUMN IF NOT EXISTS color_hex TEXT;")
alter_sql.append("ALTER TABLE community_levels ADD COLUMN IF NOT EXISTS description TEXT;")

# Drop FK, truncate, and re-insert
setup_sql = [
    "ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_level_id_fkey;",
    "TRUNCATE community_levels CASCADE;",
]

# Generate level INSERTs
insert_sql = []
for l in levels:
    comm_uuid = comm_sf_to_uuid.get(l['community_snowflake_id'])
    if not comm_uuid:
        continue
    max_pts = 'NULL' if l['max_points'] is None else str(l['max_points'])
    insert_sql.append(
        f"INSERT INTO community_levels (id, public_id, community_id, tier, name, description, min_points, max_points, color_hex, display_order) "
        f"VALUES ('{l['public_id']}', '{l['public_id']}', '{comm_uuid}', {l['tier']}, "
        f"'{escape(l['name'])}', '{escape(l['description'])}', {l['min_points']}, {max_pts}, "
        f"'{l['color_hex']}', {l['display_order']});"
    )

# Generate character UPDATE statements
update_sql = []
for ch in characters:
    level_uuid = level_sf_to_uuid.get(ch['level_snowflake_id'])
    if not level_uuid:
        continue
    update_sql.append(
        f"UPDATE characters SET level_id = '{level_uuid}' WHERE public_id = '{ch['public_id']}';"
    )

# Recreate FK
fk_sql = [
    "ALTER TABLE characters ADD CONSTRAINT characters_level_id_fkey FOREIGN KEY (level_id) REFERENCES community_levels(id);",
]

print(f"  {len(insert_sql)} level INSERTs")
print(f"  {len(update_sql)} character UPDATEs")

# ── Step 5: Write and execute ──
# Write alter columns
with open("scripts/_levels_alter.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(alter_sql))
print("\nAdding columns...")
run_sql_file("scripts/_levels_alter.sql")

# Write and execute setup (drop FK + truncate)
with open("scripts/_levels_setup.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(setup_sql))
print("Dropping FK and truncating...")
run_sql_file("scripts/_levels_setup.sql")

# Write and execute inserts in batches
print("Inserting levels...")
batch_size = 100
for i in range(0, len(insert_sql), batch_size):
    batch = insert_sql[i:i+batch_size]
    with open("scripts/_levels_batch.sql", "w", encoding="utf-8") as f:
        f.write("BEGIN;\n" + "\n".join(batch) + "\nCOMMIT;")
    ok = run_sql_file("scripts/_levels_batch.sql")
    if not ok:
        print(f"  FAILED at batch {i//batch_size + 1}")
        break
    done = min(i + batch_size, len(insert_sql))
    if done % 500 == 0 or done == len(insert_sql):
        print(f"  {done}/{len(insert_sql)} levels inserted")

# Write and execute character updates in batches
print("Updating character level_ids...")
for i in range(0, len(update_sql), batch_size):
    batch = update_sql[i:i+batch_size]
    with open("scripts/_levels_batch.sql", "w", encoding="utf-8") as f:
        f.write("BEGIN;\n" + "\n".join(batch) + "\nCOMMIT;")
    ok = run_sql_file("scripts/_levels_batch.sql")
    if not ok:
        print(f"  FAILED at batch {i//batch_size + 1}")
        # Try individual statements
        for stmt in batch:
            with open("scripts/_levels_batch.sql", "w", encoding="utf-8") as f:
                f.write(stmt)
            run_sql_file("scripts/_levels_batch.sql")
    done = min(i + batch_size, len(update_sql))
    if done % 1000 == 0 or done == len(update_sql):
        print(f"  {done}/{len(update_sql)} characters updated")

# Recreate FK
print("Recreating FK...")
with open("scripts/_levels_batch.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(fk_sql))
run_sql_file("scripts/_levels_batch.sql")

print("\nDone! Running verification...")

# Verification
for q, label in [
    ("SELECT 'levels' as tbl, COUNT(*) as cnt FROM community_levels UNION ALL SELECT 'chars_com_level', COUNT(*) FROM characters WHERE level_id IS NOT NULL UNION ALL SELECT 'chars_sem_level', COUNT(*) FROM characters WHERE level_id IS NULL", "Counts"),
    ("SELECT tier, MIN(min_points) as min_pts, MAX(max_points) as max_pts, COUNT(*) as cnt FROM community_levels GROUP BY tier ORDER BY tier", "Tier distribution"),
]:
    rows = run_sql(q)
    if rows:
        print(f"\n{label}:")
        for r in rows:
            print(f"  {r}")

# Check all communities have 5 levels
rows = run_sql("SELECT cm.name, COUNT(cl.id) as levels FROM communities cm LEFT JOIN community_levels cl ON cl.community_id = cm.id GROUP BY cm.name HAVING COUNT(cl.id) != 5")
if rows:
    print(f"\nCommunities without 5 levels: {len(rows)}")
    for r in rows[:5]:
        print(f"  {r}")
else:
    print("\nAll communities have exactly 5 levels!")
