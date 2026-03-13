-- Migration to update bookmarks_type_check constraint
-- First, drop the existing constraint
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_type_check;

-- Add the updated constraint including 'ai_response'
ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_type_check CHECK (type IN ('case', 'source', 'ai_response'));
