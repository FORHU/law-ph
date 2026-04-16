import { createClient } from "@/lib/supabase/client";

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

export async function getAvailableConferenceSolutions() {
    const supabase = createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const providerToken =
        session?.provider_token || session?.user?.user_metadata?.provider_token;

    if (!providerToken) {
        console.log("[getAvailableConferenceSolutions] No provider token");
        return null;
    }

    try {
        const res = await fetch(
            "https://www.googleapis.com/calendar/v3/users/me/calendarSettings",
            {
                headers: {
                    Authorization: `Bearer ${providerToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (res.ok) {
            const settings = await res.json();
            console.log("[getAvailableConferenceSolutions] Calendar settings:", settings);
        }

        // Try to get conference list from a calendar list
        const calendarRes = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary",
            {
                headers: {
                    Authorization: `Bearer ${providerToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (calendarRes.ok) {
            const cal = await calendarRes.json();
            console.log("[getAvailableConferenceSolutions] Primary calendar:", cal);
        }
    } catch (error) {
        console.error("[getAvailableConferenceSolutions] Error:", error);
    }
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
): Promise<CalendarAuthStatus> {
    const supabase = createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const providerToken =
        session?.provider_token || session?.user?.user_metadata?.provider_token;
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
    // Use Next.js auth page since we migrated to Supabase frontend direct OAuth
    return `/auth/login?redirect=${returnPath}`;
}

/**
 * List upcoming Google Calendar events.
 */
export async function listCalendarEvents(
    sessionId: string,
    opts: { maxResults?: number; timeMin?: string; timeMax?: string } = {},
): Promise<ListEventsResult> {
    const supabase = createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const providerToken =
        session?.provider_token || session?.user?.user_metadata?.provider_token;
    if (!providerToken) return { success: false, needs_auth: true };

    try {
        const url = new URL(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        );
        if (opts.maxResults)
            url.searchParams.set("maxResults", String(opts.maxResults));
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
    },
): Promise<CreateEventResult> {
    const supabase = createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const providerToken =
        session?.provider_token || session?.user?.user_metadata?.provider_token;
    if (!providerToken) return { success: false, needs_auth: true };

    try {
        const eventBody: any = {
            summary: data.title,
            description: data.description,
            start: { dateTime: data.start_datetime },
            end: { dateTime: data.end_datetime },
        };

        console.log('[createCalendarEvent] Creating event:', data.title);
        console.log('[createCalendarEvent] Type:', data.type);

        // Add Google Meet template link for meeting type events
        if (data.type === "meeting") {
            const meetTemplate = "\n\n📞 Google Meet: https://meet.google.com/new";
            eventBody.description = (eventBody.description || "") + meetTemplate;
            console.log('[createCalendarEvent] Added Meet template link to description');
        }

        const url = new URL(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
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

        if (!res.ok) {
            let errorMsg = `HTTP ${res.status}`;
            try {
                const errorData = JSON.parse(responseText);
                errorMsg = errorData?.error?.message || errorData?.message || errorMsg;
                console.error("[createCalendarEvent] Full error response:", errorData);
                console.error("[createCalendarEvent] Error:", errorMsg);
            } catch (e) {
                console.error("[createCalendarEvent] Error response:", responseText);
            }
            throw new Error(errorMsg);
        }

        const result = JSON.parse(responseText);
        console.log('[createCalendarEvent] ✅ Event created:', result.id);

        return {
            success: true,
            event_id: result.id,
            link: result.htmlLink,
            title: result.summary,
            start: result.start?.dateTime,
            end: result.end?.dateTime,
        };
    } catch (error: any) {
        console.error('[createCalendarEvent] ❌ Error:', error.message);
        return { success: false, error: error.message };
    }
}

export async function deleteCalendarEvent(
    sessionId: string,
    eventId: string,
): Promise<DeleteEventResult> {
    const supabase = createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const providerToken =
        session?.provider_token || session?.user?.user_metadata?.provider_token;
    if (!providerToken) return { success: false, needs_auth: true };

    try {
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            {
                method: "DELETE",
                headers: { Authorization: `Bearer ${providerToken}` },
            },
        );

        if (!res.ok && res.status !== 404)
            throw new Error(`Google API Error: ${res.status}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
