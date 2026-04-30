-- Migration: Calendar webhook sync support
-- 1. Add google_event_id to events for upsert deduplication
-- 2. Create calendar_watch_channels to map Google webhook channels → users

-- Add google_event_id column so we can upsert synced Google events without duplicates
ALTER TABLE law_ph.events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS events_google_event_id_user_idx
  ON law_ph.events(google_event_id, user_id)
  WHERE google_event_id IS NOT NULL;

-- Add google_link column if not already present (some installs may already have it)
ALTER TABLE law_ph.events ADD COLUMN IF NOT EXISTS google_link TEXT;

-- Table to track active Google Calendar push-notification channels
CREATE TABLE IF NOT EXISTS law_ph.calendar_watch_channels (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   TEXT        UNIQUE NOT NULL,   -- Google's channel ID (UUID we generate)
  resource_id  TEXT,                           -- Google's resource ID (returned after watch)
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expiration   BIGINT,                         -- Unix ms from Google; renew before this
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE law_ph.calendar_watch_channels ENABLE ROW LEVEL SECURITY;
-- Only the service-role key (used in webhook handler) may read/write this table.
-- No user-level policies needed.
