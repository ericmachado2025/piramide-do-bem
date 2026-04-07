ALTER TABLE community_levels ADD COLUMN IF NOT EXISTS display_prefix TEXT;
ALTER TABLE community_levels ADD COLUMN IF NOT EXISTS prefix_connector TEXT DEFAULT ' ';
UPDATE community_levels SET display_prefix = name;
UPDATE community_levels SET prefix_connector = ' ' WHERE name IN ('Delta', 'Gamma', 'Beta', 'Alpha', 'Omega', 'Grand Master', 'Master', 'Auror', 'Knight', 'Hokage', 'Kage', 'Genin', 'Chunin', 'Jonin', 'Padawan', 'Youngling', 'Epic', 'Legendary', 'Legend', 'Icon', 'Superstar', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Champion', 'Hero', 'Expert', 'Saiyan', 'Super Saiyan', 'SSJ3', 'SSG', 'Ultra Instinct', 'Rookie', 'Regular', 'Star', 'Hall of Fame', 'Common', 'Uncommon', 'Rare', 'Mythic');
UPDATE community_levels SET prefix_connector = ' de ' WHERE name IN ('Fan', 'Enthusiast', 'Aficionado', 'Viewer', 'Superfan', 'Beginner', 'Commoner', 'Adventurer', '1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars', 'First Year', 'OWL Student', 'NEWT Student');
UPDATE community_levels SET prefix_connector = ' de ' WHERE name LIKE 'Level%' OR name LIKE '%Star%';
