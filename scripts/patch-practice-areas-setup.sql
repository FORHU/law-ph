-- Run this ONCE before the patch scripts.
-- Adds the practice_areas column + GIN index to the legalrag documents table.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS practice_areas text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_documents_practice_areas
  ON documents USING GIN (practice_areas);

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'documents' AND column_name = 'practice_areas';
