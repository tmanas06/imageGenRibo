-- ============================================================
-- SQL Script to Add Text Content to nebZmart Components
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, let's see what product_id we're working with
-- SELECT DISTINCT product_id FROM repository;

-- ============================================================
-- OPTION 1: Update by product_id (if you have one)
-- Replace 'YOUR_PRODUCT_ID' with your actual product_id
-- ============================================================

-- Brand Name (INIT_01a)
UPDATE repository
SET content = 'nebZmart'
WHERE component_id = 'INIT_01a'
  AND (content IS NULL OR content = '');

-- Main Headline (INIT_03)
UPDATE repository
SET content = 'In Moderate to Severe COPD'
WHERE component_id = 'INIT_03'
  AND (content IS NULL OR content = '');

-- Tagline/Slogan (INIT_06) - if you have text version
UPDATE repository
SET content = 'Each breath matters'
WHERE component_id = 'INIT_06'
  AND (content IS NULL OR content = '');

-- Generic Name/Composition (SOL_02)
UPDATE repository
SET content = 'Glycopyrronium Inhalation Solution 25 mcg'
WHERE component_id = 'SOL_02'
  AND (content IS NULL OR content = '');

-- Company Name (COMM_03)
UPDATE repository
SET content = 'Glenmark'
WHERE component_id = 'COMM_03'
  AND (content IS NULL OR content = '');

-- Company Logo text fallback (COMM_04)
UPDATE repository
SET content = 'Glenmark'
WHERE component_id = 'COMM_04'
  AND (content IS NULL OR content = '');

-- RMP Disclaimer (REG_05)
UPDATE repository
SET content = 'For the use of a Registered Medical Practitioner, Hospital, or Laboratory only'
WHERE component_id = 'REG_05'
  AND (content IS NULL OR content = '');

-- ============================================================
-- CLAIMS (SOL_01) - These need individual updates
-- Since you have 7 SOL_01 rows, we need to update them by ID
-- ============================================================

-- First, let's see all SOL_01 entries with their IDs:
-- SELECT id, component_id, content, image_path FROM repository WHERE component_id = 'SOL_01';

-- Method A: Update ALL SOL_01 rows with a single pipe-separated claim list
-- (Use this if you want ONE row with all claims)
/*
UPDATE repository
SET content = 'Quick onset of action within 5 mins|12 hrs long lasting relief|Improves lung function by 120 ml|Prevention of exacerbation|Reduces Hyper secretions|Improves FEV1'
WHERE component_id = 'SOL_01'
  AND id = (SELECT MIN(id) FROM repository WHERE component_id = 'SOL_01');
*/

-- Method B: Update each SOL_01 row individually
-- First, get the IDs of your SOL_01 rows:
-- SELECT id, component_id, content FROM repository WHERE component_id = 'SOL_01' ORDER BY id;

-- Then update each one (replace the IDs with your actual IDs):
/*
UPDATE repository SET content = 'Quick onset of action within 5 mins' WHERE id = 'YOUR_SOL01_ID_1';
UPDATE repository SET content = '12 hrs long lasting relief' WHERE id = 'YOUR_SOL01_ID_2';
UPDATE repository SET content = 'Improves lung function by 120 ml' WHERE id = 'YOUR_SOL01_ID_3';
UPDATE repository SET content = 'Prevention of exacerbation' WHERE id = 'YOUR_SOL01_ID_4';
UPDATE repository SET content = 'Reduces Hyper secretions' WHERE id = 'YOUR_SOL01_ID_5';
UPDATE repository SET content = 'Improves FEV1' WHERE id = 'YOUR_SOL01_ID_6';
*/

-- ============================================================
-- Method C: Update SOL_01 rows by row number (PostgreSQL)
-- This updates them in order of creation
-- ============================================================

WITH numbered_claims AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM repository
  WHERE component_id = 'SOL_01'
)
UPDATE repository r
SET content = CASE nc.rn
  WHEN 1 THEN 'Quick onset of action within 5 mins'
  WHEN 2 THEN '12 hrs long lasting relief'
  WHEN 3 THEN 'Improves lung function by 120 ml'
  WHEN 4 THEN 'Prevention of exacerbation'
  WHEN 5 THEN 'Reduces Hyper secretions'
  WHEN 6 THEN 'Improves FEV1'
  WHEN 7 THEN 'Well tolerated safety profile'
  ELSE content
END
FROM numbered_claims nc
WHERE r.id = nc.id
  AND (r.content IS NULL OR r.content = '');

-- ============================================================
-- VERIFICATION: Check what was updated
-- ============================================================

SELECT
  component_id,
  content,
  CASE WHEN image_base64 IS NOT NULL THEN 'Has Image' ELSE 'No Image' END as has_image,
  CASE WHEN content IS NOT NULL AND content != '' THEN 'Has Text' ELSE 'NO TEXT!' END as has_text
FROM repository
WHERE component_id IN ('INIT_01a', 'INIT_03', 'SOL_01', 'SOL_02', 'COMM_03', 'COMM_04', 'REG_05')
ORDER BY component_id;
