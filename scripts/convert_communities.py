#!/usr/bin/env python3
"""
Parse SQL Server Communities.sql and generate PostgreSQL INSERT statements for Supabase.

Mapping:
- Source SnowflakeId (bigint PK) -> Target uses PublicId (UUID) as the new PK
- Foreign keys are resolved by looking up the referenced row's PublicId
- community_levels are derived from Character (CommunityId, LevelId) groupings
"""

import re
import uuid
import sys
from collections import defaultdict

INPUT_FILE = r"C:\Users\robso\Projetos\piramide-do-bem\scripts\Communities_utf8.sql"
OUTPUT_FILE = r"C:\Users\robso\Projetos\piramide-do-bem\scripts\communities_pg_data.sql"


def parse_values(values_str):
    """Parse a SQL Server VALUES(...) clause into a list of Python values."""
    results = []
    i = 0
    length = len(values_str)

    while i < length:
        # Skip whitespace and commas
        while i < length and values_str[i] in (' ', '\t', ','):
            i += 1
        if i >= length:
            break

        # NULL
        if values_str[i:i+4] == 'NULL':
            results.append(None)
            i += 4
        # CAST(N'...' AS DateTime2)
        elif values_str[i:i+4] == 'CAST':
            # Find the matching closing paren
            match = re.match(r"CAST\(N'([^']+)'\s+AS\s+DateTime2\)", values_str[i:])
            if match:
                results.append(match.group(1))
                i += match.end()
            else:
                # fallback: skip to next comma
                end = values_str.find(',', i)
                if end == -1:
                    end = length
                results.append(values_str[i:end].strip())
                i = end
        # N'...' (Unicode string, may contain escaped single quotes '')
        elif values_str[i:i+2] == "N'":
            i += 2  # skip N'
            val = []
            while i < length:
                if values_str[i] == "'":
                    if i + 1 < length and values_str[i+1] == "'":
                        val.append("'")
                        i += 2
                    else:
                        i += 1  # closing quote
                        break
                else:
                    val.append(values_str[i])
                    i += 1
            results.append(''.join(val))
        # Number (possibly negative)
        elif values_str[i] == '-' or values_str[i].isdigit():
            end = i + 1
            while end < length and (values_str[end].isdigit() or values_str[end] == '.'):
                end += 1
            num_str = values_str[i:end]
            if '.' in num_str:
                results.append(float(num_str))
            else:
                results.append(int(num_str))
            i = end
        else:
            # Skip unknown character
            i += 1

    return results


def parse_insert_line(line):
    """Parse a SQL Server INSERT line and return (table_name, column_names, values)."""
    # Match: INSERT [schema].[Table] ([col1], [col2], ...) VALUES (...)
    m = re.match(
        r"INSERT\s+\[communities\]\.\[(\w+)\]\s+\(([^)]+)\)\s+VALUES\s+\((.+)\)\s*$",
        line.strip()
    )
    if not m:
        return None, None, None

    table_name = m.group(1)
    cols_str = m.group(2)
    vals_str = m.group(3)

    columns = [c.strip().strip('[]') for c in cols_str.split(',')]
    values = parse_values(vals_str)

    return table_name, columns, values


def escape_pg(val):
    """Escape a value for PostgreSQL INSERT."""
    if val is None:
        return 'NULL'
    if isinstance(val, (int, float)):
        return str(val)
    # String: escape single quotes
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"


def format_timestamp(val):
    """Format a datetime string for PostgreSQL timestamptz."""
    if val is None:
        return 'NULL'
    # Input: 2025-11-27T21:58:39.0466667
    # Output: '2025-11-27T21:58:39.046666+00:00'
    return f"'{val}+00:00'"


def main():
    print(f"Reading {INPUT_FILE}...")

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Storage for parsed rows
    categories = []  # list of dicts
    types = []
    communities = []
    characters = []

    # Lookup maps: SnowflakeId -> row dict
    cat_by_id = {}
    type_by_id = {}
    comm_by_id = {}

    for line in lines:
        line = line.strip()
        if not line.startswith('INSERT [communities].'):
            continue

        table, columns, values = parse_insert_line(line)
        if table is None:
            continue

        row = dict(zip(columns, values))

        if table == 'Categories':
            categories.append(row)
            cat_by_id[row['Id']] = row
        elif table == 'Types':
            types.append(row)
            type_by_id[row['Id']] = row
        elif table == 'Communities':
            communities.append(row)
            comm_by_id[row['Id']] = row
        elif table == 'Characters':
            characters.append(row)

    print(f"Parsed: {len(categories)} categories, {len(types)} types, "
          f"{len(communities)} communities, {len(characters)} characters")

    # Build SnowflakeId -> PublicId lookup for all tables
    snowflake_to_uuid = {}
    for row in categories:
        snowflake_to_uuid[row['Id']] = row['PublicId']
    for row in types:
        snowflake_to_uuid[row['Id']] = row['PublicId']
    for row in communities:
        snowflake_to_uuid[row['Id']] = row['PublicId']

    # Derive community_levels from Characters
    # Group by (CommunityId, LevelId) to find unique levels per community
    comm_levels = defaultdict(set)  # CommunityId -> set of LevelIds
    for row in characters:
        comm_levels[row['CommunityId']].add(row['LevelId'])

    # For each community, sort level IDs and assign tiers 1-5
    level_tiers = [0, 100, 300, 600, 1000]
    level_names = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5']

    # level_snowflake_to_uuid: LevelId (snowflake) -> generated UUID
    level_snowflake_to_uuid = {}
    level_rows = []  # list of dicts for output

    total_levels = 0
    for comm_snowflake_id, level_ids in sorted(comm_levels.items()):
        sorted_levels = sorted(level_ids)
        comm_uuid = snowflake_to_uuid.get(comm_snowflake_id)
        if comm_uuid is None:
            print(f"WARNING: Community SnowflakeId {comm_snowflake_id} not found in lookup!")
            continue

        for tier_idx, level_snowflake_id in enumerate(sorted_levels):
            tier = tier_idx + 1
            level_uuid = str(uuid.uuid4())
            level_snowflake_to_uuid[level_snowflake_id] = level_uuid

            level_rows.append({
                'id': level_uuid,
                'public_id': level_uuid,  # reuse same UUID
                'community_id': comm_uuid,
                'tier': tier,
                'name': level_names[tier_idx] if tier_idx < 5 else f'Tier {tier}',
                'min_points': level_tiers[tier_idx] if tier_idx < 5 else tier_idx * 200,
                'display_order': tier,
                'created_at': '2025-11-27T21:58:39.000000+00:00',
            })
            total_levels += 1

    print(f"Derived: {total_levels} community_levels")

    # Verify level count per community
    communities_with_wrong_levels = 0
    for comm_id, levels in comm_levels.items():
        if len(levels) != 5:
            communities_with_wrong_levels += 1
            comm_name = comm_by_id.get(comm_id, {}).get('Name', 'UNKNOWN')
            print(f"  WARNING: Community '{comm_name}' (id={comm_id}) has {len(levels)} levels instead of 5")

    if communities_with_wrong_levels == 0:
        print("  All communities have exactly 5 levels. Good!")

    # Now generate output SQL
    print(f"\nWriting {OUTPUT_FILE}...")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT statements for Supabase\n")
        f.write("-- Generated from SQL Server Communities.sql\n")
        f.write(f"-- Categories: {len(categories)}, Types: {len(types)}, "
                f"Communities: {len(communities)}, Levels: {total_levels}, "
                f"Characters: {len(characters)}\n\n")

        f.write("BEGIN;\n\n")

        # 1. community_categories
        f.write("-- ============================================\n")
        f.write(f"-- community_categories ({len(categories)} rows)\n")
        f.write("-- ============================================\n\n")

        for row in categories:
            vals = [
                escape_pg(row['PublicId']),           # id (UUID PK)
                escape_pg(row['PublicId']),           # public_id
                escape_pg(row['Name']),
                escape_pg(row['Description']),
                escape_pg(row['Slug']),
                escape_pg(row.get('IconClass')),
                escape_pg(row.get('ColorHex')),
                str(row['DisplayOrder']),
                escape_pg(row['Status']),
                format_timestamp(row.get('CreatedAt')),
            ]
            f.write(
                f"INSERT INTO community_categories "
                f"(id, public_id, name, description, slug, icon_class, color_hex, "
                f"display_order, status, created_at) VALUES ({', '.join(vals)});\n"
            )

        f.write("\n")

        # 2. community_types
        f.write("-- ============================================\n")
        f.write(f"-- community_types ({len(types)} rows)\n")
        f.write("-- ============================================\n\n")

        for row in types:
            category_uuid = snowflake_to_uuid.get(row['CategoryId'])
            if category_uuid is None:
                print(f"WARNING: CategoryId {row['CategoryId']} not found for type '{row['Name']}'")
                continue

            vals = [
                escape_pg(row['PublicId']),           # id
                escape_pg(row['PublicId']),           # public_id
                escape_pg(category_uuid),             # category_id FK
                escape_pg(row['Name']),
                escape_pg(row['Description']),
                escape_pg(row['Slug']),
                escape_pg(row.get('IconClass')),
                escape_pg(row.get('ColorHex')),
                str(row['DisplayOrder']),
                escape_pg(row['Status']),
                format_timestamp(row.get('CreatedAt')),
            ]
            f.write(
                f"INSERT INTO community_types "
                f"(id, public_id, category_id, name, description, slug, icon_class, color_hex, "
                f"display_order, status, created_at) VALUES ({', '.join(vals)});\n"
            )

        f.write("\n")

        # 3. communities
        f.write("-- ============================================\n")
        f.write(f"-- communities ({len(communities)} rows)\n")
        f.write("-- ============================================\n\n")

        for row in communities:
            type_uuid = snowflake_to_uuid.get(row['TypeId'])
            if type_uuid is None:
                print(f"WARNING: TypeId {row['TypeId']} not found for community '{row['Name']}'")
                continue

            vals = [
                escape_pg(row['PublicId']),           # id
                escape_pg(row['PublicId']),           # public_id
                escape_pg(type_uuid),                 # type_id FK
                escape_pg(row['Name']),
                escape_pg(row['Description']),
                escape_pg(row['Slug']),
                escape_pg(row.get('IconClass')),
                escape_pg(row.get('ColorHex')),
                str(row['DisplayOrder']),
                escape_pg(row['Status']),
                format_timestamp(row.get('CreatedAt')),
            ]
            f.write(
                f"INSERT INTO communities "
                f"(id, public_id, type_id, name, description, slug, icon_class, color_hex, "
                f"display_order, status, created_at) VALUES ({', '.join(vals)});\n"
            )

        f.write("\n")

        # 4. community_levels
        f.write("-- ============================================\n")
        f.write(f"-- community_levels ({total_levels} rows)\n")
        f.write("-- ============================================\n\n")

        for lv in level_rows:
            vals = [
                escape_pg(lv['id']),
                escape_pg(lv['public_id']),
                escape_pg(lv['community_id']),
                str(lv['tier']),
                escape_pg(lv['name']),
                str(lv['min_points']),
                str(lv['display_order']),
                f"'{lv['created_at']}'",
            ]
            f.write(
                f"INSERT INTO community_levels "
                f"(id, public_id, community_id, tier, name, min_points, "
                f"display_order, created_at) VALUES ({', '.join(vals)});\n"
            )

        f.write("\n")

        # 5. characters
        f.write("-- ============================================\n")
        f.write(f"-- characters ({len(characters)} rows)\n")
        f.write("-- ============================================\n\n")

        missing_comm = 0
        missing_level = 0
        for row in characters:
            comm_uuid = snowflake_to_uuid.get(row['CommunityId'])
            level_uuid = level_snowflake_to_uuid.get(row['LevelId'])

            if comm_uuid is None:
                missing_comm += 1
                continue
            if level_uuid is None:
                missing_level += 1
                continue

            vals = [
                escape_pg(row['PublicId']),           # id
                escape_pg(row['PublicId']),           # public_id
                escape_pg(comm_uuid),                 # community_id FK
                escape_pg(level_uuid),                # level_id FK
                escape_pg(row['Name']),
                escape_pg(row.get('RealName')),
                escape_pg(row['Description']),
                escape_pg(row['Archetype']),
                escape_pg(row['Gender']),
                str(row['DisplayOrder']),
                escape_pg(row['Status']),
                format_timestamp(row.get('CreatedAt')),
            ]
            f.write(
                f"INSERT INTO characters "
                f"(id, public_id, community_id, level_id, name, real_name, description, "
                f"archetype, gender, display_order, status, created_at) VALUES ({', '.join(vals)});\n"
            )

        if missing_comm > 0:
            print(f"WARNING: {missing_comm} characters had missing community references")
        if missing_level > 0:
            print(f"WARNING: {missing_level} characters had missing level references")

        f.write("\nCOMMIT;\n")

    print(f"\nDone! Output written to {OUTPUT_FILE}")
    print(f"\nFinal counts:")
    print(f"  community_categories: {len(categories)}")
    print(f"  community_types:      {len(types)}")
    print(f"  communities:          {len(communities)}")
    print(f"  community_levels:     {total_levels}")
    print(f"  characters:           {len(characters)}")
    print(f"  TOTAL INSERT stmts:   {len(categories) + len(types) + len(communities) + total_levels + len(characters)}")


if __name__ == '__main__':
    main()
