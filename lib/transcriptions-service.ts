import { createClient } from './supabase/client';

const supabase = createClient();

export interface Transcription {
  id: string;
  user_id: string;
  title: string;
  audio_url: string | null;
  transcript: string | null;
  duration: number;
  job_name?: string;
  created_at: string;
}

export async function getTranscriptions(userId: string) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback to mock data if table is missing
    if (error.code === 'PGRST204' || error.code === 'PGRST205') {
      console.warn("[TranscriptionService] Transcriptions table not found. Using demo data.");
      return [
        { id: 'm1', user_id: userId, title: 'Court Hearing - Branch 14', audio_url: null, transcript: 'Speaker 1: Please state your name...', duration: 1200, created_at: new Date().toISOString() },
        { id: 'm2', user_id: userId, title: 'Client Meeting - Estate Case', audio_url: null, transcript: 'Speaker 1: We are here to discuss the partition...', duration: 1800, created_at: new Date(Date.now() - 86400000).toISOString() },
      ];
    }
    console.error('Error fetching transcriptions:', error);
    return [];
  }
  return data as Transcription[];
}

export async function addTranscription(
  userId: string, 
  transcription: Partial<Omit<Transcription, 'id' | 'user_id' | 'created_at'>>
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .insert([
      { 
        user_id: userId, 
        title: transcription.title || 'Untitled Transcription',
        audio_url: transcription.audio_url,
        transcript: transcription.transcript,
        duration: transcription.duration || 0,
        job_name: transcription.job_name
      }
    ])
    .select()
    .single();

  if (error) {
    // Check if it's a schema cache issue
    if (error.code === '42703' || error.message.includes('job_name')) {
      console.warn("Retrying addTranscription without job_name due to schema cache...");
      const { data: retryData, error: retryError } = await supabase
        .from('transcriptions')
        .insert([
          { 
            user_id: userId, 
            title: transcription.title || 'Untitled Transcription',
            audio_url: transcription.audio_url,
            transcript: transcription.transcript,
            duration: transcription.duration || 0
          }
        ])
        .select()
        .single();
      if (retryError) {
        console.error('Error adding transcription (retry):', retryError);
        return null;
      }
      return retryData as Transcription;
    }
    console.error('Error adding transcription:', error);
    return null;
  }
  return data as Transcription;
}

export async function updateTranscription(
  id: string, 
  updates: Partial<Transcription>
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating transcription:', error);
    return null;
  }
  return data as Transcription;
}

export async function deleteTranscription(id: string) {
  const { error } = await supabase
    .from('transcriptions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transcription:', error);
    return false;
  }
  return true;
}
