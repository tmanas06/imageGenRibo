-- ============================================================
-- QUICK UPDATE: Add text content to nebZmart components
-- Copy and paste this entire script into Supabase SQL Editor
-- ============================================================

-- 1. Brand Name
UPDATE repository SET content = 'nebZmart' WHERE component_id = 'INIT_01a' AND (content IS NULL OR content = '');

-- 2. Main Headline
UPDATE repository SET content = 'In Moderate to Severe COPD' WHERE component_id = 'INIT_03' AND (content IS NULL OR content = '');

-- 3. Tagline/Slogan
UPDATE repository SET content = 'Each breath matters' WHERE component_id = 'INIT_06' AND (content IS NULL OR content = '');

-- 4. Generic Name/Composition (update ALL SOL_02 rows)
UPDATE repository SET content = 'Glycopyrronium Inhalation Solution 25 mcg' WHERE component_id = 'SOL_02' AND (content IS NULL OR content = '');

-- 5. Company Name
UPDATE repository SET content = 'Glenmark' WHERE component_id = 'COMM_03' AND (content IS NULL OR content = '');
UPDATE repository SET content = 'Glenmark' WHERE component_id = 'COMM_04' AND (content IS NULL OR content = '');

-- 6. Disclaimer
UPDATE repository SET content = 'For the use of a Registered Medical Practitioner, Hospital, or Laboratory only' WHERE component_id = 'REG_05' AND (content IS NULL OR content = '');

-- 7. Claims (SOL_01) - Update all 7 rows in order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM repository WHERE component_id = 'SOL_01'
)
UPDATE repository r SET content =
  CASE n.rn
    WHEN 1 THEN 'Quick onset of action within 5 mins'
    WHEN 2 THEN '12 hrs long lasting relief'
    WHEN 3 THEN 'Improves lung function by 120 ml'
    WHEN 4 THEN 'Prevention of exacerbation'
    WHEN 5 THEN 'Reduces Hyper secretions'
    WHEN 6 THEN 'Improves FEV1'
    WHEN 7 THEN 'Well tolerated safety profile'
  END
FROM numbered n WHERE r.id = n.id AND (r.content IS NULL OR r.content = '');

-- 8. Verify the updates
SELECT component_id, content,
  CASE WHEN content IS NOT NULL AND content != '' THEN '✅' ELSE '❌' END as status
FROM repository
WHERE component_id IN ('INIT_01a', 'INIT_03', 'INIT_06', 'SOL_01', 'SOL_02', 'COMM_03', 'COMM_04', 'REG_05')
ORDER BY component_id, id;
