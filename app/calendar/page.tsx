"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  updateCalendarEvent,
  deleteCalendarEvent,
  type GoogleCalendarEvent,
} from "@/lib/calendar-api";

// ── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  type: "meeting" | "appointment" | "hearing" | "deposition";
  date_time: string;
  dateTime?: string; // Used by Google (will normalize to date_time)
  client_email?: string;
  clientEmail?: string;
  notes?: string;
  googleLink?: string;
  google_link?: string;
  google_event_id?: string;
  isGoogleEvent?: boolean;
  status:
  | "pending"
  | "confirmed"
  | "requested_change"
  | "denied"
  | "tentative"
  | "cancelled"
  | "canceled";
  client_feedback?: string;
  iCalUID?: string;
  lawyerAcknowledgedAt?: string;
  lastReminderSentAt?: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    username: string;
  };
}

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, { badge: string; dot: string }> = {
  meeting: {
    badge: "bg-[#4338ca]/10 text-[#818cf8] border-[#4338ca]/30",
    dot: "bg-[#4338ca]",
  },
  appointment: {
    badge: "bg-[#d97706]/10 text-[#fbbf24] border-[#d97706]/30",
    dot: "bg-[#d97706]",
  },
  hearing: {
    badge: "bg-[#722f37]/10 text-[#ffb2b8] border-[#722f37]/30",
    dot: "bg-[#722f37]",
  },
  deposition: {
    badge: "bg-[#059669]/10 text-[#34d399] border-[#059669]/30",
    dot: "bg-[#059669]",
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
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const StatusBadge = ({
  status,
  isPast,
}: {
  status: CalendarEvent["status"];
  isPast?: boolean;
}) => {
  const configs = {
    pending: isPast
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : "bg-[#e9c176]/10 text-[#e9c176] border-[#e9c176]/20",
    confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    requested_change: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    denied: "bg-red-500/10 text-red-400 border-red-500/20",
    tentative: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cancelled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    canceled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  let label = status as string;
  if (status === "pending")
    label = isPast ? "Missed" : "Invitation Sent";
  if (status === "tentative") label = isPast ? "Missed" : "Tentative";
  if (status === "denied") label = "Denied";
  if (status === "confirmed") label = isPast ? "Done" : "Confirmed";
  if (status === "requested_change") label = "Change Requested";
  if (status === "cancelled" || status === "canceled") label = "Cancelled";

  return (
    <span
      className={`inline-flex items-center justify-center text-[9px] font-black uppercase tracking-[0.1em] px-2 h-5 rounded-md border ${configs[status || "pending"]}`}
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
  const guestList = (e.attendees || []).filter(
    (a: any) => !a.organizer && a.email !== organizerEmail,
  );
  const clientEmail = guestList.map((a: any) => a.email).join(", ");

  // CRITICAL DEBUG: Check this in your F12 Console!
  console.log(
    `[Google Sync] "${e.title}" | Organizer: ${organizerEmail} | Guests:`,
    guestList.map((g) => `${g.email}: ${g.responseStatus}`),
  );

  // Determine status from attendees (focus on any non-organizer guest)
  let status: "confirmed" | "tentative" | "denied" | "pending" = "confirmed";
  if (guestList.length > 0) {
    // Priority 1: If anyone accepted, it's confirmed
    const anyAccepted = guestList.some((a) => a.responseStatus === "accepted");
    const allDeclined = guestList.every((a) => a.responseStatus === "declined");
    const anyTentative = guestList.some(
      (a) => a.responseStatus === "tentative",
    );

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
  const { user, loggedIn } = useAuth();
  const userId = user?.id;

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
  const [activeTab, setActiveTab] = useState<
    "pending" | "upcoming" | "accomplished" | "denied"
  >("pending");
  const [showAll, setShowAll] = useState(false);
  const [panelView, setPanelView] = useState<"list" | "details" | "create">(
    "list",
  );
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>(
    [],
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Action state
  const [pendingAction, setPendingAction] = useState<
    "cancel" | "reschedule" | null
  >(null);
  const [actionReason, setActionReason] = useState("");
  const [actionEventId, setActionEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Mobile Responsive state
  const [activeMobileTab, setActiveMobileTab] = useState<"calendar" | "agenda">(
    "calendar",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submittingRSVP, setSubmittingRSVP] = useState<string | null>(null);

  // Success Modal State
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const openSuccess = (
    title: string,
    message: string,
    type: "success" | "info" = "success",
  ) => {
    setSuccessModal({ isOpen: true, title, message, type });
    // Auto close after 3.5 seconds
    setTimeout(
      () => setSuccessModal((prev) => ({ ...prev, isOpen: false })),
      3500,
    );
  };

  const [showMobileEventModal, setShowMobileEventModal] = useState(false);

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
          <div className="bg-[#0B0B0C]/90 backdrop-blur-xl border border-[#722f37]/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4 overflow-hidden">
            <div
              className={`p-2.5 rounded-xl flex-shrink-0 ${successModal.type === "info"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-[#722f37]/20 text-[#e9c176]"
                }`}
            >
              {successModal.type === "info" ? (
                <Calendar size={24} />
              ) : (
                <CheckCircle2 size={24} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-white text-sm truncate">
                {successModal.title}
              </h3>
              <p className="text-gray-400 text-[11px] font-medium mt-0.5 line-clamp-2 leading-tight uppercase tracking-wider">
                {successModal.message}
              </p>
            </div>
            <button
              onClick={() =>
                setSuccessModal((prev) => ({ ...prev, isOpen: false }))
              }
              className="p-1 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
            >
              <X size={16} />
            </button>

            {/* Progress Bar (Nested inside for overflow clipping) */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3.5, ease: "linear" }}
              className={`h-[3px] absolute bottom-0 left-0 right-0 rounded-b-2xl ${successModal.type === "info" ? "bg-blue-500" : "bg-[#722f37]"
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

  const openCreateModal = useCallback(
    (day?: number) => {
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
      setActiveMobileTab("agenda");
    },
    [viewYear, viewMonth],
  );

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

  // Fetch events from DB
  const fetchEvents = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/events");
      if (!res.ok) {
        console.error("Error fetching events:", res.status);
        setEventsError("Unable to load events. Retrying...");
        setTimeout(() => fetchEvents(), 3000);
      } else {
        const json = await res.json();
        const data = json.events;
        setEventsError(null);
        // Normalize fields for consumption
        const normalized = data.map((e: any) => ({
          ...e,
          date_time: e.dateTime ? new Date(e.dateTime).toISOString() : null,
          client_email: e.clientEmail,
          status: e.status || "pending",
          lawyerAcknowledgedAt: e.lawyerAcknowledgedAt,
          lastReminderSentAt: e.lastReminderSentAt,
        }));

        // Smart merge: if we already have Google-enriched events, keep their extra data
        setEvents((prev) => {
          const googleMap = new Map();
          prev.filter(e => e.isGoogleEvent).forEach(e => {
            if (e.google_event_id) googleMap.set(e.google_event_id, e);
          });

          return normalized.map((sb: any) => {
            const ge = sb.google_event_id ? googleMap.get(sb.google_event_id) : null;
            if (ge) {
              return { ...ge, ...sb }; // Prefer DB notes but keep Google metadata
            }
            return sb;
          });
        });
      }
    } catch (err) {
      console.error("Unexpected error fetching events:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load Google Calendar events
  const loadGoogleEvents = useCallback(async (sessId: string) => {
    setIsLoadingEvents(true);
    setEventsError(null);
    const providerToken = user?.googleAccessToken;
    try {
      const result = await listCalendarEvents(sessId, { maxResults: 50 }, providerToken);
      if (result.needs_auth) {
        setIsGoogleConnected(false);
        return;
      }
      if (result.success && result.events) {
        const mapped = result.events.map(mapGoogleEvent);
        // Merge with existing events — avoid duplicates by ID AND by title+time
        setEvents((prev) => {
          const sbEvents = prev.filter((e) => !e.isGoogleEvent);

          // Create maps for IDs and Title+Time keys
          const sbIdMap = new Map();
          const sbKeyMap = new Map();

          sbEvents.forEach((e) => {
            if (e.google_event_id) sbIdMap.set(e.google_event_id, e);

            const t = new Date(e.date_time || e.dateTime || "").getTime();
            const rounded = Math.round(t / 300000) * 300000;
            const eTitle = (e.title || "")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            const key = `${eTitle}|${rounded}`;
            sbKeyMap.set(key, e);
          });

          const mappedKeys = new Set();
          const mappedGoogleIds = new Set();

          // Priority 1: ID Match (Most Reliable)
          const newGoogleEvents = mapped.map((ge) => {
            let localMatch = sbIdMap.get(ge.google_event_id);

            // Priority 2: Title + Time Match
            if (!localMatch) {
              const t = new Date(ge.date_time || ge.dateTime || "").getTime();
              const rounded = Math.round(t / 300000) * 300000;
              const geTitle = (ge.title || "")
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
              const key = `${geTitle}|${rounded}`;
              localMatch = sbKeyMap.get(key);
            }

            if (localMatch) {
              mappedGoogleIds.add(ge.google_event_id);

              const t = new Date(
                localMatch.date_time || localMatch.dateTime || "",
              ).getTime();
              const rounded = Math.round(t / 300000) * 300000;
              const eTitle = (localMatch.title || "")
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
              mappedKeys.add(`${eTitle}|${rounded}`);

              return {
                ...localMatch,
                status: ge.status,
                google_event_id: ge.google_event_id,
                googleLink: ge.googleLink,
                iCalUID: ge.iCalUID,
                isGoogleEvent: true,
                clientEmail:
                  localMatch.client_email ||
                  localMatch.clientEmail ||
                  ge.clientEmail,
                client_email:
                  localMatch.client_email ||
                  localMatch.clientEmail ||
                  ge.client_email,
              };
            }
            return ge;
          });

          // Only keep DB events that weren't matched via ID or Key
          const remainingSb = sbEvents.filter((e) => {
            if (e.google_event_id && mappedGoogleIds.has(e.google_event_id))
              return false;

            const t = new Date(e.date_time || e.dateTime || "").getTime();
            const rounded = Math.round(t / 300000) * 300000;
            const eTitle = (e.title || "")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            const key = `${eTitle}|${rounded}`;
            if (mappedKeys.has(key)) return false;

            return true;
          });

          // Combine and ensure absolute uniqueness
          const combined = [...remainingSb, ...newGoogleEvents];
          const uniqueMap = new Map();

          combined.forEach((e) => {
            // Priority: keep the one with google_event_id, then the one with notes
            const key = e.id;
            const existing = uniqueMap.get(key);
            if (!existing) {
              uniqueMap.set(key, e);
            } else {
              // Merge if we somehow have two records for one ID
              uniqueMap.set(key, { ...existing, ...e });
            }
          });

          // Final aggressive deduplication for the display list: 
          // If two events have identical Title + Rounded Time, merge them.
          const finalMap = new Map();
          Array.from(uniqueMap.values()).forEach(e => {
            const t = new Date(e.dateTime || e.date_time || "").getTime();
            const rounded = Math.round(t / 60000) * 60000; // Round to minute
            const title = (e.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const dedupKey = `${title}|${rounded}`;

            const existing = finalMap.get(dedupKey);
            if (!existing) {
              finalMap.set(dedupKey, e);
            } else {
              // Keep the one that is synced to google or has notes
              const preferNew = (!existing.google_event_id && e.google_event_id) || (!existing.notes && e.notes);
              finalMap.set(dedupKey, preferNew ? { ...existing, ...e } : { ...e, ...existing });
            }
          });

          return Array.from(finalMap.values());
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
    const base = process.env.NEXT_PUBLIC_WEBHOOK_URL || window.location.origin;
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
        const status = await checkAuthStatus(sessId, user?.googleAccessToken);
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

      const authSuccess = searchParams?.get("auth_success");
      if (authSuccess === "true") {
        router.replace("/calendar", { scroll: false });
      }
      checkGoogleAuth(userId);
    }
  }, [loggedIn, userId, fetchEvents, checkGoogleAuth, searchParams, router]);

  // fetchEvents is called on mount and after mutations for sync.

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

        const conflictParams = new URLSearchParams({
          startRange,
          endRange,
          excludeStatus: "cancelled",
          limitOne: "true",
          ...(editingEventId ? { excludeId: editingEventId } : {}),
        });
        const conflictRes = await fetch(`/api/events?${conflictParams}`);
        const conflictJson = conflictRes.ok ? await conflictRes.json() : { events: [] };
        const conflicts = conflictJson.events;

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
  }, [form.dateTime, userId, editingEventId, panelView]);

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
            (e.status === "pending" ||
              e.status === "requested_change" ||
              e.status === "tentative") &&
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
            (e.status === "confirmed" ||
              e.status === "pending" ||
              e.status === "tentative" ||
              e.status === "requested_change") &&
            new Date(e.date_time || e.dateTime || "").getTime() < now.getTime(),
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
            e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
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
        errors.push(
          "Cannot schedule events for past times. Please select a future date and time.",
        );
      }
    }

    if (pendingAction === "reschedule" && !actionReason.trim()) {
      errors.push("Please provide a reason for rescheduling.");
    }

    if (!form.notes.trim()) {
      errors.push(
        "Description/Notes are required to help prepare for the meeting.",
      );
    }

    const emails = form.clientEmail
      ? form.clientEmail
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
      : [];
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
      const startRange = new Date(
        checkTime.getTime() - 59 * 60 * 1000,
      ).toISOString();
      const endRange = new Date(
        checkTime.getTime() + 59 * 60 * 1000,
      ).toISOString();

      const conflictSaveParams = new URLSearchParams({
        startRange,
        endRange,
        excludeStatus: "cancelled",
        limitOne: "true",
        ...(editingEventId ? { excludeId: editingEventId } : {}),
      });
      const conflictSaveRes = await fetch(`/api/events?${conflictSaveParams}`);
      const conflictSaveJson = conflictSaveRes.ok ? await conflictSaveRes.json() : { events: [] };
      const conflicts = conflictSaveJson.events;

      if (conflicts && conflicts.length > 0 && !conflictWarning) {
        const conflictTime = new Date(
          conflicts[0].date_time,
        ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

      // 3. Save to DB (Update or Insert)
      let savedEvent: any = null;
      const isGoogleId =
        typeof editingEventId === "string" &&
        editingEventId.length > 20 &&
        !editingEventId.includes("-");

      if (editingEventId) {
        if (isGoogleId) {
          try {
            const r = await fetch(`/api/events/by-google-id/${editingEventId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(eventData),
            });
            if (!r.ok) throw new Error("google-id update failed");
            savedEvent = { id: editingEventId, ...eventData };
          } catch (e) {
            const r = await fetch("/api/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(eventData),
            });
            const j = await r.json();
            savedEvent = j.event;
          }
        } else {
          await fetch(`/api/events/${editingEventId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
          });
          savedEvent = { id: editingEventId, ...eventData };
        }
      } else {
        const r = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        if (!r.ok) throw new Error("Failed to create event");
        const j = await r.json();
        savedEvent = j.event;
      }

      if (!savedEvent) throw new Error("Event save failed");

      const createdEventId = savedEvent.id;
      let gLink = savedEvent.googleLink || "";

      // Auto-send if there's a client email
      if (form.clientEmail) {
        // Sync to Google Calendar
        let iCalUID: string | undefined;
        let googleEventId: string | undefined;

        if (editingEventId) {
          const existing = events.find((e) => e.id === editingEventId);
          iCalUID = (existing as any)?.iCalUID;
          googleEventId = existing?.google_event_id;
        }

        if (isGoogleConnected) {
          const start = new Date(form.dateTime);
          const end = new Date(start.getTime() + 60 * 60 * 1000);

          if (!editingEventId) {
            const gResult = await createCalendarEvent(userId ?? '', {
              title: form.title,
              start_datetime: start.toISOString(),
              end_datetime: end.toISOString(),
              description: form.notes,
              type: form.type,
              client_email: form.clientEmail,
            }, user?.googleAccessToken);
            if (gResult.success) {
              gLink = gResult.link || "";
              iCalUID = gResult.iCalUID;
              googleEventId = gResult.event_id;
            } else if (gResult.needs_auth) {
              setIsGoogleConnected(false);
              setCreateError("Google Calendar session expired. Please reconnect.");
              console.error("[Calendar] Google session expired.");
            } else {
              console.error("[Calendar] Google Calendar sync failed:", gResult.error);
            }
          } else {
            const existingGoogleId = typeof editingEventId === 'string' && editingEventId.length > 20 && !editingEventId.includes('-') ? editingEventId : googleEventId;
            if (existingGoogleId) {
              const gResult = await updateCalendarEvent(userId ?? '', existingGoogleId, {
                title: form.title,
                start_datetime: start.toISOString(),
                end_datetime: end.toISOString(),
                description: form.notes,
                type: form.type,
                client_email: form.clientEmail,
              }, user?.googleAccessToken);
              if (gResult.needs_auth) {
                setIsGoogleConnected(false);
                setCreateError("Google session expired.");
              } else if (!gResult.success) {
                console.error("[Calendar] Google update failed:", gResult.error);
              }
            }
          }
        }
        // Trigger Email API — send 'reschedule' when editing an existing event, 'schedule' for new ones
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: form.clientEmail,
            type: editingEventId ? "reschedule" : "schedule",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            eventDetails: {
              eventId: createdEventId,
              eventType: form.type,
              title: form.title,
              dateTime: new Date(form.dateTime).toISOString(),
              notes: form.notes,
              iCalUID: iCalUID || (googleEventId ? `${googleEventId}@google.com` : undefined),
              ...(editingEventId && actionReason
                ? { reason: actionReason }
                : {}),
            },
            organizer: {
              name: user?.name || user?.email,
              email: user?.email,
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
            await fetch(`/api/events/${createdEventId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatePayload),
            }).catch(e => console.warn("[Calendar] DB update failed:", e));
          } catch (e) {
            console.warn("[Calendar] DB update crash (missing columns?):", e);
          }
        }
      }

      // 4. Update local state
      const normalizedEvent = {
        ...savedEvent,
        date_time: savedEvent.dateTime ? new Date(savedEvent.dateTime).toISOString() : savedEvent.date_time,
        client_email: savedEvent.clientEmail || savedEvent.client_email,
        status: savedEvent.status,
        googleLink: gLink,
      };

      if (editingEventId) {
        setEvents((prev) =>
          prev
            .map((e) => (e.id === editingEventId ? normalizedEvent : e))
            // Remove any other events that share this same Google ID (cleanup duplicates)
            .filter((e) => !normalizedEvent.google_event_id || e.id === normalizedEvent.id || e.google_event_id !== normalizedEvent.google_event_id)
        );
      } else {
        setEvents((prev) => [...prev, normalizedEvent]);
      }

      // 5. Success feedback and close
      openSuccess(
        editingEventId ? "Schedule Updated" : "Schedule Created",
        editingEventId
          ? "Changes have been saved and synced."
          : "Your new consultation has been scheduled.",
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
        setSubmitting(false); // Enable ONLY after closing/clearing
      }, 300);
    } catch (err: any) {
      console.error("Error saving event:", err.message || err);
      setCreateError(err.message || "Unexpected error.");
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!actionEventId || !actionReason || !userId) return;
    setSubmitting(true);
    const eventToCancel = events.find((e) => e.id === actionEventId);

    const isGoogleId =
      typeof actionEventId === "string" &&
      actionEventId.length > 20 &&
      !actionEventId.includes("-");

    try {
      // 1. Sync to Google Calendar first (Delete the event)
      if (isGoogleConnected) {
        const gId = isGoogleId ? actionEventId : eventToCancel?.google_event_id;
        if (gId) {
          try {
            await deleteCalendarEvent(userId, gId, user?.googleAccessToken);
          } catch (gErr) {
            console.warn("[CalendarSync] Google delete failed (might be already gone):", gErr);
            // We continue anyway since we want to update our local record
          }
        }
      }

      // 2. Update status to cancelled in DB
      const getNote = () => `${eventToCancel?.notes || ""}\n\n[Cancelled: ${actionReason}]`;

      const updateData = {
        status: "cancelled",
        notes: getNote(),
      };

      const cancelRes = isGoogleId
        ? await fetch(`/api/events/by-google-id/${actionEventId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          })
        : await fetch(`/api/events/${actionEventId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          });
      if (!cancelRes.ok) throw new Error("Failed to cancel event");

      // 3. Update local state
      setEvents((prev) =>
        prev.map((e) =>
          e.id === actionEventId ? { ...e, status: "cancelled" } : e,
        ),
      );
      setSelectedDayEvents((prev) =>
        prev.map((e) =>
          e.id === actionEventId ? { ...e, status: "cancelled" } : e,
        ),
      );

      // 4. Send cancellation email to client
      const clientEmail = eventToCancel?.client_email || eventToCancel?.clientEmail;

      if (clientEmail) {
        console.log(`[Calendar] Sending cancellation email to ${clientEmail}...`);
        const emailRes = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: clientEmail,
            type: "cancelled",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            eventDetails: {
              eventId: eventToCancel?.id,
              eventType: eventToCancel?.type,
              dateTime: new Date(
                eventToCancel?.date_time || eventToCancel?.dateTime || "",
              ).toISOString(),
              iCalUID:
                (eventToCancel as any)?.iCalUID ||
                eventToCancel?.google_event_id,
              reason: actionReason,
            },
            organizer: {
              name: user?.name || user?.email,
              email: user?.email,
            },
          }),
        });

        if (!emailRes.ok) {
          const errBody = await emailRes.json().catch(() => ({}));
          console.error("[Calendar] Email sending failed:", errBody);
          // We don't throw here to ensure the UI success still shows for the cancellation itself
        } else {
          console.log("[Calendar] Cancellation email sent successfully.");
        }
      } else {
        console.warn("[Calendar] No client email found to send cancellation notice.");
      }

      setSubmitting(false);
      setPendingAction(null);
      setActionEventId(null);
      setActionReason("");
      openSuccess(
        "Event Cancelled",
        "The client has been notified and the meeting removed from all calendars.",
        "info",
      );

      if (selectedDayEvents.length <= 1) {
        setPanelView("list");
      }
    } catch (err: any) {
      console.error("Error canceling event:", err.message || err);
      setSubmitting(false);
    }
  };

  const handleRSVP = async (eventId: string, newStatus: "confirmed" | "denied") => {
    if (!user) return;
    setSubmittingRSVP(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update RSVP status");

      // Update local state arrays
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, status: newStatus } : e,
        ),
      );
      setSelectedDayEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, status: newStatus } : e,
        ),
      );

      openSuccess(
        newStatus === "confirmed" ? "Invitation Confirmed" : "Invitation Declined",
        newStatus === "confirmed"
          ? "You have confirmed the appointment successfully."
          : "You have declined the appointment invitation.",
        newStatus === "confirmed" ? "success" : "info"
      );

      // Trigger email updates
      const eventObj = events.find((e) => e.id === eventId);
      if (eventObj) {
        const organizer = (eventObj as any).user;
        
        if (newStatus === "confirmed") {
          // Send confirmation_success email to the client (current user)
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: user.email,
              type: "confirmation_success",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              eventDetails: {
                eventId: eventObj.id,
                eventType: eventObj.type,
                dateTime: new Date(
                  eventObj.date_time || eventObj.dateTime || "",
                ).toISOString(),
                notes: eventObj.notes || undefined,
                iCalUID:
                  (eventObj as any).iCalUID ||
                  eventObj.google_event_id ||
                  undefined,
              },
              organizer: {
                name: organizer?.name || organizer?.email || "Organizer",
                email: organizer?.email || "",
              },
            }),
          }).catch((err) =>
            console.error("Failed to send confirmation email to guest:", err),
          );
        }

        // Notify the organizer
        if (organizer?.email) {
          const actionText = newStatus === "confirmed" ? "confirmed" : "declined";
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: organizer.email,
              subject: `Client ${newStatus === "confirmed" ? "Confirmed" : "Declined"} Appointment: ${eventObj.title || eventObj.type}`,
              body: `### Appointment ${newStatus === "confirmed" ? "Confirmed" : "Declined"}\n\nClient **${user.name || user.email}** has ${actionText} the appointment **"${eventObj.title || eventObj.type}"** scheduled for **${new Date(eventObj.date_time || eventObj.dateTime || "").toLocaleString()}**.`,
            }),
          }).catch((err) =>
            console.error("Failed to send RSVP email notification to organizer:", err),
          );
        }
      }
    } catch (err: any) {
      console.error("[Calendar] RSVP failed:", err.message || err);
      alert("Failed to update RSVP status. Please try again.");
    } finally {
      setSubmittingRSVP(null);
    }
  };

  const handleRemindEvent = async (event: CalendarEvent, opts: { silent?: boolean } = {}) => {
    if (!userId) return;

    try {
      // Trigger Reminder Email API
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: event.client_email || event.clientEmail,
          type: "reminder",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          eventDetails: {
            eventId: event.id,
            eventType: event.type,
            dateTime: new Date(
              event.date_time || event.dateTime || "",
            ).toISOString(),
            notes: event.notes,
            iCalUID:
              (event as any).iCalUID ||
              (typeof event.google_event_id === "string"
                ? event.google_event_id
                : undefined),
          },
          organizer: {
            name: user?.name || user?.email,
            email: user?.email,
          },
        }),
      });

      if (response.ok) {
        // Update DB to track that we sent this reminder
        const now = new Date().toISOString();
        await fetch(`/api/events/${event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ last_reminder_sent_at: now }),
        }).catch(e => console.warn("[Calendar] DB reminder update failed:", e));

        // Update local state immediately to prevent re-triggers before next fetch
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, lastReminderSentAt: now } : e));

        if (!opts.silent) {
          openSuccess("Reminder Sent", "The client has been notified via email.");
        }
      } else {
        throw new Error("Failed to send reminder");
      }
    } catch (err) {
      console.error("[Calendar] Remind event failed:", err);
      if (!opts.silent) {
        alert("Failed to send reminder. Please try again.");
      }
    }
  };

  // ── Automated Reminders (Today / Tomorrow) ─────────────────────────────────
  const autoRemindProcessed = useRef<Set<string>>(new Set());
  const isProcessingReminders = useRef(false);

  useEffect(() => {
    if (!loggedIn || !userId || events.length === 0 || isLoading || isProcessingReminders.current) return;

    const runAutoReminders = async () => {
      isProcessingReminders.current = true;
      try {
        const nowTs = new Date();
        const endOfTomorrow = new Date(nowTs);
        endOfTomorrow.setDate(nowTs.getDate() + 2);
        endOfTomorrow.setHours(0, 0, 0, 0);

        const todayStart = new Date(nowTs);
        todayStart.setHours(0, 0, 0, 0);

        // Find events for today or tomorrow that haven't been reminded yet today
        const toRemind = events.filter(e => {
          if (e.status === 'cancelled' || e.status === 'denied') return false;
          if (autoRemindProcessed.current.has(e.id)) return false;

          // Skip if already sent today
          if (e.lastReminderSentAt) {
            const lastSent = new Date(e.lastReminderSentAt);
            if (lastSent.getFullYear() === nowTs.getFullYear() &&
              lastSent.getMonth() === nowTs.getMonth() &&
              lastSent.getDate() === nowTs.getDate()) {
              return false;
            }
          }

          const evtDate = new Date(e.date_time || e.dateTime || "");
          // Only remind for FUTURE events (today or tomorrow)
          return evtDate > nowTs && evtDate < endOfTomorrow;
        });

        if (toRemind.length === 0) return;

        console.log(`[Calendar] Found ${toRemind.length} events needing automated reminders.`);

        for (const event of toRemind) {
          // Check again inside loop in case state updated during previous iterations
          if (autoRemindProcessed.current.has(event.id)) continue;

          autoRemindProcessed.current.add(event.id);
          await handleRemindEvent(event, { silent: true });

          // Small delay to avoid API rate limits
          await new Promise(r => setTimeout(r, 1000));
        }
      } finally {
        isProcessingReminders.current = false;
      }
    };

    runAutoReminders();
  }, [events, loggedIn, userId, isLoading]);

  const handleConnectGoogle = () => {
    if (!userId) return;
    window.location.href = getGoogleAuthUrl(userId, "/calendar");
  };

  const handleRefresh = () => {
    if (userId && isGoogleConnected) {
      loadGoogleEvents(userId);
    }
  };

  const [showLawyerModal, setShowLawyerModal] = useState(false);
  const [unacknowledgedEvents, setUnacknowledgedEvents] = useState<CalendarEvent[]>([]);
  const hasHandledModal = useRef(false);

  useEffect(() => {
    if (isLoading || events.length === 0 || hasHandledModal.current) return;

    const nowTs = new Date();
    const endOfTomorrow = new Date(nowTs);
    endOfTomorrow.setDate(nowTs.getDate() + 2);
    endOfTomorrow.setHours(0, 0, 0, 0);
    const todayStart = new Date(nowTs);
    todayStart.setHours(0, 0, 0, 0);

    const filterUnacked = events.filter(e => {
      if (e.status === 'cancelled' || e.status === 'denied' || e.status === 'canceled') return false;
      if (e.lawyerAcknowledgedAt) return false;
      const evtDate = new Date(e.date_time || e.dateTime || "");
      // Only notify for FUTURE events (today or tomorrow)
      return evtDate >= nowTs && evtDate < endOfTomorrow;
    });

    if (filterUnacked.length > 0) {
      setUnacknowledgedEvents(filterUnacked);
      setShowLawyerModal(true);
    } else {
      setShowLawyerModal(false);
    }
  }, [events, isLoading]);

  const handleAcknowledgeEvents = async () => {
    if (!userId || unacknowledgedEvents.length === 0) return;
    hasHandledModal.current = true;

    const ids = unacknowledgedEvents.map(e => e.id);
    const nowStr = new Date().toISOString();

    try {
      // Update each event individually since we need per-ID updates
      await Promise.all(ids.map(id => fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawyer_acknowledged_at: nowStr }),
      })));
      setEvents(prev => prev.map(e => ids.includes(e.id) ? { ...e, lawyerAcknowledgedAt: nowStr } : e));
      setShowLawyerModal(false);
    } catch (err) {
      console.error("Failed to acknowledge events:", err);
      // Instant fallback for UX
      setShowLawyerModal(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <SuccessNotification />

      {/* Lawyer Notification Modal */}
      <AnimatePresence>
        {showLawyerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#0B0B0C] border border-[#722f37]/30 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 bg-gradient-to-r from-[#722f37]/20 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#722f37] flex items-center justify-center shadow-xl shadow-[#722f37]/20">
                    <Bell className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif text-white leading-tight">Institutional <span className="text-[#e9c176] italic">Alerts</span></h2>
                    <p className="text-[10px] font-bold text-[#e9c176]/80 uppercase tracking-[0.2em] mt-1">Pending Acknowledgement</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[350px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {unacknowledgedEvents.map((evt) => (
                  <div key={evt.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-bold text-white truncate pr-2">{evt.title}</h3>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${EVENT_COLORS[evt.type].badge}`}>
                        {evt.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock size={12} className="text-[#e9c176]" />
                      <span>{formatDT(evt.date_time || evt.dateTime)}</span>
                    </div>
                    {evt.notes && (
                      <p className="mt-2 text-[11px] text-gray-500 line-clamp-2 leading-relaxed italic border-l-2 border-white/10 pl-3">
                        "{evt.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 bg-black/40 border-t border-white/5 flex gap-3">
                <button
                  onClick={handleAcknowledgeEvents}
                  className="flex-1 bg-[#722f37] hover:bg-[#8b3a44] text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-[#722f37]/20 active:scale-[0.98] uppercase tracking-widest text-[11px]"
                >
                  Ratify Alerts
                </button>
                <button
                  onClick={() => {
                    hasHandledModal.current = true;
                    setShowLawyerModal(false);
                  }}
                  className="px-6 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition-all border border-white/5"
                >
                  Remind Me Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Event List Modal */}
      <AnimatePresence>
        {showMobileEventModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-lg bg-[#0B0B0C] border-t sm:border border-[#722f37]/30 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#722f37]/10 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#722f37]/20 flex items-center justify-center text-[#e9c176] border border-[#722f37]/30">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {MONTHS[viewMonth]} {selectedDay}, {viewYear}
                    </h2>
                    <p className="text-xs text-gray-400 font-medium">
                      {selectedDayEvents.length} Events {new Date(viewYear, viewMonth, selectedDay || 1) < new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? "Logged" : "Scheduled"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileEventModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {selectedDayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setSelectedDayEvents([evt]);
                      setPanelView("details");
                      setActiveMobileTab("agenda");
                      setShowMobileEventModal(false);
                    }}
                    className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#722f37]/30 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${EVENT_COLORS[evt.type].dot}`}
                        />
                        <h3 className="text-sm font-bold text-white group-hover:text-[#e9c176] transition-colors">
                          {evt.title}
                        </h3>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${EVENT_COLORS[evt.type].badge}`}
                      >
                        {evt.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[#e9c176]" />
                        <span>
                          {new Date(
                            evt.date_time || evt.dateTime || "",
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {evt.status && (
                        <StatusBadge
                          status={evt.status}
                          isPast={new Date(evt.date_time || evt.dateTime || "") < now}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5">
                <button
                  onClick={() => {
                    openCreateModal(selectedDay || undefined);
                    setShowMobileEventModal(false);
                  }}
                  className="w-full bg-[#722f37] hover:bg-[#8b3a44] text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-[#722f37]/20 flex items-center justify-center gap-3 uppercase tracking-widest text-[11px]"
                >
                  <Plus size={18} /> Initiate Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
                  className={isLoadingEvents ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <button
              onClick={() => openCreateModal()}
              className="flex items-center gap-2 bg-[#722f37] hover:bg-[#8b3a44] text-white font-bold px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-[#722f37]/20"
            >
              <Plus size={16} /> Create Schedule
            </button>
          </div>
        }
        maxWidth="max-w-7xl"
        backgroundAngle={4}
      >
        <div className="flex flex-col md:flex-row flex-1 h-full relative z-10 overflow-hidden">
          {/* Mobile View Toggle */}
          <div className="md:hidden flex-shrink-0 px-5 pt-4 pb-2 border-b border-white/5 bg-black/20">
            <div className="bg-[#0B0B0C] p-1 rounded-xl flex items-center gap-1 border border-white/5">
              <button
                onClick={() => setActiveMobileTab("calendar")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeMobileTab === "calendar"
                  ? "bg-[#722f37] text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
                  }`}
              >
                <Calendar size={14} /> Calendar
              </button>
              <button
                onClick={() => setActiveMobileTab("agenda")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeMobileTab === "agenda"
                  ? "bg-[#722f37] text-white shadow-lg"
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
            <div className="bg-[#0B0B0C]/70 backdrop-blur-xl border border-[#722f37]/20 rounded-2xl p-5">
              {/* Google Auth Banner */}
              {!isCheckingAuth && !isGoogleConnected && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 rounded-xl border border-[#722f37]/40 bg-[#722f37]/10 p-4 flex items-start gap-3"
                >
                  <div className="p-1.5 bg-[#722f37]/20 rounded-lg flex-shrink-0">
                    <Calendar size={16} className="text-[#e9c176]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                      Connect Google Calendar
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Sync your events and let the AI schedule directly to your
                      calendar.
                    </p>
                  </div>
                  <button
                    onClick={handleConnectGoogle}
                    className="flex-shrink-0 flex items-center gap-2 bg-[#722f37] hover:bg-[#8b3a44] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all shadow-lg shadow-[#722f37]/20"
                  >
                    <LinkIcon size={12} /> Connect
                  </button>
                </motion.div>
              )}

              {isCheckingAuth && (
                <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 size={12} className="animate-spin" /> Checking Google
                  Calendar…
                </div>
              )}

              {isGoogleConnected && !isCheckingAuth && (
                <div className="mb-4 flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle size={12} /> Google Calendar connected
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
                  <ArrowLeft size={16} className="text-gray-400" />
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
                  <ArrowLeft size={16} className="text-gray-400 rotate-180" />
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

                  const dayEvents = events
                    .filter((e) => {
                      if (
                        e.status === "cancelled" ||
                        e.status === "canceled" ||
                        e.status === "denied"
                      )
                        return false;
                      const d = new Date(e.date_time || e.dateTime || "");
                      return (
                        d.getDate() === day &&
                        d.getMonth() === viewMonth &&
                        d.getFullYear() === viewYear
                      );
                    })
                    .sort((a, b) =>
                      (a.date_time || a.dateTime || "").localeCompare(
                        b.date_time || b.dateTime || "",
                      ),
                    );

                  return (
                    <div
                      key={day}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setSelectedDayEvents(dayEvents);
                          setSelectedDay(day);
                          // On mobile, show modal. On desktop, show panel.
                          if (window.innerWidth < 768) {
                            setShowMobileEventModal(true);
                          } else {
                            setPanelView("details");
                          }
                        } else if (!isPast) {
                          openCreateModal(day);
                        }
                      }}
                      className={`min-h-[80px] lg:min-h-[100px] flex flex-col items-stretch p-1.5 rounded-xl text-xs transition-all border
                                            ${isPast
                          ? dayEvents.length > 0
                            ? "opacity-40 cursor-pointer border-white/5"
                            : "opacity-30 cursor-not-allowed border-transparent"
                          : "cursor-pointer"
                        }
                                            ${isToday && !isPast
                          ? "bg-[#722f37]/10 border-[#722f37]/40"
                          : !isPast &&
                            dayEvents.length > 0
                            ? "bg-white/[0.02] border-white/5 hover:bg-white/5"
                            : !isPast
                              ? "hover:bg-white/5 border-transparent"
                              : ""
                        }`}
                    >
                      <span
                        className={`text-[10px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0
                                            ${isToday ? "bg-[#722f37] text-white font-bold" : "text-gray-500"}`}
                      >
                        {day}
                      </span>
                      <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                        {dayEvents.slice(0, 3).map((evt) => (
                          <div
                            key={evt.id}
                            className={`px-1.5 h-4 flex items-center rounded text-[8px] truncate font-bold uppercase tracking-tighter border ${EVENT_COLORS[evt.type]?.badge || "bg-white/10 text-gray-300 border-white/10"} ${new Date(evt.date_time || evt.dateTime || "").getTime() < now.getTime() ? "line-through decoration-white/30 opacity-40 italic" : ""}`}
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
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
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
                  <div className="md:hidden mx-4 mt-4 rounded-xl border border-[#722f37]/40 bg-[#722f37]/10 p-3 flex items-center gap-3">
                    <Calendar
                      size={14}
                      className="text-[#e9c176] flex-shrink-0"
                    />
                    <p className="text-xs text-gray-300 flex-1">
                      Connect Google Calendar to sync events.
                    </p>
                    <button
                      onClick={handleConnectGoogle}
                      className="text-xs font-bold text-[#e9c176] hover:text-white transition-colors flex-shrink-0"
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
                      className={`flex items-center gap-2 px-4 h-10 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === "pending"
                        ? "bg-[#e9c176]/20 border border-[#e9c176]/30 text-[#e9c176] shadow-lg shadow-[#e9c176]/5"
                        : "text-gray-500 hover:bg-white/5 border border-transparent"
                        }`}
                    >
                      <AlertCircle size={14} /> Pending{" "}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${activeTab === "pending" ? "bg-[#e9c176]/20 text-[#e9c176]" : "bg-white/5 text-gray-500"}`}>
                        {pendingEvents.length}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("upcoming");
                        setShowAll(false);
                      }}
                      className={`flex items-center gap-2 px-4 h-10 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === "upcoming"
                        ? "bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5"
                        : "text-gray-500 hover:bg-white/5 border border-transparent"
                        }`}
                    >
                      <Clock size={14} /> Upcoming{" "}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${activeTab === "upcoming" ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-gray-500"}`}>
                        {upcomingEvents.length}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("accomplished");
                        setShowAll(false);
                      }}
                      className={`flex items-center gap-2 px-4 h-10 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === "accomplished"
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/5"
                        : "text-gray-500 hover:bg-white/5 border border-transparent"
                        }`}
                    >
                      <History size={14} /> Accomplished{" "}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${activeTab === "accomplished" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-500"}`}>
                        {accomplishedEvents.length}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("denied");
                        setShowAll(false);
                      }}
                      className={`flex items-center gap-2 px-4 h-10 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === "denied"
                        ? "bg-red-500/20 border border-red-500/30 text-red-400 shadow-lg shadow-red-500/5"
                        : "text-gray-500 hover:bg-white/5 border border-transparent"
                        }`}
                    >
                      <XCircle size={14} /> Denied{" "}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${activeTab === "denied" ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-500"}`}>
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
                      className="w-full bg-black/40 border border-[#722f37]/20 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#e9c176]/50 focus:ring-1 focus:ring-[#e9c176]/20 placeholder:text-gray-600 transition-all font-body"
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
                    <Loader2 size={16} className="animate-spin" /> Loading
                    events…
                  </div>
                )}

                {/* Error state */}
                {eventsError && !isLoadingEvents && (
                  <div className="mx-5 mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
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
                            className="text-[#e9c176] animate-spin mx-auto mb-4"
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
                          <div className="inline-flex p-5 bg-[#722f37]/10 rounded-full mb-4 border border-[#722f37]/20 shadow-inner">
                            {activeTab === "accomplished" ? (
                              <CheckCircle
                                size={28}
                                className="text-emerald-400"
                              />
                            ) : (
                              <Calendar size={28} className="text-[#e9c176]" />
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
                              setSelectedDay(
                                new Date(
                                  event.date_time || event.dateTime || "",
                                ).getDate(),
                              );
                              setPanelView("details");
                            }}
                          >
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${EVENT_COLORS[event.type].dot}`}
                              />
                              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                  <h3
                                    className={`font-medium text-base truncate pr-4 leading-tight ${new Date(event.date_time || event.dateTime || "").getTime() < now.getTime() ? "text-white/30 italic" : "text-white"}`}
                                    style={{ textDecoration: new Date(event.date_time || event.dateTime || "").getTime() < now.getTime() ? 'line-through' : 'none' }}
                                  >
                                    {event.title}
                                  </h3>
                                  {(() => {
                                    const evtDate = new Date(
                                      event.date_time || event.dateTime || "",
                                    );
                                    const diff =
                                      evtDate.getTime() - now.getTime();
                                    const isToday =
                                      evtDate.getDate() === now.getDate() &&
                                      evtDate.getMonth() === now.getMonth() &&
                                      evtDate.getFullYear() ===
                                      now.getFullYear();

                                    if (isToday && diff > 0) {
                                      const hours = Math.floor(
                                        diff / (1000 * 60 * 60),
                                      );
                                      const minutes = Math.floor(
                                        (diff % (1000 * 60 * 60)) / (1000 * 60),
                                      );
                                      const countdownText =
                                        hours > 0
                                          ? `${hours}h ${minutes}m`
                                          : `${minutes}m`;
                                      return (
                                        <span className="flex-shrink-0 bg-red-500/10 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500/30 flex items-center gap-1 animate-pulse">
                                          <Clock size={10} />
                                          IN {countdownText}
                                        </span>
                                      );
                                    }

                                    const tomorrow = new Date(now);
                                    tomorrow.setDate(now.getDate() + 1);
                                    const isTomorrow =
                                      evtDate.getDate() ===
                                      tomorrow.getDate() &&
                                      evtDate.getMonth() ===
                                      tomorrow.getMonth() &&
                                      evtDate.getFullYear() ===
                                      tomorrow.getFullYear();
                                    return (
                                      isTomorrow && (
                                        <span className="flex-shrink-0 bg-amber-500/10 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                          TOMORROW
                                        </span>
                                      )
                                    );
                                  })()}
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                  <StatusBadge
                                    status={event.status || "pending"}
                                    isPast={new Date(event.date_time || event.dateTime || "") < now}
                                  />
                                  <span
                                    className={`inline-flex items-center justify-center text-[9px] font-black uppercase tracking-[0.1em] px-2 h-5 rounded-md border ${EVENT_COLORS[event.type].badge}`}
                                  >
                                    {event.type}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-1 mt-2 text-gray-400">
                                  <p className="text-[13px] flex items-center gap-1.5">
                                    <Clock
                                      size={13}
                                      className="opacity-70 text-[#e9c176]"
                                    />{" "}
                                    {formatDT(
                                      event.date_time || event.dateTime,
                                    )}
                                  </p>
                                  {(event.client_email ||
                                    event.clientEmail) && (
                                      <p className="text-[13px] flex items-center gap-1.5">
                                        <User
                                          size={13}
                                          className="opacity-70 text-[#e9c176]"
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
                                  <span className="text-[10px] font-bold uppercase tracking-tight">
                                    Remind
                                  </span>
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
                    <h2 className="text-sm font-bold text-white">
                      Day Details
                    </h2>
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
                      <div
                        className={`absolute top-0 left-0 bottom-0 w-1 h-full ${EVENT_COLORS[event.type || "meeting"].dot}`}
                      />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <h3
                              className={`font-bold text-base leading-tight ${new Date(event.date_time || event.dateTime || "").getTime() < now.getTime() ? "text-white/30 italic" : "text-white"}`}
                              style={{ textDecoration: new Date(event.date_time || event.dateTime || "").getTime() < now.getTime() ? 'line-through' : 'none' }}
                            >
                              {event.title}
                            </h3>
                            {(() => {
                              const evtDate = new Date(
                                event.date_time || event.dateTime || "",
                              );
                              const diff = evtDate.getTime() - now.getTime();
                              const isToday =
                                evtDate.getDate() === now.getDate() &&
                                evtDate.getMonth() === now.getMonth() &&
                                evtDate.getFullYear() === now.getFullYear();

                              if (isToday && diff > 0) {
                                const hours = Math.floor(
                                  diff / (1000 * 60 * 60),
                                );
                                const minutes = Math.floor(
                                  (diff % (1000 * 60 * 60)) / (1000 * 60),
                                );
                                const countdownText =
                                  hours > 0
                                    ? `${hours}h ${minutes}m`
                                    : `${minutes}m`;
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
                              <Clock size={13} className="text-[#e9c176]" />
                              {formatDT(event.date_time || event.dateTime)}
                            </p>
                            {(event.client_email || event.clientEmail) && (
                              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                <User size={13} className="text-[#e9c176]" />
                                {event.client_email || event.clientEmail}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`inline-flex items-center justify-center text-[9px] font-black uppercase tracking-[0.1em] px-2 h-5 rounded-md border ${EVENT_COLORS[event.type || "meeting"].badge}`}
                          >
                            {event.type}
                          </span>
                          <StatusBadge
                            status={event.status || "pending"}
                            isPast={new Date(event.date_time || event.dateTime || "") < now}
                          />
                        </div>
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
                        const isEventPast =
                          new Date(
                            event.date_time || event.dateTime || "",
                          ).getTime() < now.getTime();
                        const isMissed =
                          isEventPast &&
                          (event.status === "pending" ||
                            event.status === "tentative");

                        if (isMissed) {
                          return (
                            <div className="mt-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                              <div className="p-1.5 bg-red-500/20 rounded-lg text-red-400 flex-shrink-0">
                                <AlertCircle size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">
                                  Client Missed Response
                                </p>
                                <p className="text-[10px] text-gray-400/80 mt-0.5 leading-tight">
                                  The meeting time passed without an RSVP. We
                                  recommend rescheduling to stay connected.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="pt-3 border-t border-white/5">
                        {pendingAction && actionEventId === event.id ? (
                          <div
                            className={`space-y-3 p-3 rounded-xl border animate-in fade-in zoom-in-95 ${pendingAction === "cancel"
                              ? "bg-red-500/5 border-red-500/20"
                              : "bg-amber-500/5 border-amber-500/20"
                              }`}
                          >
                            <label
                              className={`text-[10px] font-bold uppercase tracking-widest ${pendingAction === "cancel"
                                ? "text-red-400"
                                : "text-amber-400"
                                }`}
                            >
                              {`Reason for ${pendingAction === "cancel" ? "Cancellation" : "Rescheduling"}`}
                            </label>

                            <textarea
                              autoFocus
                              value={actionReason}
                              onChange={(e) => setActionReason(e.target.value)}
                              placeholder={`Enter reason...`}
                              className={`w-full bg-black/40 border rounded-lg px-3 py-2 text-xs text-white outline-none resize-none h-16 transition-all ${pendingAction === "cancel"
                                ? "border-red-500/20 focus:border-red-500/50"
                                : "border-amber-500/20 focus:border-amber-500/50"
                                }`}
                            />

                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setPendingAction(null);
                                  setActionReason("");
                                }}
                                className="text-[10px] font-bold text-gray-500 hover:text-white"
                              >
                                Back
                              </button>
                              <button
                                onClick={async () => {
                                  if (pendingAction === "cancel") {
                                    setSubmitting(true);
                                    await handleCancelConfirm();
                                  } else {
                                    setEditingEventId(event.id);
                                    const dt =
                                      event.date_time || event.dateTime || "";
                                    const localDate = new Date(dt);
                                    const loY = localDate.getFullYear();
                                    const loM = String(
                                      localDate.getMonth() + 1,
                                    ).padStart(2, "0");
                                    const loD = String(
                                      localDate.getDate(),
                                    ).padStart(2, "0");
                                    const loH = String(
                                      localDate.getHours(),
                                    ).padStart(2, "0");
                                    const loMin = String(
                                      localDate.getMinutes(),
                                    ).padStart(2, "0");
                                    const resolvedLocalString = `${loY}-${loM}-${loD}T${loH}:${loMin}`;

                                    setForm({
                                      title: event.title,
                                      type: event.type as CalendarEvent["type"],
                                      dateTime: resolvedLocalString,
                                      clientEmail:
                                        event.client_email ||
                                        event.clientEmail ||
                                        "",
                                      notes: event.notes || "",
                                    });
                                    setPanelView("create");
                                    setPendingAction(null);
                                  }
                                }}
                                disabled={!actionReason || submitting}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-lg ${!actionReason
                                  ? "bg-white/5 text-gray-600 cursor-not-allowed"
                                  : pendingAction === "cancel"
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
                              // Lawyer is the organizer if they created the event (DB event)
                              // OR if their email matches the Google organizer (synced Google event)
                              const isOrganizer =
                                event.userId === user?.id ||
                                !event.userId; // DB events always belong to the logged-in user

                              if (!isOrganizer) {
                                const canRSVP =
                                  event.status === "pending" ||
                                  event.status === "tentative" ||
                                  event.status === "requested_change";

                                if (canRSVP) {
                                  const isSubmittingThis = submittingRSVP === event.id;
                                  return (
                                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleRSVP(event.id, "confirmed");
                                        }}
                                        disabled={isSubmittingThis}
                                        className="text-[10px] font-bold px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 rounded-lg transition-all border border-green-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                      >
                                        <CheckCircle2 size={12} /> Confirm
                                      </button>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleRSVP(event.id, "denied");
                                        }}
                                        disabled={isSubmittingThis}
                                        className="text-[10px] font-bold px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg transition-all border border-red-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                      >
                                        <XCircle size={12} /> Decline
                                      </button>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="text-[10px] font-bold text-gray-500 px-2.5 py-1 bg-white/5 rounded-md capitalize">
                                    RSVP: {event.status}
                                  </span>
                                );
                              }

                              const isEventPast =
                                new Date(
                                  event.date_time || event.dateTime || "",
                                ).getTime() < now.getTime();

                              // Confirmed past events (Accomplished) - Show Delete as Icon
                              if (isEventPast && event.status === "confirmed") {
                                return null;
                              }

                              // Unconfirmed/Missed past events - Reschedule or Delete
                              if (isEventPast) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingAction("reschedule");
                                        setActionEventId(event.id);
                                      }}
                                      className="text-[10px] font-bold px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-all border border-amber-500/20"
                                    >
                                      Reschedule
                                    </button>
                                  </div>
                                );
                              }

                              // Future events
                              return (
                                <div className="flex items-center gap-1.5">
                                  {(() => {
                                    const evtDate = new Date(
                                      event.date_time || event.dateTime || "",
                                    );
                                    const isToday =
                                      evtDate.getDate() === now.getDate() &&
                                      evtDate.getMonth() === now.getMonth() &&
                                      evtDate.getFullYear() ===
                                      now.getFullYear();
                                    const tomorrow = new Date(now);
                                    tomorrow.setDate(now.getDate() + 1);
                                    const isTomorrow =
                                      evtDate.getDate() ===
                                      tomorrow.getDate() &&
                                      evtDate.getMonth() ===
                                      tomorrow.getMonth() &&
                                      evtDate.getFullYear() ===
                                      tomorrow.getFullYear();
                                    const isUrgent = isToday || isTomorrow;

                                    if (
                                      event.status === "pending" ||
                                      isUrgent
                                    ) {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemindEvent(event);
                                          }}
                                          className="text-[10px] font-bold px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all border border-amber-500/20 flex items-center gap-1.5"
                                          title="Send Reminder"
                                        >
                                          <Bell size={12} />{" "}
                                          <span className="hidden sm:inline">
                                            Remind
                                          </span>
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPendingAction("reschedule");
                                      setActionEventId(event.id);
                                    }}
                                    className="text-[10px] font-bold px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPendingAction("cancel");
                                      setActionEventId(event.id);
                                    }}
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
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Legal Consultation"
                        value={form.title}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, title: e.target.value }));
                          setValidationErrors((prev) =>
                            prev.filter(
                              (err) => !err.toLowerCase().includes("title"),
                            ),
                          );
                        }}
                        className={`w-full bg-[#0B0B0C] border ${validationErrors.some((e) => e.toLowerCase().includes("title")) ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#722f37]/50 placeholder:text-gray-600 transition-all`}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          Type
                        </label>
                        <div
                          onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                          className="w-full flex items-center justify-between bg-[#0B0B0C] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none hover:border-[#722f37]/50 cursor-pointer transition-all"
                        >
                          <span className="capitalize">{form.type}</span>
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 text-white/60 ${typeDropdownOpen ? "rotate-180" : ""}`}
                          />
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
                                {[
                                  "meeting",
                                  "appointment",
                                  "hearing",
                                  "deposition",
                                ].map((t) => (
                                  <div
                                    key={t}
                                    onClick={() => {
                                      setForm((f) => ({
                                        ...f,
                                        type: t as CalendarEvent["type"],
                                      }));
                                      setTypeDropdownOpen(false);
                                    }}
                                    className={`px-4 py-3 text-sm cursor-pointer transition-all capitalize flex items-center justify-between
                                                                        ${form.type === t ? "bg-[#722f37]/20 text-white font-semibold" : "text-white/80 hover:bg-white/5 hover:text-white"}
                                                                    `}
                                  >
                                    {t}
                                    {form.type === t && (
                                      <Check
                                        size={14}
                                        strokeWidth={2}
                                        className="text-[#e9c176]"
                                      />
                                    )}
                                  </div>
                                ))}
                              </motion.div>
                              {/* Invisible backdrop to catch outside clicks */}
                              <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTypeDropdownOpen(false);
                                }}
                              />
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          Date & Time *
                        </label>
                        <input
                          type="datetime-local"
                          min={getMinDateTime()}
                          value={form.dateTime}
                          onChange={(e) => {
                            setForm((f) => ({
                              ...f,
                              dateTime: e.target.value,
                            }));
                            setValidationErrors((prev) =>
                              prev.filter(
                                (err) =>
                                  !err.toLowerCase().includes("date") &&
                                  !err.toLowerCase().includes("past"),
                              ),
                            );
                          }}
                          className={`w-full bg-[#0B0B0C] border ${validationErrors.some((e) => e.toLowerCase().includes("date") || e.toLowerCase().includes("past")) ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#722f37]/50 [color-scheme:dark] transition-all`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Client Emails
                      </label>
                      <div className="flex flex-wrap gap-2 p-3 bg-[#0B0B0C] border border-white/10 rounded-xl min-h-[50px] focus-within:border-[#722f37]/50 transition-all">
                        <AnimatePresence>
                          {(form.clientEmail
                            ? form.clientEmail
                              .split(",")
                              .map((e) => e.trim())
                              .filter(Boolean)
                            : []
                          ).map((email, idx) => (
                            <motion.div
                              key={email}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-1.5 bg-[#722f37]/10 border border-[#722f37]/30 text-[#e9c176] px-2.5 py-1 rounded-lg text-xs font-medium"
                            >
                              <span>{email}</span>
                              <button
                                onClick={() => removeEmail(idx)}
                                className="hover:text-white transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <input
                          type="text"
                          placeholder={
                            !form.clientEmail ? "Add email + space" : ""
                          }
                          value={emailInput}
                          onChange={(e) => {
                            setEmailInput(e.target.value);
                            if (
                              e.target.value.endsWith(",") ||
                              e.target.value.endsWith(" ")
                            )
                              handleAddEmail(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddEmail(emailInput);
                            }
                          }}
                          className="flex-1 bg-transparent text-sm text-white outline-none min-w-[120px] placeholder:text-gray-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Notes
                      </label>
                      <textarea
                        placeholder="Agenda or special instructions..."
                        value={form.notes}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, notes: e.target.value }));
                          setValidationErrors((prev) =>
                            prev.filter(
                              (err) => !err.toLowerCase().includes("notes"),
                            ),
                          );
                        }}
                        rows={3}
                        className={`w-full bg-[#0B0B0C] border ${validationErrors.some((e) => e.toLowerCase().includes("notes")) ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#722f37]/50 placeholder:text-gray-600 resize-none transition-all`}
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
                        className="w-full bg-[#722f37] hover:bg-[#8b3a44] text-white font-bold py-4 rounded-xl shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-[11px] group overflow-hidden relative"
                      >
                        {submitting ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            {editingEventId
                              ? "Save Changes"
                              : "Confirm Schedule"}
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