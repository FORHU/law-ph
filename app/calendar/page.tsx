"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    Plus,
    X,
    ArrowLeft,
    Menu,
    Clock,
    User,
    Search,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    History,
    RefreshCw,
    AlertCircle,
    Loader2,
    XCircle,
    Check,
    Link as LinkIcon,
} from "lucide-react";
import { PageLayout } from "@/components/ui/page-layout";
import { useConversations } from "@/components/conversation-provider/conversation-context";
import { useAuth } from "@/components/auth/auth-provider";
import { ASSETS } from "@/lib/constants";
import {
    checkAuthStatus,
    getGoogleAuthUrl,
    listCalendarEvents,
    createCalendarEvent,
    deleteCalendarEvent,
    type GoogleCalendarEvent,
} from "@/lib/calendar-api";

// ── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
    id: string;
    title: string;
    type: "meeting" | "appointment" | "hearing" | "deposition";
    date_time: string; // Used by Supabase
    dateTime?: string; // Used by Google (will normalize to date_time)
    client_email?: string;
    clientEmail?: string;
    notes?: string;
    googleLink?: string;
    isGoogleEvent?: boolean;
    status: "draft" | "pending" | "confirmed" | "requested_change" | "rejected";
    client_feedback?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, { badge: string; dot: string }> = {
    meeting: {
        badge: "bg-blue-500/10 text-white border-blue-500/30",
        dot: "bg-blue-400",
    },
    appointment: {
        badge: "bg-purple-500/10 text-white border-purple-500/30",
        dot: "bg-purple-400",
    },
    hearing: {
        badge: "bg-amber-500/10 text-white border-amber-500/30",
        dot: "bg-amber-400",
    },
    deposition: {
        badge: "bg-red-500/10 text-white border-red-500/30",
        dot: "bg-red-400",
    },
};
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDT(dt: string | undefined) {
    if (!dt) return "";
    try {
        return new Date(dt).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        return dt;
    }
}

/** Get the minimum datetime allowed (current datetime in datetime-local format) */
function getMinDateTime(): string {
    const now = new Date();
    // Format: YYYY-MM-DDTHH:mm using local timezone
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const StatusBadge = ({ status }: { status: CalendarEvent["status"] }) => {
    const configs = {
        draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
        pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        requested_change: "bg-red-500/10 text-red-400 border-red-500/20",
        rejected: "bg-red-900/40 text-red-400 border-red-500/30",
    };
    return (
        <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${configs[status || "draft"]}`}
        >
            {status === "pending"
                ? "Invitation Sent"
                : status === "requested_change"
                    ? "Change Requested"
                    : status || "draft"}
        </span>
    );
};

/** Infer an event type from Google Calendar description text */
function inferEventType(
    description?: string,
    title?: string,
): CalendarEvent["type"] {
    const text = `${title ?? ""} ${description ?? ""}`.toLowerCase();
    if (text.includes("hearing")) return "hearing";
    if (text.includes("deposition")) return "deposition";
    if (text.includes("appointment")) return "appointment";
    return "meeting";
}

/** Map a raw Google Calendar event to our CalendarEvent shape */
function mapGoogleEvent(e: GoogleCalendarEvent): CalendarEvent {
    const start = e.start || "";
    return {
        id: e.id,
        title: e.title,
        type: inferEventType(e.description, e.title),
        date_time: start,
        dateTime: start,
        notes: e.description ?? undefined,
        googleLink: e.link ?? undefined,
        isGoogleEvent: true,
        status: "confirmed",
    };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isSidebarOpen, setIsSidebarOpen } = useConversations();
    const { supabase, session, loggedIn } = useAuth();
    const userId = session?.user?.id;

    // ── State ──────────────────────────────────────────────────────────────────

    const [now, setNow] = useState(new Date());

    // Update 'now' periodically to keep filters/grid fresh
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // every minute
        return () => clearInterval(timer);
    }, []);

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"upcoming" | "rejected" | "accomplished">(
        "upcoming",
    );
    const [showAll, setShowAll] = useState(false);
    const [panelView, setPanelView] = useState<"list" | "details" | "create">("list");
    const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>(
        [],
    );
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    // Action state
    const [pendingAction, setPendingAction] = useState<
        "cancel" | "reschedule" | null
    >(null);
    const [actionReason, setActionReason] = useState("");
    const [actionEventId, setActionEventId] = useState<string | number | null>(
        null,
    );
    const [editingEventId, setEditingEventId] = useState<
        string | number | null
    >(null);

    // Mobile Responsive state
    const [activeMobileTab, setActiveMobileTab] = useState<
        "calendar" | "agenda"
    >("calendar");
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

    const [form, setForm] = useState({
        title: "",
        type: "meeting" as CalendarEvent["type"],
        dateTime: "",
        clientEmail: "",
        notes: "",
    });

    const openCreateModal = useCallback((day?: number) => {
        const target = new Date();
        if (day) {
            target.setFullYear(viewYear);
            target.setMonth(viewMonth);
            target.setDate(day);

            // If the selected day is today, keep the current hours/mins.
            // If it's a future day, default to 9:00 AM or just keep current time.
            const nowRef = new Date();
            if (target < nowRef) {
                target.setHours(nowRef.getHours(), nowRef.getMinutes());
            }
        }

        // Final sanity check: ensure we don't pre-fill a past time even by seconds
        const finalNow = new Date();
        if (target < finalNow) {
            target.setTime(finalNow.getTime());
        }

        const y = target.getFullYear();
        const m = String(target.getMonth() + 1).padStart(2, "0");
        const d = String(target.getDate()).padStart(2, "0");
        const hh = String(target.getHours()).padStart(2, "0");
        const mm = String(target.getMinutes()).padStart(2, "0");

        setForm({
            title: "",
            type: "meeting",
            dateTime: `${y}-${m}-${d}T${hh}:${mm}`,
            clientEmail: "",
            notes: "",
        });
        setEditingEventId(null);
        setCreateError(null);
        setActionReason("");
        setPanelView("create");
    }, [viewYear, viewMonth]);

    const [emailInput, setEmailInput] = useState("");
    const [emailError, setEmailError] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const validateEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleAddEmail = (val: string) => {
        const email = val.trim().replace(/,$/, "");
        if (!email) return;

        if (validateEmail(email)) {
            const currentList = form.clientEmail
                ? form.clientEmail
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean)
                : [];
            if (!currentList.includes(email)) {
                setForm((f) => ({
                    ...f,
                    clientEmail: [...currentList, email].join(", "),
                }));
            }
            setEmailInput("");
            setEmailError(false);
        } else {
            setEmailError(true);
        }
    };

    const removeEmail = (index: number) => {
        const currentList = form.clientEmail
            ? form.clientEmail
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean)
            : [];
        currentList.splice(index, 1);
        setForm((f) => ({ ...f, clientEmail: currentList.join(", ") }));
    };

    // Google Calendar auth state
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);

    // Workflow states
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    // ── Data Fetching ──────────────────────────────────────────────────────────

    // Fetch events from Supabase
    const fetchEvents = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .eq("user_id", userId)
                .order("date_time", { ascending: true });

            if (error) {
                console.error("Error fetching events:", error.message);
            } else if (data) {
                // Normalize fields for consumption
                const normalized = data.map((e: any) => ({
                    ...e,
                    dateTime: e.date_time,
                    clientEmail: e.client_email,
                    status: e.status || "draft",
                }));
                setEvents(normalized);
            }
        } catch (err) {
            console.error("Unexpected error fetching events:", err);
        } finally {
            setIsLoading(false);
        }
    }, [userId, supabase]);

    // Load Google Calendar events
    const loadGoogleEvents = useCallback(async (sessId: string) => {
        setIsLoadingEvents(true);
        setEventsError(null);
        try {
            const result = await listCalendarEvents(sessId, { maxResults: 50 });
            if (result.needs_auth) {
                setIsGoogleConnected(false);
                return;
            }
            if (result.success && result.events) {
                const mapped = result.events.map(mapGoogleEvent);
                // Merge with existing events (avoiding duplicates by ID)
                setEvents((prev) => {
                    const existingIds = new Set(prev.map((e) => e.id));
                    const newEvents = mapped.filter(
                        (e) => !existingIds.has(e.id),
                    );
                    return [...prev, ...newEvents];
                });
                setIsGoogleConnected(true);
            } else {
                setEventsError(result.error ?? "Failed to load Google events.");
            }
        } catch (err: any) {
            setEventsError(err.message ?? "Failed to load Google events.");
        } finally {
            setIsLoadingEvents(false);
        }
    }, []);

    const registerWebhook = useCallback(async () => {
        // Use NEXT_PUBLIC_WEBHOOK_URL in dev (your ngrok URL).
        // In production this falls back to the current origin automatically.
        const base =
            process.env.NEXT_PUBLIC_WEBHOOK_URL || window.location.origin;
        const webhookUrl = `${base}/api/webhooks/calendar`;
        try {
            await fetch("/api/calendar/watch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ webhookUrl }),
            });
        } catch (err) {
            console.error("[calendar] Failed to register webhook:", err);
        }
    }, []);

    const checkGoogleAuth = useCallback(
        async (sessId: string) => {
            setIsCheckingAuth(true);
            try {
                const status = await checkAuthStatus(sessId);
                setIsGoogleConnected(status.authenticated);
                if (status.authenticated) {
                    await loadGoogleEvents(sessId);
                    await registerWebhook();
                }
            } catch {
                setIsGoogleConnected(false);
            } finally {
                setIsCheckingAuth(false);
            }
        },
        [loadGoogleEvents, registerWebhook],
    );

    useEffect(() => {
        if (loggedIn && userId) {
            fetchEvents();

            const authSuccess = searchParams.get("auth_success");
            if (authSuccess === "true") {
                router.replace("/calendar", { scroll: false });
            }
            checkGoogleAuth(userId);
        }
    }, [loggedIn, userId, fetchEvents, checkGoogleAuth, searchParams, router]);

    // Automatic conflict check for the Calendar Form
    useEffect(() => {
        if (!form.dateTime || !userId || panelView !== "create") {
            setConflictWarning(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                // Calculate overlap range (e.g., 59 minutes before/after)
                const checkTime = new Date(form.dateTime);
                if (isNaN(checkTime.getTime())) return;

                const startRange = new Date(
                    checkTime.getTime() - 59 * 60 * 1000,
                ).toISOString();
                const endRange = new Date(
                    checkTime.getTime() + 59 * 60 * 1000,
                ).toISOString();

                let query = supabase
                    .from("events")
                    .select("id, title, date_time")
                    .eq("user_id", userId)
                    .gte("date_time", startRange)
                    .lte("date_time", endRange)
                    .neq("status", "cancelled");

                if (editingEventId) {
                    query = query.neq("id", editingEventId);
                }

                const { data: conflicts } = await query.limit(1);

                if (conflicts && conflicts.length > 0) {
                    const conflictTime = new Date(
                        conflicts[0].date_time,
                    ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                    });
                    setConflictWarning(
                        `Overlap detected: You already have "${conflicts[0].title}" at ${conflictTime}.`,
                    );
                } else {
                    setConflictWarning(null);
                }
            } catch (err) {
                console.error("Conflict check failed:", err);
            }
        }, 200); // 200ms for instant feel

        return () => clearTimeout(timer);
    }, [form.dateTime, userId, editingEventId, panelView, supabase]);

    // ── Derived lists ──────────────────────────────────────────────────────────

    const upcomingEvents = useMemo(
        () =>
            events
                .filter(
                    (e) =>
                        e.status !== "rejected" &&
                        new Date(e.date_time || e.dateTime || "").getTime() >=
                        now.getTime(),
                )
                .sort((a, b) =>
                    (a.date_time || a.dateTime || "").localeCompare(
                        b.date_time || b.dateTime || "",
                    ),
                ),
        [events],
    );

    const rejectedEvents = useMemo(
        () =>
            events
                .filter((e) => e.status === "rejected")
                .sort((a, b) =>
                    (b.date_time || b.dateTime || "").localeCompare(
                        a.date_time || a.dateTime || "",
                    ),
                ),
        [events],
    );

    const accomplishedEvents = useMemo(
        () =>
            events
                .filter(
                    (e) =>
                        e.status !== "rejected" &&
                        new Date(e.date_time || e.dateTime || "").getTime() <
                        now.getTime(),
                )
                .sort((a, b) =>
                    (b.date_time || b.dateTime || "").localeCompare(
                        a.date_time || a.dateTime || "",
                    ),
                ),
        [events],
    );

    const activeList =
        activeTab === "upcoming"
            ? upcomingEvents
            : activeTab === "rejected"
                ? rejectedEvents
                : accomplishedEvents;

    const filteredList = useMemo(
        () =>
            searchQuery.trim()
                ? activeList.filter(
                    (e) =>
                        e.title
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                        (e.type || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                        (e.client_email || e.clientEmail || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                )
                : activeList,
        [activeList, searchQuery],
    );

    const visibleList = showAll ? filteredList : filteredList.slice(0, 5);
    const hasMore = filteredList.length > 5;

    // ── Calendar grid ──────────────────────────────────────────────────────────

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const eventDatesThisMonth = new Set(
        events
            .filter((e) => {
                const d = new Date(e.date_time || e.dateTime || "");
                return (
                    d.getMonth() === viewMonth && d.getFullYear() === viewYear
                );
            })
            .map((e) => new Date(e.date_time || e.dateTime || "").getDate()),
    );

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!form.title || !form.dateTime || !userId) return;
        setSubmitting(true);
        setCreateError(null);

        try {
            // 0. Validate that the selected date/time is not in the past (minute precision)
            const selectedDateTime = new Date(form.dateTime);
            const currentDateTime = new Date();

            // Normalize to minute to avoid sub-minute comparison issues
            selectedDateTime.setSeconds(0, 0);
            currentDateTime.setSeconds(0, 0);

            if (selectedDateTime < currentDateTime) {
                setCreateError("Cannot schedule events for past times. Please select a future date and time.");
                setSubmitting(false);
                return;
            }

            // 1. Check for conflicts before saving
            const { data: conflicts } = await supabase
                .from("events")
                .select("id, title, date_time")
                .eq("user_id", userId)
                .eq("date_time", form.dateTime)
                .neq("id", editingEventId || "none")
                .neq("status", "cancelled");

            if (conflicts && conflicts.length > 0 && !conflictWarning) {
                setConflictWarning(
                    `Overlap detected: You already have "${conflicts[0].title}" scheduled at this time.`,
                );
                setSubmitting(false);
                return;
            }

            // 2. Prepare event data object
            const eventData = {
                user_id: userId,
                title: form.title,
                type: form.type,
                date_time: form.dateTime,
                client_email: form.clientEmail,
                notes: `${form.notes}${actionReason ? `\n\n[Rescheduled: ${actionReason}]` : ""}`,
                status: "draft",
            };

            // 3. Save to Supabase (Update or Insert)
            let result;
            if (editingEventId) {
                result = await supabase
                    .from("events")
                    .update(eventData)
                    .eq("id", editingEventId)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from("events")
                    .insert(eventData)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            const createdEventId = result.data.id;
            let finalStatus = result.data.status || "draft";
            let gLink = result.data.googleLink || "";

            // Auto-send if there's a client email
            if (form.clientEmail) {
                // Sync to Google Calendar
                if (isGoogleConnected) {
                    const start = new Date(form.dateTime);
                    const end = new Date(start.getTime() + 60 * 60 * 1000);

                    const gResult = await createCalendarEvent(userId, {
                        title: form.title,
                        start_datetime: start.toISOString(),
                        end_datetime: end.toISOString(),
                        description: form.notes,
                        type: form.type,
                    });
                    if (gResult.success) {
                        gLink = gResult.link || "";
                    } else {
                        console.error(
                            "[Calendar] Google Calendar sync failed:",
                            gResult.error,
                        );
                    }
                }

                // Trigger Email API
                await fetch("/api/send-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: form.clientEmail,
                        type: "schedule",
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        eventDetails: {
                            eventId: createdEventId,
                            eventType: form.type,
                            dateTime: new Date(form.dateTime).toISOString(),
                            notes: form.notes,
                        },
                        organizer: {
                            name:
                                session?.user?.user_metadata?.full_name ||
                                session?.user?.email,
                            email: session?.user?.email,
                        },
                    }),
                });

                // Update DB to pending
                finalStatus = "pending";
                await supabase
                    .from("events")
                    .update({ status: finalStatus, googleLink: gLink || null })
                    .eq("id", createdEventId);
            }

            // 4. Update local state
            const normalizedEvent = {
                ...result.data,
                dateTime: result.data.date_time,
                clientEmail: result.data.client_email,
                status: finalStatus,
                googleLink: gLink,
            };

            if (editingEventId) {
                setEvents((prev) =>
                    prev.map((e) =>
                        e.id === editingEventId ? normalizedEvent : e,
                    ),
                );
            } else {
                setEvents((prev) => [...prev, normalizedEvent]);
            }

            // 5. Success feedback and close
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setPanelView("list");
                setEditingEventId(null);
                setActionReason("");
                setForm({
                    title: "",
                    type: "meeting",
                    dateTime: "",
                    clientEmail: "",
                    notes: "",
                });
                setConflictWarning(null);
            }, 1500);
        } catch (err: any) {
            console.error("Error saving event:", err.message || err);
            setCreateError(err.message || "Unexpected error.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelConfirm = async () => {
        if (!actionEventId || !actionReason || !userId) return;
        setSubmitting(true);

        try {
            // If it's a Google event, delete it there first
            const eventToDelete = events.find((e) => e.id === actionEventId);
            if (eventToDelete?.isGoogleEvent) {
                await deleteCalendarEvent(userId, String(actionEventId));
            }

            // Delete from Supabase
            const { error } = await supabase
                .from("events")
                .delete()
                .eq("id", actionEventId);

            if (error) throw error;

            setEvents((prev) => prev.filter((e) => e.id !== actionEventId));
            setSelectedDayEvents((prev) =>
                prev.filter((e) => e.id !== actionEventId),
            );

            setSubmitting(false);
            setPendingAction(null);
            setActionEventId(null);
            setActionReason("");

            if (selectedDayEvents.length <= 1) {
                setPanelView("list");
            }
        } catch (err: any) {
            console.error("Error canceling event:", err.message || err);
            setSubmitting(false);
        }
    };

    const handleDeleteEvent = async (eventId: string | number) => {
        if (!userId) return;
        try {
            const eventToDelete = events.find((e) => e.id === eventId);
            if (eventToDelete?.isGoogleEvent) {
                await deleteCalendarEvent(userId, String(eventId));
            }

            await supabase.from("events").delete().eq("id", eventId);

            setEvents((prev) => prev.filter((e) => e.id !== eventId));
        } catch (err: any) {
            console.error("[Calendar] delete error:", err);
        }
    };

    const handleConnectGoogle = () => {
        if (!userId) return;
        window.location.href = getGoogleAuthUrl(userId, "/calendar");
    };

    const handleRefresh = () => {
        if (userId && isGoogleConnected) {
            loadGoogleEvents(userId);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <PageLayout
            activePage="calendar"
            title="Calendar"
            subtitle="Legal appointments and hearings"
            headerActions={
                <div className="flex items-center gap-2">
                    {isGoogleConnected && (
                        <button
                            onClick={handleRefresh}
                            disabled={isLoadingEvents}
                            className="flex items-center gap-1.5 text-gray-400 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-all text-sm"
                            title="Refresh from Google Calendar"
                        >
                            <RefreshCw
                                size={14}
                                className={
                                    isLoadingEvents ? "animate-spin" : ""
                                }
                            />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    )}
                    <button
                        onClick={() => openCreateModal()}
                        className="flex items-center gap-2 bg-[#8B4564] hover:bg-[#9D5373] text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
                    >
                        <Plus size={16} /> Create Schedule
                    </button>
                </div>
            }
            maxWidth="max-w-7xl"
        >
            <div className="flex flex-col md:flex-row flex-1 h-full relative z-10 overflow-hidden">
                {/* Mobile View Toggle */}
                <div className="md:hidden flex-shrink-0 px-5 pt-4 pb-2 border-b border-white/5 bg-black/20">
                    <div className="bg-[#2A2A2A] p-1 rounded-xl flex items-center gap-1">
                        <button
                            onClick={() => setActiveMobileTab("calendar")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeMobileTab === "calendar"
                                ? "bg-[#8B4564] text-white shadow-lg"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            <Calendar size={14} /> Calendar
                        </button>
                        <button
                            onClick={() => setActiveMobileTab("agenda")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeMobileTab === "agenda"
                                ? "bg-[#8B4564] text-white shadow-lg"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            <Clock size={14} /> Events
                        </button>
                    </div>
                </div>

                {/* LEFT — Calendar Grid */}
                <div
                    className={`${activeMobileTab === "calendar" ? "flex" : "hidden md:flex"} flex-col flex-1 border-r border-white/5 overflow-y-auto p-4 md:p-5`}
                >
                    <div className="bg-[#2A2A2A]/70 backdrop-blur border border-white/5 rounded-2xl p-5">
                        {/* Google Auth Banner */}
                        {!isCheckingAuth && !isGoogleConnected && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-4 rounded-xl border border-[#8B4564]/40 bg-[#8B4564]/10 p-4 flex items-start gap-3"
                            >
                                <div className="p-1.5 bg-[#8B4564]/20 rounded-lg flex-shrink-0">
                                    <Calendar
                                        size={16}
                                        className="text-[#E0A7C2]"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white">
                                        Connect Google Calendar
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Sync your events and let the AI schedule
                                        directly to your calendar.
                                    </p>
                                </div>
                                <button
                                    onClick={handleConnectGoogle}
                                    className="flex-shrink-0 flex items-center gap-1.5 bg-[#8B4564] hover:bg-[#9D5373] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                >
                                    <LinkIcon size={12} /> Connect
                                </button>
                            </motion.div>
                        )}

                        {isCheckingAuth && (
                            <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                                <Loader2 size={12} className="animate-spin" />{" "}
                                Checking Google Calendar…
                            </div>
                        )}

                        {isGoogleConnected && !isCheckingAuth && (
                            <div className="mb-4 flex items-center gap-1.5 text-xs text-emerald-400">
                                <CheckCircle size={12} /> Google Calendar
                                connected
                            </div>
                        )}

                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-5">
                            <button
                                onClick={() => {
                                    const d = new Date(viewYear, viewMonth - 1);
                                    setViewMonth(d.getMonth());
                                    setViewYear(d.getFullYear());
                                }}
                                className="p-2 hover:bg-white/5 rounded-xl transition-all"
                            >
                                <ArrowLeft
                                    size={16}
                                    className="text-gray-400"
                                />
                            </button>
                            <h2 className="font-bold text-white text-sm">
                                {MONTHS[viewMonth]} {viewYear}
                            </h2>
                            <button
                                onClick={() => {
                                    const d = new Date(viewYear, viewMonth + 1);
                                    setViewMonth(d.getMonth());
                                    setViewYear(d.getFullYear());
                                }}
                                className="p-2 hover:bg-white/5 rounded-xl transition-all"
                            >
                                <ArrowLeft
                                    size={16}
                                    className="text-gray-400 rotate-180"
                                />
                            </button>
                        </div>

                        {/* Day labels */}
                        <div className="grid grid-cols-7 mb-2">
                            {DAYS.map((d) => (
                                <div
                                    key={d}
                                    className="text-center text-[10px] font-bold text-gray-500 pb-2"
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const isToday =
                                    day === now.getDate() &&
                                    viewMonth === now.getMonth() &&
                                    viewYear === now.getFullYear();
                                const isPast =
                                    viewYear < now.getFullYear() ||
                                    (viewYear === now.getFullYear() &&
                                        viewMonth < now.getMonth()) ||
                                    (viewYear === now.getFullYear() &&
                                        viewMonth === now.getMonth() &&
                                        day < now.getDate());

                                const dayEvents = events.filter((e) => {
                                    const d = new Date(e.date_time || e.dateTime || "");
                                    return (
                                        d.getDate() === day &&
                                        d.getMonth() === viewMonth &&
                                        d.getFullYear() === viewYear
                                    );
                                });

                                return (
                                    <div
                                        key={day}
                                        onClick={() => {
                                            if (dayEvents.length > 0) {
                                                setSelectedDayEvents(dayEvents);
                                                setSelectedDay(day);
                                                setPanelView("details");
                                            } else if (!isPast) {
                                                openCreateModal(day);
                                            }
                                        }}
                                        className={`min-h-[80px] lg:min-h-[100px] flex flex-col items-stretch p-1.5 rounded-xl text-xs transition-all border
                                            ${isPast
                                                ? (dayEvents.length > 0 ? "opacity-40 cursor-pointer border-white/5" : "opacity-30 cursor-not-allowed border-transparent")
                                                : "cursor-pointer"
                                            }
                                            ${isToday && !isPast
                                                ? "bg-[#8B4564]/10 border-[#8B4564]/40"
                                                : !isPast && dayEvents.length > 0
                                                    ? "bg-white/[0.02] border-white/5 hover:bg-white/5"
                                                    : !isPast
                                                        ? "hover:bg-white/5 border-transparent"
                                                        : ""
                                            }`}
                                    >
                                        <span className={`text-[10px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0
                                            ${isToday ? "bg-[#8B4564] text-white" : "text-gray-500"}`}
                                        >
                                            {day}
                                        </span>
                                        <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                                            {dayEvents.slice(0, 3).map((evt) => (
                                                <div
                                                    key={evt.id}
                                                    className={`px-1.5 py-0.5 rounded text-[9px] truncate font-medium leading-tight border ${EVENT_COLORS[evt.type]?.badge || "bg-white/10 text-gray-300 border-white/10"}`}
                                                    title={evt.title}
                                                >
                                                    {evt.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <span className="text-[8px] text-gray-500 font-medium pl-1">
                                                    +{dayEvents.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="mt-5 flex flex-wrap gap-2">
                            {Object.entries(EVENT_COLORS).map(([type, c]) => (
                                <span
                                    key={type}
                                    className="flex items-center gap-1.5 text-[10px] text-gray-400 capitalize"
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${c.dot}`}
                                    />
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT — Events Panel */}
                <div
                    className={`${activeMobileTab === "agenda" ? "flex" : "hidden md:flex"} flex-col overflow-hidden w-full md:w-[360px] xl:w-[420px] flex-shrink-0 bg-black/10 border-l border-white/5 transition-all`}
                >
                    {panelView === "list" && (
                        <>
                            {/* Mobile: Google auth banner */}
                            {!isCheckingAuth && !isGoogleConnected && (
                                <div className="md:hidden mx-4 mt-4 rounded-xl border border-[#8B4564]/40 bg-[#8B4564]/10 p-3 flex items-center gap-3">
                                    <Calendar
                                        size={14}
                                        className="text-[#E0A7C2] flex-shrink-0"
                                    />
                                    <p className="text-xs text-gray-300 flex-1">
                                        Connect Google Calendar to sync events.
                                    </p>
                                    <button
                                        onClick={handleConnectGoogle}
                                        className="text-xs font-bold text-[#E0A7C2] hover:text-white transition-colors flex-shrink-0"
                                    >
                                        Connect →
                                    </button>
                                </div>
                            )}

                            {/* Tabs + Search */}
                            <div className="flex-shrink-0 px-5 pt-5 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => {
                                            setActiveTab("upcoming");
                                            setShowAll(false);
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "upcoming"
                                            ? "bg-[#8B4564] text-white shadow-lg"
                                            : "text-gray-400 hover:bg-white/5"
                                            }`}
                                    >
                                        <Clock size={14} /> Upcoming{" "}
                                        <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full ml-1">
                                            {upcomingEvents.length}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveTab("rejected");
                                            setShowAll(false);
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "rejected"
                                            ? "bg-red-500/20 border border-red-500/30 text-red-300"
                                            : "text-gray-400 hover:bg-white/5"
                                            }`}
                                    >
                                        <XCircle size={14} /> Rejected{" "}
                                        <span className="text-xs bg-red-500/20 px-1.5 py-0.5 rounded-full text-red-400 ml-1">
                                            {rejectedEvents.length}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveTab("accomplished");
                                            setShowAll(false);
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "accomplished"
                                            ? "text-emerald-400 font-bold"
                                            : "text-gray-400 hover:bg-white/5"
                                            }`}
                                    >
                                        <History size={14} /> Accomplished{" "}
                                        <span className="text-xs bg-emerald-500/20 px-1.5 py-0.5 rounded-full text-emerald-400 ml-1">
                                            {accomplishedEvents.length}
                                        </span>
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <Search
                                        size={14}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search events..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowAll(false);
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#8B4564]/50 focus:ring-1 focus:ring-[#8B4564]/30 placeholder:text-gray-600 transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Loading spinner */}
                            {(isLoadingEvents || isLoading) && (
                                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                                    <Loader2 size={16} className="animate-spin" />{" "}
                                    Loading events…
                                </div>
                            )}

                            {/* Error state */}
                            {eventsError && !isLoadingEvents && (
                                <div className="mx-5 mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                    <AlertCircle
                                        size={14}
                                        className="flex-shrink-0 mt-0.5"
                                    />
                                    <span>{eventsError}</span>
                                </div>
                            )}

                            {/* Events List */}
                            {!isLoadingEvents && (
                                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                    <AnimatePresence mode="popLayout">
                                        {isLoading ? (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center py-20"
                                            >
                                                <Loader2
                                                    size={32}
                                                    className="text-[#E0A7C2] animate-spin mx-auto mb-4"
                                                />
                                                <p className="text-sm text-gray-500">
                                                    Loading your schedule...
                                                </p>
                                            </motion.div>
                                        ) : visibleList.length === 0 ? (
                                            <motion.div
                                                key="empty"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center py-16"
                                            >
                                                <div className="inline-flex p-4 bg-[#8B4564]/10 rounded-full mb-3">
                                                    {activeTab === "accomplished" ? (
                                                        <CheckCircle
                                                            size={28}
                                                            className="text-emerald-400"
                                                        />
                                                    ) : (
                                                        <Calendar
                                                            size={28}
                                                            className="text-[#E0A7C2]"
                                                        />
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-400 font-medium">
                                                    {searchQuery
                                                        ? `No results for "${searchQuery}"`
                                                        : activeTab === "upcoming"
                                                            ? "No upcoming events"
                                                            : "No accomplished events yet"}
                                                </p>
                                            </motion.div>
                                        ) : (
                                            visibleList.map((event, idx) => (
                                                <motion.div
                                                    key={event.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -8 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    className={`bg-[#2A2A2A]/70 backdrop-blur border rounded-2xl p-4 hover:border-white/10 transition-all group cursor-pointer ${activeTab === "accomplished"
                                                        ? "border-white/5 opacity-75"
                                                        : "border-white/5"
                                                        }`}
                                                    onClick={() => {
                                                        setSelectedDayEvents([event]);
                                                        setSelectedDay(new Date(event.date_time || event.dateTime || "").getDate());
                                                        setPanelView("details");
                                                    }}
                                                >
                                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                                        <span
                                                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${EVENT_COLORS[event.type].dot}`}
                                                        />
                                                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                            <h3 className="font-medium text-white text-base truncate pr-4 leading-tight">
                                                                {event.title}
                                                            </h3>

                                                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                                <StatusBadge
                                                                    status={activeTab === "accomplished" ? "confirmed" : (event.status || "pending")}
                                                                />
                                                                <span
                                                                    className={`text-[10px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded-md border ${EVENT_COLORS[event.type].badge}`}
                                                                >
                                                                    {event.type}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col gap-1 mt-2 text-gray-400">
                                                                <p className="text-[13px] flex items-center gap-1.5">
                                                                    <Clock
                                                                        size={13}
                                                                        className="opacity-70 text-[#E0A7C2]"
                                                                    />{" "}
                                                                    {formatDT(event.date_time || event.dateTime)}
                                                                </p>
                                                                {(event.client_email || event.clientEmail) && (
                                                                    <p className="text-[13px] flex items-center gap-1.5">
                                                                        <User
                                                                            size={13}
                                                                            className="opacity-70 text-[#E0A7C2]"
                                                                        />{" "}
                                                                        {event.client_email || event.clientEmail}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {event.isGoogleEvent && activeTab === "upcoming" && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteEvent(event.id);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-500 hover:text-red-400 rounded-lg"
                                                                title="Delete"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>

                                    {/* Show more / less */}
                                    {hasMore && !searchQuery && (
                                        <button
                                            onClick={() => setShowAll(!showAll)}
                                            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-gray-400 hover:text-white border border-white/5 hover:border-white/10 rounded-xl transition-all"
                                        >
                                            {showAll ? (
                                                <>
                                                    <ChevronUp size={14} /> Show Less
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown size={14} /> Show{" "}
                                                    {filteredList.length - 5} More
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {panelView === "details" && (
                        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
                            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-white/5 bg-black/10">
                                <button
                                    onClick={() => setPanelView("list")}
                                    className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-all bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10"
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>
                                <div className="text-right">
                                    <h2 className="text-sm font-bold text-white">Day Details</h2>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                                        {selectedDay || "?"} {MONTHS[viewMonth]} {viewYear}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {selectedDayEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="bg-[#2A2A2A]/40 backdrop-blur border border-white/5 rounded-2xl p-5 space-y-4 relative overflow-hidden group shadow-xl"
                                    >
                                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${EVENT_COLORS[event.type || "meeting"].dot}`} />

                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-white text-base leading-tight mb-1">
                                                    {event.title}
                                                </h3>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                                                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                                        <Clock size={13} className="text-[#E0A7C2]" />
                                                        {formatDT(event.date_time || event.dateTime)}
                                                    </p>
                                                    {(event.client_email || event.clientEmail) && (
                                                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                                            <User size={13} className="text-[#E0A7C2]" />
                                                            {event.client_email || event.clientEmail}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${EVENT_COLORS[event.type || "meeting"].badge}`}>
                                                {event.type}
                                            </span>
                                        </div>

                                        {event.notes && (
                                            <div className="pt-2 border-t border-white/5">
                                                <p className="text-xs text-gray-400 italic leading-relaxed whitespace-pre-wrap">
                                                    {event.notes}
                                                </p>
                                            </div>
                                        )}

                                        <div className="pt-3 border-t border-white/5">
                                            {pendingAction && actionEventId === event.id ? (
                                                <div className="space-y-3 bg-[#E0A7C2]/5 rounded-xl p-3 border border-[#E0A7C2]/20">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#E0A7C2]">
                                                        Reason for {pendingAction === "cancel" ? "Cancellation" : "Rescheduling"}
                                                    </label>
                                                    <textarea
                                                        autoFocus
                                                        value={actionReason}
                                                        onChange={(e) => setActionReason(e.target.value)}
                                                        placeholder={`Enter reason...`}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#E0A7C2]/50 resize-none h-16"
                                                    />
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <button
                                                            onClick={() => { setPendingAction(null); setActionReason(""); }}
                                                            className="text-[10px] font-bold text-gray-500 hover:text-white"
                                                        >
                                                            Back
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (pendingAction === "cancel") handleCancelConfirm();
                                                                else {
                                                                    setEditingEventId(event.id);
                                                                    const dt = event.date_time || event.dateTime || "";
                                                                    setForm({
                                                                        title: event.title,
                                                                        type: event.type as CalendarEvent["type"],
                                                                        dateTime: dt.slice(0, 16),
                                                                        clientEmail: event.client_email || event.clientEmail || "",
                                                                        notes: event.notes || "",
                                                                    });
                                                                    setPanelView("create");
                                                                    setPendingAction(null);
                                                                }
                                                            }}
                                                            disabled={!actionReason || submitting}
                                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${!actionReason ? "bg-white/5 text-gray-600" : "bg-[#E0A7C2] text-black hover:bg-white"}`}
                                                        >
                                                            {submitting ? "..." : `Confirm`}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => { setPendingAction("reschedule"); setActionEventId(event.id); }}
                                                        className="text-[10px] font-bold px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                                                    >
                                                        Reschedule
                                                    </button>
                                                    <button
                                                        onClick={() => { setPendingAction("cancel"); setActionEventId(event.id); }}
                                                        className="text-[10px] font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {panelView === "create" && (
                        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
                            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-white/5 bg-black/10">
                                <button
                                    onClick={() => setPanelView("list")}
                                    className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-all bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10"
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>
                                <div className="text-right">
                                    <h2 className="text-sm font-bold text-white">
                                        {editingEventId ? "Reschedule" : "Create Schedule"}
                                    </h2>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                {editingEventId && (
                                    <div className="p-4 bg-[#8B4564]/10 border border-[#8B4564]/20 rounded-2xl">
                                        <label className="block text-xs font-bold text-[#E0A7C2] uppercase tracking-widest mb-2">
                                            Reschedule Reason *
                                        </label>
                                        <textarea
                                            placeholder="Briefly explain why..."
                                            value={actionReason}
                                            onChange={(e) => setActionReason(e.target.value)}
                                            rows={2}
                                            className="w-full bg-black/40 border border-[#8B4564]/30 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8B4564]/60 placeholder:text-gray-600 resize-none"
                                        />
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Event Title *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Legal Consultation"
                                            value={form.title}
                                            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8B4564]/50 placeholder:text-gray-600 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="relative">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Type</label>
                                            <div
                                                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                                                className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none hover:border-[#8B4564]/50 cursor-pointer transition-all focus:ring-2 focus:ring-[#8B4564]/20"
                                            >
                                                <span className="capitalize">{form.type}</span>
                                                <ChevronDown size={16} className={`transition-transform duration-200 text-white/60 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                                            </div>

                                            <AnimatePresence>
                                                {typeDropdownOpen && (
                                                    <>
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                                            className="absolute z-50 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden"
                                                        >
                                                            {["meeting", "appointment", "hearing", "deposition"].map((t) => (
                                                                <div
                                                                    key={t}
                                                                    onClick={() => {
                                                                        setForm(f => ({ ...f, type: t as CalendarEvent["type"] }));
                                                                        setTypeDropdownOpen(false);
                                                                    }}
                                                                    className={`px-4 py-3 text-sm cursor-pointer transition-all capitalize flex items-center justify-between
                                                                        ${form.type === t ? "bg-[#8B4564]/20 text-white font-semibold" : "text-white/80 hover:bg-white/5 hover:text-white"}
                                                                    `}
                                                                >
                                                                    {t}
                                                                    {form.type === t && <Check size={14} strokeWidth={2} className="text-[#E0A7C2]" />}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                        {/* Invisible backdrop to catch outside clicks */}
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={(e) => { e.stopPropagation(); setTypeDropdownOpen(false); }}
                                                        />
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Date & Time *</label>
                                            <input
                                                type="datetime-local"
                                                min={getMinDateTime()}
                                                value={form.dateTime}
                                                onChange={(e) => setForm(f => ({ ...f, dateTime: e.target.value }))}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8B4564]/50 [color-scheme:dark] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Client Emails</label>
                                        <div className="flex flex-wrap gap-2 p-3 bg-black/40 border border-white/10 rounded-xl min-h-[50px] focus-within:border-[#8B4564]/50 transition-all">
                                            <AnimatePresence>
                                                {(form.clientEmail ? form.clientEmail.split(",").map(e => e.trim()).filter(Boolean) : []).map((email, idx) => (
                                                    <motion.div key={email} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-1.5 bg-[#8B4564]/10 border border-[#8B4564]/30 text-[#E0A7C2] px-2.5 py-1 rounded-lg text-xs font-medium">
                                                        <span>{email}</span>
                                                        <button onClick={() => removeEmail(idx)} className="hover:text-white transition-colors"><X size={12} /></button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            <input
                                                type="text"
                                                placeholder={!form.clientEmail ? "Add email + space" : ""}
                                                value={emailInput}
                                                onChange={(e) => {
                                                    setEmailInput(e.target.value);
                                                    if (e.target.value.endsWith(",") || e.target.value.endsWith(" ")) handleAddEmail(e.target.value);
                                                }}
                                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEmail(emailInput); } }}
                                                className="flex-1 bg-transparent text-sm text-white outline-none min-w-[120px] placeholder:text-gray-600"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Notes</label>
                                        <textarea
                                            placeholder="Agenda or special instructions..."
                                            value={form.notes}
                                            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                                            rows={3}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8B4564]/50 placeholder:text-gray-600 resize-none transition-all"
                                        />
                                    </div>

                                    {createError && (
                                        <div className="flex items-start gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                            <AlertCircle size={16} className="flex-shrink-0" />
                                            <span>{createError}</span>
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <button
                                            onClick={handleSave}
                                            disabled={submitting}
                                            className="w-full bg-[#8B4564] hover:bg-[#9D5373] text-white font-bold py-4 rounded-xl shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 group overflow-hidden relative"
                                        >
                                            {submitting ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <>
                                                    {editingEventId ? "Save Changes" : "Confirm Schedule"}
                                                    <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
