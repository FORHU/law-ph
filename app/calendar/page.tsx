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
    CheckCircle2,
    Trash2,
    XCircle,
    Check,
    Link as LinkIcon,
    Bell,
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
    google_link?: string;
    google_event_id?: string;
    isGoogleEvent?: boolean;
    status: "pending" | "confirmed" | "requested_change" | "denied" | "tentative";
    client_feedback?: string;
    iCalUID?: string;
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

const StatusBadge = ({ status, isPast }: { status: CalendarEvent["status"]; isPast?: boolean }) => {
    const configs = {
        pending: isPast ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20",
        confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        requested_change: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        denied: "bg-red-900/40 text-red-400 border-red-500/30",
        tentative: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };

    let label = status as string;
    if (status === "pending") label = isPast ? "Client Missed" : "Invitation Sent";
    if (status === "tentative") label = "Tentative";
    if (status === "denied") label = "Denied";
    if (status === "confirmed") label = isPast ? "Done" : "Confirmed";
    if (status === "requested_change") label = "Change Requested";


    return (
        <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${configs[status || "pending"]}`}
        >
            {label}
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

function mapGoogleEvent(e: GoogleCalendarEvent): CalendarEvent {
    const start = e.start || "";
    // STRICT RULE: Only monitor the people invited (Guests), ignore the Law Firm (Organizer)
    const organizerEmail = e.organizer?.email;
    const guestList = (e.attendees || []).filter((a: any) =>
        !a.organizer && a.email !== organizerEmail
    );
    const clientEmail = guestList.map((a: any) => a.email).join(", ");

    // CRITICAL DEBUG: Check this in your F12 Console!
    console.log(`[Google Sync] "${e.title}" | Organizer: ${organizerEmail} | Guests:`, guestList.map(g => `${g.email}: ${g.responseStatus}`));

    // Determine status from attendees (focus on any non-organizer guest)
    let status: "confirmed" | "tentative" | "denied" | "pending" = "confirmed";
    if (guestList.length > 0) {
        // Priority 1: If anyone accepted, it's confirmed
        const anyAccepted = guestList.some(a => a.responseStatus === "accepted");
        const allDeclined = guestList.every(a => a.responseStatus === "declined");
        const anyTentative = guestList.some(a => a.responseStatus === "tentative");

        if (anyAccepted) status = "confirmed";
        else if (allDeclined) status = "denied";
        else if (anyTentative) status = "tentative";
        else status = "pending";
    }

    return {
        id: e.id,
        google_event_id: e.id,
        title: e.title,
        type: inferEventType(e.description, e.title),
        date_time: start,
        dateTime: start,
        notes: e.description ?? undefined,
        googleLink: e.link ?? undefined,
        isGoogleEvent: true,
        status: status,
        iCalUID: e.iCalUID, // Crucial for RSVP syncing in reminders!
        clientEmail: clientEmail || undefined,
        client_email: clientEmail || undefined,
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
    const [activeTab, setActiveTab] = useState<"pending" | "upcoming" | "accomplished" | "denied">(
        "pending",
    );
    const [showAll, setShowAll] = useState(false);
    const [panelView, setPanelView] = useState<"list" | "details" | "create">("list");
    const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>(
        [],
    );
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    // Action state
    const [pendingAction, setPendingAction] = useState<
        "cancel" | "reschedule" | "delete" | null
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
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Success Modal State
    const [successModal, setSuccessModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: "success" | "delete" | "info";
    }>({
        isOpen: false,
        title: "",
        message: "",
        type: "success"
    });

    const openSuccess = (title: string, message: string, type: "success" | "delete" | "info" = "success") => {
        setSuccessModal({ isOpen: true, title, message, type });
        // Auto close after 3.5 seconds
        setTimeout(() => setSuccessModal(prev => ({ ...prev, isOpen: false })), 3500);
    };

    /**
     * Premium Success Modal
     */
    const SuccessNotification = () => (
        <AnimatePresence>
            {successModal.isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
                >
                    <div className="bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4 overflow-hidden">
                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${successModal.type === 'delete' ? 'bg-red-500/20 text-red-400' :
                            successModal.type === 'info' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#8B4564]/20 text-[#E0A7C2]'
                            }`}>
                            {successModal.type === 'delete' ? <Trash2 size={24} /> :
                                successModal.type === 'info' ? <Calendar size={24} /> : <CheckCircle2 size={24} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm truncate">{successModal.title}</h3>
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{successModal.message}</p>
                        </div>
                        <button
                            onClick={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
                        >
                            <X size={16} />
                        </button>

                        {/* Progress Bar (Nested inside for overflow clipping) */}
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 3.5, ease: "linear" }}
                            className={`h-[3px] absolute bottom-0 left-0 right-0 rounded-b-2xl ${successModal.type === 'delete' ? 'bg-red-500' :
                                successModal.type === 'info' ? 'bg-blue-500' : 'bg-[#8B4564]'
                                }`}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

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
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
                    status: e.status || "pending",
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
                // Merge with existing events — avoid duplicates by ID AND by title+time
                setEvents((prev) => {
                    const sbEvents = prev.filter(e => !e.isGoogleEvent);

                    // Create maps for IDs and Title+Time keys
                    const sbIdMap = new Map();
                    const sbKeyMap = new Map();

                    sbEvents.forEach(e => {
                        if (e.google_event_id) sbIdMap.set(e.google_event_id, e);

                        const t = new Date(e.date_time || e.dateTime || "").getTime();
                        const rounded = Math.round(t / 300000) * 300000;
                        const eTitle = (e.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
                        const key = `${eTitle}|${rounded}`;
                        sbKeyMap.set(key, e);
                    });

                    const mappedKeys = new Set();
                    const mappedGoogleIds = new Set();

                    // Priority 1: ID Match (Most Reliable)
                    const newGoogleEvents = mapped.map(ge => {
                        let localMatch = sbIdMap.get(ge.google_event_id);

                        // Priority 2: Title + Time Match
                        if (!localMatch) {
                            const t = new Date(ge.date_time || ge.dateTime || "").getTime();
                            const rounded = Math.round(t / 300000) * 300000;
                            const geTitle = (ge.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
                            const key = `${geTitle}|${rounded}`;
                            localMatch = sbKeyMap.get(key);
                        }

                        if (localMatch) {
                            mappedGoogleIds.add(ge.google_event_id);

                            const t = new Date(localMatch.date_time || localMatch.dateTime || "").getTime();
                            const rounded = Math.round(t / 300000) * 300000;
                            const eTitle = (localMatch.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
                            mappedKeys.add(`${eTitle}|${rounded}`);

                            return {
                                ...localMatch,
                                status: ge.status,
                                google_event_id: ge.google_event_id,
                                googleLink: ge.googleLink,
                                iCalUID: ge.iCalUID,
                                isGoogleEvent: true,
                                clientEmail: localMatch.client_email || localMatch.clientEmail || ge.clientEmail,
                                client_email: localMatch.client_email || localMatch.clientEmail || ge.client_email,
                            };
                        }
                        return ge;
                    });

                    // Only keep Supabase events that weren't matched via ID or Key
                    const remainingSb = sbEvents.filter(e => {
                        if (e.google_event_id && mappedGoogleIds.has(e.google_event_id)) return false;

                        const t = new Date(e.date_time || e.dateTime || "").getTime();
                        const rounded = Math.round(t / 300000) * 300000;
                        const eTitle = (e.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
                        const key = `${eTitle}|${rounded}`;
                        if (mappedKeys.has(key)) return false;

                        return true;
                    });

                    // Combine and ensure absolute uniqueness by ID
                    const combined = [...remainingSb, ...newGoogleEvents];
                    const uniqueMap = new Map();
                    combined.forEach(e => {
                        if (!uniqueMap.has(e.id) || e.isGoogleEvent) {
                            uniqueMap.set(e.id, e);
                        }
                    });

                    return Array.from(uniqueMap.values());
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

    // ── Realtime Sync ──────────────────────────────────────────────────────────
    // Listen for any INSERT/UPDATE/DELETE on the events table so that events
    // created from the Schedule tab (or anywhere else) appear instantly here.
    useEffect(() => {
        if (!userId || !supabase) return;

        const channel = supabase
            .channel(`calendar-events-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "events",
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    // Re-fetch the full list on any change
                    fetchEvents();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, supabase, fetchEvents]);

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
                        e.status === "confirmed" &&
                        new Date(e.date_time || e.dateTime || "").getTime() >=
                        now.getTime(),
                )
                .sort((a, b) =>
                    (a.date_time || a.dateTime || "").localeCompare(
                        b.date_time || b.dateTime || "",
                    ),
                ),
        [events, now],
    );

    const pendingEvents = useMemo(
        () =>
            events
                .filter(
                    (e) =>
                        (e.status === "pending" || e.status === "requested_change" || e.status === "tentative") &&
                        new Date(e.date_time || e.dateTime || "").getTime() >=
                        now.getTime(),
                )
                .sort((a, b) =>
                    (a.date_time || a.dateTime || "").localeCompare(
                        b.date_time || b.dateTime || "",
                    ),
                ),
        [events, now],
    );

    const deniedEvents = useMemo(
        () =>
            events
                .filter((e) => e.status === "denied")
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
                        e.status === "confirmed" &&
                        new Date(e.date_time || e.dateTime || "").getTime() <
                        now.getTime(),
                )
                .sort((a, b) =>
                    (b.date_time || b.dateTime || "").localeCompare(
                        a.date_time || a.dateTime || "",
                    ),
                ),
        [events, now],
    );

    const activeList =
        activeTab === "upcoming"
            ? upcomingEvents
            : activeTab === "pending"
                ? pendingEvents
                : activeTab === "denied"
                    ? deniedEvents
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
        if (!userId) return;

        // 0. Collect ALL validation errors at once
        const errors: string[] = [];
        setCreateError(null);

        if (!form.title.trim()) {
            errors.push("Event title is required.");
        }

        if (!form.dateTime) {
            errors.push("Please select a date and time.");
        } else {
            const selectedDateTime = new Date(form.dateTime);
            const currentDateTime = new Date();
            selectedDateTime.setSeconds(0, 0);
            currentDateTime.setSeconds(0, 0);
            if (selectedDateTime < currentDateTime) {
                errors.push("Cannot schedule events for past times. Please select a future date and time.");
            }
        }

        if (pendingAction === "reschedule" && !actionReason.trim()) {
            errors.push("Please provide a reason for rescheduling.");
        }

        if (!form.notes.trim()) {
            errors.push("Description/Notes are required to help prepare for the meeting.");
        }

        const emails = form.clientEmail ? form.clientEmail.split(",").map(e => e.trim()).filter(Boolean) : [];
        if (emails.length === 0) {
            errors.push("At least one client email is required.");
        } else {
            for (const email of emails) {
                if (!validateEmail(email)) {
                    errors.push(`Invalid email address detected: ${email}`);
                }
            }
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        // If all validation passes, proceed with submission
        setValidationErrors([]);
        setSubmitting(true);

        try {

            // 1. Check for conflicts before saving (use time range for overlap)
            const checkTime = new Date(form.dateTime);
            const startRange = new Date(checkTime.getTime() - 59 * 60 * 1000).toISOString();
            const endRange = new Date(checkTime.getTime() + 59 * 60 * 1000).toISOString();

            let conflictQuery = supabase
                .from("events")
                .select("id, title, date_time")
                .eq("user_id", userId)
                .gte("date_time", startRange)
                .lte("date_time", endRange)
                .neq("status", "cancelled");

            if (editingEventId) {
                conflictQuery = conflictQuery.neq("id", editingEventId);
            }

            const { data: conflicts } = await conflictQuery.limit(1);

            if (conflicts && conflicts.length > 0 && !conflictWarning) {
                const conflictTime = new Date(conflicts[0].date_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                setConflictWarning(
                    `Overlap detected: You already have "${conflicts[0].title}" at ${conflictTime}. Click "Confirm Schedule" again to proceed anyway.`,
                );
                setSubmitting(false);
                return;
            }

            // 2. Prepare event data object
            const eventData = {
                user_id: userId,
                title: form.title,
                type: form.type,
                date_time: new Date(form.dateTime).toISOString(),
                client_email: form.clientEmail,
                notes: `${form.notes}${actionReason ? `\n\n[Rescheduled: ${actionReason}]` : ""}`,
                status: "pending",
            };

            // 3. Save to Supabase (Update or Insert)
            let result;
            const isGoogleId = typeof editingEventId === 'string' && editingEventId.length > 20 && !editingEventId.includes('-');

            if (editingEventId) {
                if (isGoogleId) {
                    // Try to update by google_event_id first - WRAP in try/catch for missing column
                    try {
                        result = await supabase
                            .from("events")
                            .update(eventData)
                            .eq("google_event_id", editingEventId)
                            .select()
                            .single();

                        if (result.error || !result.data) {
                            // Try insert, but omit the google_event_id if it's likely the cause of failure
                            result = await supabase
                                .from("events")
                                .insert(eventData)
                                .select()
                                .single();
                        }
                    } catch (e) {
                        // Total fallback: just insert as a new event if DB is out of sync
                        result = await supabase
                            .from("events")
                            .insert(eventData)
                            .select()
                            .single();
                    }
                } else {
                    result = await supabase
                        .from("events")
                        .update(eventData)
                        .eq("id", editingEventId)
                        .select()
                        .single();
                }
            } else {
                result = await supabase
                    .from("events")
                    .insert(eventData)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            const createdEventId = result.data.id;
            let gLink = result.data.googleLink || "";

            // Auto-send if there's a client email
            if (form.clientEmail) {
                // Sync to Google Calendar
                let iCalUID: string | undefined;
                let googleEventId: string | undefined;
                if (isGoogleConnected) {
                    const start = new Date(form.dateTime);
                    const end = new Date(start.getTime() + 60 * 60 * 1000);

                    const gResult = await createCalendarEvent(userId, {
                        title: form.title,
                        start_datetime: start.toISOString(),
                        end_datetime: end.toISOString(),
                        description: form.notes,
                        type: form.type,
                        client_email: form.clientEmail,
                    });
                    if (gResult.success) {
                        gLink = gResult.link || "";
                        iCalUID = gResult.iCalUID;
                        googleEventId = gResult.event_id;
                    } else if (gResult.needs_auth) {
                        setIsGoogleConnected(false);
                        setCreateError("Google Calendar session expired. Please reconnect.");
                        console.error("[Calendar] Google session expired.");
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
                            iCalUID: iCalUID,
                        },
                        organizer: {
                            name:
                                session?.user?.user_metadata?.full_name ||
                                session?.user?.email,
                            email: session?.user?.email,
                        },
                    }),
                });

                // Update DB with Google IDs
                if (googleEventId || gLink) {
                    const updatePayload: any = {};
                    if (gLink) updatePayload.google_link = gLink;
                    if (googleEventId) updatePayload.google_event_id = googleEventId;

                    // Update DB with Google IDs - SILENT FAIL if columns are missing
                    try {
                        const { error: finalError } = await supabase
                            .from("events")
                            .update(updatePayload)
                            .eq("id", createdEventId);

                        if (finalError) {

                            console.warn("[Calendar] DB update skip (missing columns?):", finalError.message);
                        }
                    } catch (e) {
                        console.warn("[Calendar] DB update crash (missing columns?):", e);
                    }
                }
            }

            // 4. Update local state
            const normalizedEvent = {
                ...result.data,
                dateTime: result.data.date_time,
                clientEmail: result.data.client_email,
                status: result.data.status,
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
            openSuccess(
                editingEventId ? "Schedule Updated" : "Schedule Created",
                editingEventId ? "Changes have been saved and synced." : "Your new consultation has been scheduled."
            );

            setTimeout(() => {
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
            }, 300);
        } catch (err: any) {
            console.error("Error saving event:", err.message || err);
            setCreateError(err.message || "Unexpected error.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelConfirm = async () => {
        if (!actionEventId || (pendingAction !== 'delete' && !actionReason) || !userId) return;
        setSubmitting(true);

        try {
            // If it's a Google event, delete it there first
            const eventToDelete = events.find((e) => e.id === actionEventId);
            const gId = eventToDelete?.google_event_id || (typeof actionEventId === 'string' && actionEventId.length > 20 ? actionEventId : null);

            if (gId) {
                await deleteCalendarEvent(userId, String(gId));
            }

            // Delete from Supabase
            const isGoogleId = typeof actionEventId === 'string' && actionEventId.length > 20 && !actionEventId.includes('-');

            if (isGoogleId) {
                const { error } = await supabase
                    .from("events")
                    .delete()
                    .eq("google_event_id", actionEventId);

                // FALLBACK: If column doesn't exist or delete fails, try deleting by finding the local match's ID
                if (error && (error.message.includes("google_event_id") || error.code === 'PGRST204')) {
                    const localMatch = events.find(e => e.google_event_id === actionEventId || e.id === actionEventId);
                    if (localMatch && localMatch.id && localMatch.id !== actionEventId) {
                        await supabase.from("events").delete().eq("id", localMatch.id);
                    }
                } else if (error) {
                    throw error;
                }
            } else {
                const { error } = await supabase
                    .from("events")
                    .delete()
                    .eq("id", actionEventId);
                if (error) throw error;
            }

            setEvents((prev) => prev.filter((e) => e.id !== actionEventId));
            setSelectedDayEvents((prev) =>
                prev.filter((e) => e.id !== actionEventId),
            );

            setSubmitting(false);
            setPendingAction(null);
            setActionEventId(null);
            setActionReason("");
            openSuccess(
                pendingAction === 'delete' ? "Record Deleted" : "Event Cancelled",
                pendingAction === 'delete' ? "The event record has been permanently removed." : "The meeting has been removed from all calendars.",
                "delete"
            );

            if (selectedDayEvents.length <= 1) {
                setPanelView("list");
            }
        } catch (err: any) {
            console.error("Error canceling event:", err.message || err);
            setSubmitting(false);
        }
    };

    const handleRemindEvent = async (event: CalendarEvent) => {
        if (!userId) return;

        try {
            // Trigger Email API
            const response = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: event.client_email || event.clientEmail,
                    type: "schedule",
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    eventDetails: {
                        eventId: event.id,
                        eventType: event.type,
                        dateTime: new Date(event.date_time || event.dateTime || "").toISOString(),
                        notes: event.notes,
                        isReminder: true, // Flag this as a follow-up
                        // Use the remembered iCalUID, or fallback to the Google ID
                        iCalUID: (event as any).iCalUID || (typeof event.google_event_id === 'string' ? event.google_event_id : undefined),
                    },
                    organizer: {
                        name: session?.user?.user_metadata?.full_name || session?.user?.email,
                        email: session?.user?.email,
                    },
                }),
            });

            if (response.ok) {
                // Success feedback - you might want a toast system, but for now console and maybe update local state if needed
                openSuccess("Reminder Sent", "The client has been notified via email.");
            } else {
                throw new Error("Failed to send reminder");
            }
        } catch (err) {
            console.error("[Calendar] Remind event failed:", err);
            alert("Failed to send reminder. Please try again.");
        }
    };

    const handleDeleteEvent = async (eventId: string | number) => {
        if (!userId) return;
        try {
            const eventToDelete = events.find((e) => e.id === eventId);
            const gId = eventToDelete?.google_event_id || (typeof eventId === 'string' && eventId.length > 20 ? eventId : null);

            if (gId) {
                await deleteCalendarEvent(userId, String(gId));
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
        <>
            <SuccessNotification />
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
                                            ${isToday ? "bg-[#8B4564] text-white font-bold" : "text-gray-500"}`}
                                            >
                                                {day}
                                            </span>
                                            <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                                                {dayEvents.slice(0, 3).map((evt) => (
                                                    <div
                                                        key={evt.id}
                                                        className={`px-1.5 py-0.5 rounded text-[9px] truncate font-medium leading-tight border ${EVENT_COLORS[evt.type]?.badge || "bg-white/10 text-gray-300 border-white/10"} ${evt.status === "confirmed" && isPast ? "line-through opacity-60" : ""}`}
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
                                                setActiveTab("pending");
                                                setShowAll(false);
                                            }}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "pending"
                                                ? "bg-amber-500/20 border border-amber-500/30 text-amber-300 shadow-lg"
                                                : "text-gray-400 hover:bg-white/5"
                                                }`}
                                        >
                                            <AlertCircle size={14} /> Pending{" "}
                                            <span className="text-xs bg-amber-500/20 px-1.5 py-0.5 rounded-full text-amber-400 ml-1">
                                                {pendingEvents.length}
                                            </span>
                                        </button>
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
                                        <button
                                            onClick={() => {
                                                setActiveTab("denied");
                                                setShowAll(false);
                                            }}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "denied"
                                                ? "bg-red-500/20 border border-red-500/30 text-red-300"
                                                : "text-gray-400 hover:bg-white/5"
                                                }`}
                                        >
                                            <XCircle size={14} /> Denied{" "}
                                            <span className="text-xs bg-red-500/20 px-1.5 py-0.5 rounded-full text-red-400 ml-1">
                                                {deniedEvents.length}
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
                                                                : activeTab === "pending"
                                                                    ? "No pending invitations"
                                                                    : activeTab === "denied"
                                                                        ? "No denied events"
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
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <h3 className={`font-medium text-white text-base truncate pr-4 leading-tight ${activeTab === "accomplished" ? "line-through opacity-50" : ""}`}>
                                                                        {event.title}
                                                                    </h3>
                                                                    {(() => {
                                                                        const evtDate = new Date(event.date_time || event.dateTime || "");
                                                                        const diff = evtDate.getTime() - now.getTime();
                                                                        const isToday = evtDate.getDate() === now.getDate() &&
                                                                            evtDate.getMonth() === now.getMonth() &&
                                                                            evtDate.getFullYear() === now.getFullYear();

                                                                        if (isToday && diff > 0) {
                                                                            const hours = Math.floor(diff / (1000 * 60 * 60));
                                                                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                                            const countdownText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                                                                            return (
                                                                                <span className="flex-shrink-0 bg-red-500/10 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500/30 flex items-center gap-1 animate-pulse">
                                                                                    <Clock size={10} />
                                                                                    IN {countdownText}
                                                                                </span>
                                                                            );
                                                                        }

                                                                        const tomorrow = new Date(now);
                                                                        tomorrow.setDate(now.getDate() + 1);
                                                                        const isTomorrow = evtDate.getDate() === tomorrow.getDate() &&
                                                                            evtDate.getMonth() === tomorrow.getMonth() &&
                                                                            evtDate.getFullYear() === tomorrow.getFullYear();
                                                                        return isTomorrow && (
                                                                            <span className="flex-shrink-0 bg-amber-500/10 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                                                                TOMORROW
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                                    <StatusBadge
                                                                        status={event.status || "pending"}
                                                                        isPast={activeTab === "accomplished"}
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
                                                            {activeTab === "pending" && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemindEvent(event);
                                                                    }}
                                                                    className="transition-all p-2 text-amber-500 hover:text-amber-400 rounded-lg flex items-center gap-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20"
                                                                    title="Send Reminder"
                                                                >
                                                                    <Bell size={14} />
                                                                    <span className="text-[10px] font-bold uppercase tracking-tight">Remind</span>
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
                                            <div className={`absolute top-0 left-0 bottom-0 w-1 h-full ${EVENT_COLORS[event.type || "meeting"].dot}`} />

                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-3 mb-1">
                                                        <h3 className="font-bold text-white text-base leading-tight">
                                                            {event.title}
                                                        </h3>
                                                        {(() => {
                                                            const evtDate = new Date(event.date_time || event.dateTime || "");
                                                            const diff = evtDate.getTime() - now.getTime();
                                                            const isToday = evtDate.getDate() === now.getDate() &&
                                                                evtDate.getMonth() === now.getMonth() &&
                                                                evtDate.getFullYear() === now.getFullYear();

                                                            if (isToday && diff > 0) {
                                                                const hours = Math.floor(diff / (1000 * 60 * 60));
                                                                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                                const countdownText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                                                                return (
                                                                    <span className="flex-shrink-0 bg-red-500/10 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500/30 flex items-center gap-1 animate-pulse">
                                                                        <Clock size={10} />
                                                                        IN {countdownText}
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
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

                                            {/* Missed Event Notice */}
                                            {(() => {
                                                const isEventPast = new Date(event.date_time || event.dateTime || "").getTime() < now.getTime();
                                                const isMissed = isEventPast && (event.status === "pending" || event.status === "tentative");

                                                if (isMissed) {
                                                    return (
                                                        <div className="mt-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                                                            <div className="p-1.5 bg-red-500/20 rounded-lg text-red-400 flex-shrink-0">
                                                                <AlertCircle size={14} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">Client Missed Response</p>
                                                                <p className="text-[10px] text-gray-400/80 mt-0.5 leading-tight">The meeting time passed without an RSVP. We recommend rescheduling to stay connected.</p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            <div className="pt-3 border-t border-white/5">
                                                {pendingAction && actionEventId === event.id ? (
                                                    <div className={`space-y-3 p-3 rounded-xl border animate-in fade-in zoom-in-95 ${(pendingAction === 'cancel' || pendingAction === 'delete')
                                                        ? 'bg-red-500/5 border-red-500/20'
                                                        : 'bg-amber-500/5 border-amber-500/20'
                                                        }`}>
                                                        <label className={`text-[10px] font-bold uppercase tracking-widest ${(pendingAction === 'cancel' || pendingAction === 'delete') ? 'text-red-400' : 'text-amber-400'
                                                            }`}>
                                                            {pendingAction === 'delete' ? 'Confirm Deletion' : `Reason for ${pendingAction === "cancel" ? "Cancellation" : "Rescheduling"}`}
                                                        </label>

                                                        {pendingAction !== 'delete' ? (
                                                            <textarea
                                                                autoFocus
                                                                value={actionReason}
                                                                onChange={(e) => setActionReason(e.target.value)}
                                                                placeholder={`Enter reason...`}
                                                                className={`w-full bg-black/40 border rounded-lg px-3 py-2 text-xs text-white outline-none resize-none h-16 transition-all ${pendingAction === 'cancel'
                                                                    ? 'border-red-500/20 focus:border-red-500/50'
                                                                    : 'border-amber-500/20 focus:border-amber-500/50'
                                                                    }`}
                                                            />
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 leading-tight">
                                                                This action will permanently remove this event from your records. This cannot be undone.
                                                            </p>
                                                        )}

                                                        <div className="flex items-center gap-2 justify-end">
                                                            <button
                                                                onClick={() => { setPendingAction(null); setActionReason(""); }}
                                                                className="text-[10px] font-bold text-gray-500 hover:text-white"
                                                            >
                                                                Back
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (pendingAction === "cancel" || pendingAction === "delete") {
                                                                        setSubmitting(true);
                                                                        await handleCancelConfirm();
                                                                    } else {
                                                                        setEditingEventId(event.id);
                                                                        const dt = event.date_time || event.dateTime || "";
                                                                        const localDate = new Date(dt);
                                                                        const loY = localDate.getFullYear();
                                                                        const loM = String(localDate.getMonth() + 1).padStart(2, "0");
                                                                        const loD = String(localDate.getDate()).padStart(2, "0");
                                                                        const loH = String(localDate.getHours()).padStart(2, "0");
                                                                        const loMin = String(localDate.getMinutes()).padStart(2, "0");
                                                                        const resolvedLocalString = `${loY}-${loM}-${loD}T${loH}:${loMin}`;

                                                                        setForm({
                                                                            title: event.title,
                                                                            type: event.type as CalendarEvent["type"],
                                                                            dateTime: resolvedLocalString,
                                                                            clientEmail: event.client_email || event.clientEmail || "",
                                                                            notes: event.notes || "",
                                                                        });
                                                                        setPanelView("create");
                                                                        setPendingAction(null);
                                                                    }
                                                                }}
                                                                disabled={(pendingAction !== 'delete' && !actionReason) || submitting}
                                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-lg ${(pendingAction !== 'delete' && !actionReason)
                                                                    ? "bg-white/5 text-gray-600 cursor-not-allowed"
                                                                    : (pendingAction === 'cancel' || pendingAction === 'delete')
                                                                        ? "bg-red-500 text-white hover:bg-red-600 active:scale-95"
                                                                        : "bg-amber-500 text-black hover:bg-amber-600 active:scale-95"
                                                                    }`}
                                                            >
                                                                {submitting ? "..." : `Confirm`}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(() => {
                                                            const isEventPast = new Date(event.date_time || event.dateTime || "").getTime() < now.getTime();

                                                            // Confirmed past events (Accomplished) - Show Delete as Icon
                                                            if (isEventPast && event.status === "confirmed") {
                                                                return (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setPendingAction("delete"); setActionEventId(event.id); }}
                                                                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20"
                                                                        title="Delete Record"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                );
                                                            }

                                                            // Unconfirmed/Missed past events - Reschedule or Delete
                                                            if (isEventPast) {
                                                                return (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setPendingAction("reschedule"); setActionEventId(event.id); }}
                                                                            className="text-[10px] font-bold px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-all border border-amber-500/20"
                                                                        >
                                                                            Reschedule
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setPendingAction("delete"); setActionEventId(event.id); }}
                                                                            className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                                                                            title="Delete Record"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }

                                                            // Future events
                                                            return (
                                                                <div className="flex items-center gap-1.5">
                                                                    {(() => {
                                                                        const evtDate = new Date(event.date_time || event.dateTime || "");
                                                                        const isToday = evtDate.getDate() === now.getDate() &&
                                                                            evtDate.getMonth() === now.getMonth() &&
                                                                            evtDate.getFullYear() === now.getFullYear();
                                                                        const tomorrow = new Date(now);
                                                                        tomorrow.setDate(now.getDate() + 1);
                                                                        const isTomorrow = evtDate.getDate() === tomorrow.getDate() &&
                                                                            evtDate.getMonth() === tomorrow.getMonth() &&
                                                                            evtDate.getFullYear() === tomorrow.getFullYear();
                                                                        const isUrgent = isToday || isTomorrow;

                                                                        if (event.status === "pending" || isUrgent) {
                                                                            return (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleRemindEvent(event); }}
                                                                                    className="text-[10px] font-bold px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all border border-amber-500/20 flex items-center gap-1.5"
                                                                                    title="Send Reminder"
                                                                                >
                                                                                    <Bell size={12} /> <span className="hidden sm:inline">Remind</span>
                                                                                </button>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setPendingAction("reschedule"); setActionEventId(event.id); }}
                                                                        className="text-[10px] font-bold px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                                                                    >
                                                                        Reschedule
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setPendingAction("cancel"); setActionEventId(event.id); }}
                                                                        className="text-[10px] font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}

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
                                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
                                                Reschedule Reason *
                                            </label>
                                            <textarea
                                                placeholder="Briefly explain why..."
                                                value={actionReason}
                                                onChange={(e) => setActionReason(e.target.value)}
                                                rows={2}
                                                className="w-full bg-black/40 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 placeholder:text-gray-600 resize-none transition-all"
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
                                                onChange={(e) => {
                                                    setForm(f => ({ ...f, title: e.target.value }));
                                                    setValidationErrors(prev => prev.filter(err => !err.toLowerCase().includes('title')));
                                                }}
                                                className={`w-full bg-black/40 border ${validationErrors.some(e => e.toLowerCase().includes('title')) ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8B4564]/50 placeholder:text-gray-600 transition-all`}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="relative">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Type</label>
                                                <div
                                                    onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                                                    className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none hover:border-[#8B4564]/50 cursor-pointer transition-all"
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
                                                    onChange={(e) => {
                                                        setForm(f => ({ ...f, dateTime: e.target.value }));
                                                        setValidationErrors(prev => prev.filter(err => !err.toLowerCase().includes('date') && !err.toLowerCase().includes('past')));
                                                    }}
                                                    className={`w-full bg-black/40 border ${validationErrors.some(e => e.toLowerCase().includes('date') || e.toLowerCase().includes('past')) ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8B4564]/50 [color-scheme:dark] transition-all`}
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
                                                onChange={(e) => {
                                                    setForm(f => ({ ...f, notes: e.target.value }));
                                                    setValidationErrors(prev => prev.filter(err => !err.toLowerCase().includes('notes')));
                                                }}
                                                rows={3}
                                                className={`w-full bg-black/40 border ${validationErrors.some(e => e.toLowerCase().includes('notes')) ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8B4564]/50 placeholder:text-gray-600 resize-none transition-all`}
                                            />
                                        </div>

                                        <div className="pt-2">
                                            {validationErrors.length > 0 && (
                                                <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                                    <div className="flex items-center gap-2 font-bold">
                                                        <AlertCircle size={14} className="flex-shrink-0" />
                                                        <span>Please fix the following:</span>
                                                    </div>
                                                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                                                        {validationErrors.map((err, i) => (
                                                            <li key={i}>{err}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {createError && validationErrors.length === 0 && (
                                                <div className="flex items-start gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                                    <AlertCircle size={16} className="flex-shrink-0" />
                                                    <span>{createError}</span>
                                                </div>
                                            )}
                                        </div>

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
        </>
    );
}
