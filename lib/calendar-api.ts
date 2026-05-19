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
  attendees?: any[];
  status?: string;
  iCalUID?: string;
  organizer?: { email?: string; displayName?: string };
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
  iCalUID?: string;
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

export async function checkAuthStatus(
  sessionId: string,
  providerToken?: string | null,
): Promise<CalendarAuthStatus> {
  return {
    session_id: sessionId,
    authenticated: !!providerToken,
    service: "google",
  };
}

export function getGoogleAuthUrl(
  sessionId: string,
  returnPath: string = "/calendar",
): string {
  return `/auth/login?redirect=${returnPath}`;
}

export async function listCalendarEvents(
  sessionId: string,
  opts: { maxResults?: number; timeMin?: string; timeMax?: string } = {},
  providerToken?: string | null,
): Promise<ListEventsResult> {
  if (!providerToken) return { success: false, needs_auth: true };

  try {
    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    );
    url.searchParams.set(
      "fields",
      "items(id,summary,description,location,start,end,htmlLink,attendees(email,responseStatus,organizer),status,iCalUID,organizer)",
    );
    url.searchParams.set("singleEvents", "true");
    if (opts.maxResults) url.searchParams.set("maxResults", String(opts.maxResults));
    if (opts.timeMin) url.searchParams.set("timeMin", opts.timeMin);
    if (opts.timeMax) url.searchParams.set("timeMax", opts.timeMax);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    if (!res.ok) throw new Error(`Google API Error: ${res.status}`);
    const data = await res.json();
    const events = (data.items || []).map((i: any) => ({
      id: i.id,
      title: i.summary || "Untitled",
      start: i.start?.dateTime || i.start?.date,
      description: i.description,
      link: i.htmlLink,
      attendees: i.attendees,
      status: i.status,
      iCalUID: i.iCalUID,
      organizer: i.organizer,
    }));
    return { success: true, events, count: events.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCalendarEvent(
  sessionId: string,
  data: {
    title: string;
    start_datetime: string;
    end_datetime: string;
    description?: string;
    type?: "meeting" | "appointment" | "hearing" | "deposition";
    client_email?: string;
    clientEmail?: string;
  },
  providerToken?: string | null,
): Promise<CreateEventResult> {
  if (!providerToken) return { success: false, needs_auth: true };

  try {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventBody: any = {
      summary: data.title,
      description: data.description,
      start: { dateTime: data.start_datetime, timeZone: userTimeZone },
      end: { dateTime: data.end_datetime, timeZone: userTimeZone },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 1440 },
          { method: "popup", minutes: 60 },
        ],
      },
    };

    const clientEmailStr = data.clientEmail || data.client_email;
    if (clientEmailStr) {
      eventBody.attendees = clientEmailStr
        .split(",")
        .map((e: string) => ({ email: e.trim() }));
    }

    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
    );

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    const responseText = await res.text();

    if (res.status === 401) {
      console.error("[createCalendarEvent] 401 Unauthorized - Token may be expired.");
      return { success: false, needs_auth: true };
    }

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData?.error?.message || errorData?.message || errorMsg;
      } catch (e) {
        console.error("[createCalendarEvent] Error response:", responseText);
      }
      throw new Error(errorMsg);
    }

    const result = JSON.parse(responseText);
    return {
      success: true,
      event_id: result.id,
      iCalUID: result.iCalUID,
      link: result.htmlLink,
      title: result.summary,
      start: result.start?.dateTime,
      end: result.end?.dateTime,
    };
  } catch (error: any) {
    console.error("[createCalendarEvent] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function updateCalendarEvent(
  sessionId: string,
  googleEventId: string,
  data: {
    title: string;
    start_datetime: string;
    end_datetime: string;
    description?: string;
    type?: "meeting" | "appointment" | "hearing" | "deposition";
    client_email?: string;
    clientEmail?: string;
  },
  providerToken?: string | null,
): Promise<CreateEventResult> {
  if (!providerToken) return { success: false, needs_auth: true };

  try {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventBody: any = {
      summary: data.title,
      description: data.description,
      start: { dateTime: data.start_datetime, timeZone: userTimeZone },
      end: { dateTime: data.end_datetime, timeZone: userTimeZone },
    };

    const clientEmailStr = data.clientEmail || data.client_email;
    if (clientEmailStr) {
      eventBody.attendees = clientEmailStr.split(',').map((e: string) => ({ email: e.trim() }));
    }

    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}?sendUpdates=none`,
    );

    const res = await fetch(url.toString(), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${providerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    const responseText = await res.text();
    if (res.status === 401) return { success: false, needs_auth: true };
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData?.error?.message || errorData?.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const result = JSON.parse(responseText);
    return {
      success: true,
      event_id: result.id,
      iCalUID: result.iCalUID,
      link: result.htmlLink,
      title: result.summary,
      start: result.start?.dateTime,
      end: result.end?.dateTime,
    };
  } catch (error: any) {
    console.error('[updateCalendarEvent] Error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteCalendarEvent(
  sessionId: string,
  googleEventId: string,
  providerToken?: string | null,
): Promise<DeleteEventResult> {
  if (!providerToken) return { success: false, needs_auth: true };

  try {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}?sendUpdates=all`,
    );

    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    if (res.status === 401) return { success: false, needs_auth: true };
    if (res.status === 204 || res.status === 410 || res.status === 404 || res.ok) {
      return { success: true, event_id: googleEventId };
    }

    const responseText = await res.text();
    let errorMsg = `HTTP ${res.status}`;
    try {
      const errorData = JSON.parse(responseText);
      errorMsg = errorData?.error?.message || errorData?.message || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  } catch (error: any) {
    console.error('[deleteCalendarEvent] Error:', error.message);
    return { success: false, error: error.message };
  }
}
