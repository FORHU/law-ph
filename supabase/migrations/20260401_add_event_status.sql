-- Migration: Add status and feedback to events
-- Update the events table to support human-validated scheduling workflow.

DO $$ 
BEGIN
    -- 1. Create a status enum type if it does not exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        CREATE TYPE event_status AS ENUM ('draft', 'pending', 'confirmed', 'requested_change', 'tentative', 'denied');
    END IF;

    -- 2. Add the status column with a default of 'draft'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
        ALTER TABLE events ADD COLUMN status event_status DEFAULT 'draft';
    END IF;

    -- 3. Add the client_feedback column (optional text)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'client_feedback') THEN
        ALTER TABLE events ADD COLUMN client_feedback TEXT;
    END IF;

    -- 4. Ensure ID is UUID (Supabase standard)
    -- If your current ID is int8, you may need a separate migration to convert it.
    -- Assuming Supabase default installation often uses UUID for public-facing tables.

END $$;
