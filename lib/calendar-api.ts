/**
 * calendar-api.ts
 * Typed client for the chat-wonder-api Google Calendar REST endpoints.
 * All functions use the Supabase user UUID as session_id.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8001';

export interface CalendarAuthStatus {
  session_id: string;
  authenticated: boolean;
  service: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  description?: string;
  link?: string;
}

export interface ListEventsResult {
  success: boolean;
  needs_auth?: boolean;
  auth_url?: string;
  count?: number;
  events?: GoogleCalendarEvent[];
  message?: string;
  error?: string;
}

export interface CreateEventResult {
  success: boolean;
  needs_auth?: boolean;
  auth_url?: string;
  event_id?: string;
  title?: string;
  start?: string;
  end?: string;
  link?: string;
  message?: string;
  error?: string;
}

export interface DeleteEventResult {
  success: boolean;
  needs_auth?: boolean;
  auth_url?: string;
  event_id?: string;
  message?: string;
  error?: string;
}

/**
 * Check if a user (by session_id / Supabase UUID) has Google Calendar connected.
 */
export async function checkAuthStatus(sessionId: string): Promise<CalendarAuthStatus> {
  const res = await fetch(
    `${API_BASE}/auth/status?session_id=${encodeURIComponent(sessionId)}`
  );
  if (!res.ok) throw new Error(`Auth status check failed: ${res.status}`);
  return res.json();
}

/**
 * Build the URL that initiates the Google OAuth flow.
 * The backend will redirect back to returnPath after auth.
 */
export function getGoogleAuthUrl(sessionId: string, returnPath: string = '/calendar'): string {
  return `${API_BASE}/auth/google?session_id=${encodeURIComponent(sessionId)}&return_path=${encodeURIComponent(returnPath)}`;
}

/**
 * List upcoming Google Calendar events.
 */
export async function listCalendarEvents(
  sessionId: string,
  opts: { maxResults?: number; timeMin?: string; timeMax?: string } = {}
): Promise<ListEventsResult> {
  const params = new URLSearchParams({ session_id: sessionId });
  if (opts.maxResults) params.set('max_results', String(opts.maxResults));
  if (opts.timeMin) params.set('time_min', opts.timeMin);
  if (opts.timeMax) params.set('time_max', opts.timeMax);

  const res = await fetch(`${API_BASE}/calendar/events?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to list events: ${res.status}`);
  }
  return res.json();
}

/**
 * Create a Google Calendar event.
 */
export async function createCalendarEvent(
  sessionId: string,
  data: {
    title: string;
    start_datetime: string; // ISO format e.g. "2026-04-05T14:00:00"
    end_datetime: string;
    description?: string;
  }
): Promise<CreateEventResult> {
  const res = await fetch(`${API_BASE}/calendar/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create event: ${res.status}`);
  }
  return res.json();
}

/**
 * Delete a Google Calendar event by ID.
 */
export async function deleteCalendarEvent(
  sessionId: string,
  eventId: string
): Promise<DeleteEventResult> {
  const res = await fetch(
    `${API_BASE}/calendar/events/${encodeURIComponent(eventId)}?session_id=${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete event: ${res.status}`);
  }
  return res.json();
}
