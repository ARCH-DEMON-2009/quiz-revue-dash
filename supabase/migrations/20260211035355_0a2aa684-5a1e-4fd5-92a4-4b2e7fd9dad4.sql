
-- STEP 1: Delete duplicate questions within GATE test 0fd523e7
DELETE FROM questions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY test_id, image, options::text, correct ORDER BY created_at ASC) as rn
    FROM questions
    WHERE test_id = '0fd523e7-3ff3-421e-a9b1-b9df78c2aa8f'
  ) ranked
  WHERE rn > 1
);

-- STEP 2: Delete duplicate tests (same name+stream, keep oldest)
-- First delete related test_results
DELETE FROM test_results WHERE test_id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY name, stream ORDER BY created_at ASC) as rn
    FROM tests
  ) ranked WHERE rn > 1
);

-- Delete related questions
DELETE FROM questions WHERE test_id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY name, stream ORDER BY created_at ASC) as rn
    FROM tests
  ) ranked WHERE rn > 1
);

-- Delete the duplicate tests themselves
DELETE FROM tests WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY name, stream ORDER BY created_at ASC) as rn
    FROM tests
  ) ranked WHERE rn > 1
);

-- STEP 3: Delete junk/test tests
-- First their results
DELETE FROM test_results WHERE test_id IN (
  SELECT id FROM tests WHERE name IN ('t1', 'Testing', 'DEL', 'Hi', 'IIT', 'Practice', 'test', 'teestt', 'dekh bhai', 'krxna', '123', 'Jagdish', 'Net', 'Shivam', 'Dev test', 'P-1')
);
-- Then their questions
DELETE FROM questions WHERE test_id IN (
  SELECT id FROM tests WHERE name IN ('t1', 'Testing', 'DEL', 'Hi', 'IIT', 'Practice', 'test', 'teestt', 'dekh bhai', 'krxna', '123', 'Jagdish', 'Net', 'Shivam', 'Dev test', 'P-1')
);
-- Then the tests
DELETE FROM tests WHERE name IN ('t1', 'Testing', 'DEL', 'Hi', 'IIT', 'Practice', 'test', 'teestt', 'dekh bhai', 'krxna', '123', 'Jagdish', 'Net', 'Shivam', 'Dev test', 'P-1');

-- STEP 4: Fix name formatting issues

-- Trim trailing/leading spaces
UPDATE tests SET name = TRIM(name) WHERE name != TRIM(name);

-- Fix capitalization for common acronyms/words
UPDATE tests SET name = REPLACE(name, 'Practice Test-', 'Practice Test ') WHERE name LIKE 'Practice Test-%';
UPDATE tests SET name = REPLACE(name, 'Short Practice Test -', 'Short Practice Test ') WHERE name LIKE 'Short Practice Test -%';

-- Fix lowercase starts
UPDATE tests SET name = 'Weekly Test' WHERE name = 'weekly test';
UPDATE tests SET name = 'AITS' WHERE name = 'aits';
UPDATE tests SET name = 'NEET' WHERE name = 'Neet' OR name = 'NEET';
UPDATE tests SET name = 'Advance Test' WHERE name = 'advance test';
UPDATE tests SET name = 'Short Practice Test' WHERE name = 'short practice test';
UPDATE tests SET name = 'Full Test' WHERE name = 'Full test';
UPDATE tests SET name = 'JEE' WHERE name = 'Jee';
UPDATE tests SET name = 'JEE Ultimate' WHERE name = 'Jee ultimate';
UPDATE tests SET name = 'CBSE' WHERE name = 'Cbse';
UPDATE tests SET name = 'NEET By SSV' WHERE name = 'neet by ssv';
UPDATE tests SET name = 'CA Foundation' WHERE name = 'Ca foundation';
UPDATE tests SET name = 'CUET Commerce' WHERE name = 'Cuet commerce';
UPDATE tests SET name = 'Advance Accounting' WHERE name = 'Advance accounting';
UPDATE tests SET name = 'NEET All Subject 25 Questions' WHERE name = 'neet all subject 25 questions';
UPDATE tests SET name = 'NEET 25 Questions' WHERE name = 'Neet 25 question';
UPDATE tests SET name = 'Organic Chemistry' WHERE name = 'Organic chemistry';
UPDATE tests SET name = 'Practice Test 07' WHERE name = 'Practice test 07';
UPDATE tests SET name = 'Physics Class 12' WHERE name = 'Physics class 12';
UPDATE tests SET name = 'Physics Class 12th' WHERE name = 'Physics class 12th';

-- Fix double spaces
UPDATE tests SET name = REPLACE(name, '  ', ' ') WHERE name LIKE '%  %';
