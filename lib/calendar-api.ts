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

        // Add Google Meet for meeting type events
        if (data.type === "meeting") {
            eventBody.conferenceData = {
                createRequest: {
                    requestId: `meet-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`,
                    conferenceSolutionKey: {
                        key: "hangoutsMeet",
                    },
                },
            };
        }

        const url = new URL(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        );
        if (data.type === "meeting") {
            url.searchParams.set("conferenceDataVersion", "1");
        }

        const res = await fetch(url.toString(), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${providerToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(eventBody),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            const errorMsg = errorData?.error?.message || `HTTP ${res.status}`;
            console.error("[createCalendarEvent] Google API Error:", errorMsg, errorData);
            throw new Error(`Google API Error: ${errorMsg}`);
        }

        const result = await res.json();
        return {
            success: true,
            event_id: result.id,
            link: result.htmlLink,
            title: result.summary,
            start: result.start?.dateTime,
            end: result.end?.dateTime,
        };
    } catch (error: any) {
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
