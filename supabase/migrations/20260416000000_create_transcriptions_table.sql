-- Create the transcriptions table
CREATE TABLE IF NOT EXISTS law_ph.transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Transcription',
    audio_url TEXT,
    transcript TEXT,
    duration INTEGER DEFAULT 0,
    job_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE law_ph.transcriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own transcriptions" 
    ON law_ph.transcriptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own transcriptions" 
    ON law_ph.transcriptions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcriptions" 
    ON law_ph.transcriptions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcriptions" 
    ON law_ph.transcriptions FOR DELETE 
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS transcriptions_user_id_idx ON law_ph.transcriptions(user_id);
