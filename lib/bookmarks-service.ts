// lib/bookmarks-service.ts
import { createClient } from '@/lib/supabase/client';

export interface Bookmark {
  id: string;
  user_id: string;
  item_id: string;
  title: string;
  reference: string;
  type: 'case' | 'source';
  url?: string | null;
  ai_summary?: string | null;
  doctrine?: string | null;
  facts?: string | null;
  created_at: string;
}

export type NewBookmark = Omit<Bookmark, 'id' | 'user_id' | 'created_at'>;

export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      if (!error.message.includes('schema cache')) {
        console.error('[bookmarks-service] getBookmarks error:', error.message);
      }
      return [];
    }
    return (data as Bookmark[]) || [];
  } catch (err) {
    console.error('[bookmarks-service] getBookmarks network error:', err);
    return [];
  }
}

export async function addBookmark(userId: string, bookmark: NewBookmark): Promise<Bookmark | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({ ...bookmark, user_id: userId })
      .select()
      .single();
    if (error) {
      if (!error.message.includes('schema cache')) {
        console.error('[bookmarks-service] addBookmark error:', error.message);
      }
      return null;
    }
    return data as Bookmark;
  } catch (err) {
    console.error('[bookmarks-service] addBookmark network error:', err);
    return null;
  }
}

export async function removeBookmark(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) {
      if (!error.message.includes('schema cache')) {
        console.error('[bookmarks-service] removeBookmark error:', error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('[bookmarks-service] removeBookmark network error:', err);
    return false;
  }
}

export async function checkIsBookmarked(userId: string, itemId: string): Promise<string | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();
    if (error || !data) {
      if (error && !error.message.includes('schema cache')) {
        console.error('[bookmarks-service] checkIsBookmarked error:', error.message);
      }
      return null;
    }
    return data.id as string;
  } catch (err) {
    console.error('[bookmarks-service] checkIsBookmarked network error:', err);
    return null;
  }
}
