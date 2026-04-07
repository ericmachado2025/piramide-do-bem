CREATE OR REPLACE FUNCTION update_display_orders() RETURNS void AS $$
BEGIN
  -- Reorder categories by student count
  WITH ranked AS (
    SELECT cc.id, ROW_NUMBER() OVER (ORDER BY COUNT(s.id) DESC, cc.name) as new_order
    FROM community_categories cc
    LEFT JOIN community_types ct ON ct.category_id = cc.id
    LEFT JOIN communities c ON c.type_id = ct.id
    LEFT JOIN students s ON s.community_id = c.id
    GROUP BY cc.id, cc.name
  )
  UPDATE community_categories SET display_order = r.new_order
  FROM ranked r WHERE community_categories.id = r.id;
  -- Reorder types by student count within category
  WITH ranked AS (
    SELECT ct.id, ROW_NUMBER() OVER (PARTITION BY ct.category_id ORDER BY COUNT(s.id) DESC, ct.name) as new_order
    FROM community_types ct
    LEFT JOIN communities c ON c.type_id = ct.id
    LEFT JOIN students s ON s.community_id = c.id
    GROUP BY ct.id, ct.category_id, ct.name
  )
  UPDATE community_types SET display_order = r.new_order
  FROM ranked r WHERE community_types.id = r.id;
  -- Reorder communities by student count within type
  WITH ranked AS (
    SELECT c.id, ROW_NUMBER() OVER (PARTITION BY c.type_id ORDER BY COUNT(s.id) DESC, c.name) as new_order
    FROM communities c
    LEFT JOIN students s ON s.community_id = c.id
    GROUP BY c.id, c.type_id, c.name
  )
  UPDATE communities SET display_order = r.new_order
  FROM ranked r WHERE communities.id = r.id;
END;
$$ LANGUAGE plpgsql;
SELECT update_display_orders();
