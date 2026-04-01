'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, X, ArrowLeft, Menu, Clock, User,
  Search, ChevronDown, ChevronUp, CheckCircle, History,
  RefreshCw, AlertCircle, Loader2, Link as LinkIcon
} from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { useAuth } from '@/components/auth/auth-provider';
import { ASSETS } from '@/lib/constants';
import {
  checkAuthStatus,
  getGoogleAuthUrl,
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  type GoogleCalendarEvent,
} from '@/lib/calendar-api';

// ── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  type: 'meeting' | 'appointment' | 'hearing' | 'deposition';
  date_time: string; // Used by Supabase
  dateTime?: string; // Used by Google (will normalize to date_time)
  client_email?: string;
  clientEmail?: string;
  notes?: string;
  googleLink?: string;
  isGoogleEvent?: boolean;
  status: 'draft' | 'pending' | 'confirmed' | 'requested_change';
  client_feedback?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, { badge: string; dot: string }> = {
  meeting: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  appointment: { badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  hearing: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  deposition: { badge: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-400' },
};

const NOW = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Helpers ──────────────────────────────────────────────────────────────────


function formatDT(dt: string | undefined) {
  if (!dt) return '';
  try {
    return new Date(dt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return dt;
  }
}

const StatusBadge = ({ status }: { status: CalendarEvent['status'] }) => {
  const configs = {
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    requested_change: 'bg-red-500/10 text-red-400 border-red-500/20'
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${configs[status || 'draft']}`}>
      {status === 'requested_change' ? 'Change Requested' : status || 'draft'}
    </span>
  );
};

/** Infer an event type from Google Calendar description text */
function inferEventType(description?: string, title?: string): CalendarEvent['type'] {
  const text = `${title ?? ''} ${description ?? ''}`.toLowerCase();
  if (text.includes('hearing')) return 'hearing';
  if (text.includes('deposition')) return 'deposition';
  if (text.includes('appointment')) return 'appointment';
  return 'meeting';
}

/** Map a raw Google Calendar event to our CalendarEvent shape */
function mapGoogleEvent(e: GoogleCalendarEvent): CalendarEvent {
  const start = e.start || '';
  return {
    id: e.id,
    title: e.title,
    type: inferEventType(e.description, e.title),
    date_time: start,
    dateTime: start,
    notes: e.description ?? undefined,
    googleLink: e.link ?? undefined,
    isGoogleEvent: true,
    status: 'confirmed'
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

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(NOW.getMonth());
  const [viewYear, setViewYear] = useState(NOW.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'accomplished'>('upcoming');
  const [showAll, setShowAll] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Action state
  const [pendingAction, setPendingAction] = useState<'cancel' | 'reschedule' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionEventId, setActionEventId] = useState<string | number | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | number | null>(null);

  // Mobile Responsive state
  const [activeMobileTab, setActiveMobileTab] = useState<'calendar' | 'agenda'>('calendar');

  const [form, setForm] = useState({ title: '', type: 'meeting' as CalendarEvent['type'], dateTime: '', clientEmail: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Google Calendar auth state
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Workflow states
  const [showPreview, setShowPreview] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  // Fetch events from Supabase
  const fetchEvents = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('date_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error.message);
      } else if (data) {
        // Normalize fields for consumption
        const normalized = data.map((e: any) => ({
          ...e,
          dateTime: e.date_time,
          clientEmail: e.client_email,
          status: e.status || 'draft'
        }));
        setEvents(normalized);
      }
    } catch (err) {
      console.error('Unexpected error fetching events:', err);
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
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEvents = mapped.filter(e => !existingIds.has(e.id));
          return [...prev, ...newEvents];
        });
        setIsGoogleConnected(true);
      } else {
        setEventsError(result.error ?? 'Failed to load Google events.');
      }
    } catch (err: any) {
      setEventsError(err.message ?? 'Failed to load Google events.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const checkGoogleAuth = useCallback(async (sessId: string) => {
    setIsCheckingAuth(true);
    try {
      const status = await checkAuthStatus(sessId);
      setIsGoogleConnected(status.authenticated);
      if (status.authenticated) {
        await loadGoogleEvents(sessId);
      }
    } catch {
      setIsGoogleConnected(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [loadGoogleEvents]);

  useEffect(() => {
    if (loggedIn && userId) {
      fetchEvents();

      const authSuccess = searchParams.get('auth_success');
      if (authSuccess === 'true') {
        router.replace('/calendar', { scroll: false });
      }
      checkGoogleAuth(userId);
    }
  }, [loggedIn, userId, fetchEvents, checkGoogleAuth, searchParams, router]);


  // ── Derived lists ──────────────────────────────────────────────────────────

  const upcomingEvents = useMemo(() =>
    events.filter(e => new Date(e.date_time || e.dateTime || '').getTime() >= NOW.getTime())
      .sort((a, b) => (a.date_time || a.dateTime || '').localeCompare(b.date_time || b.dateTime || '')),
    [events]
  );

  const accomplishedEvents = useMemo(() =>
    events.filter(e => new Date(e.date_time || e.dateTime || '').getTime() < NOW.getTime())
      .sort((a, b) => (b.date_time || b.dateTime || '').localeCompare(a.date_time || a.dateTime || '')),
    [events]
  );

  const activeList = activeTab === 'upcoming' ? upcomingEvents : accomplishedEvents;

  const filteredList = useMemo(() =>
    searchQuery.trim()
      ? activeList.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.client_email || e.clientEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
      : activeList,
    [activeList, searchQuery]
  );

  const visibleList = showAll ? filteredList : filteredList.slice(0, 5);
  const hasMore = filteredList.length > 5;

  // ── Calendar grid ──────────────────────────────────────────────────────────

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const eventDatesThisMonth = new Set(
    events
      .filter(e => {
        const d = new Date(e.date_time || e.dateTime || '');
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
      })
      .map(e => new Date(e.date_time || e.dateTime || '').getDate())
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title || !form.dateTime || !userId) return;
    setSubmitting(true);
    setCreateError(null);

    try {
      if (editingEventId) {
        // Update existing event in Supabase
        const { data, error } = await supabase
          .from('events')
          .update({
            title: form.title,
            type: form.type,
            date_time: form.dateTime,
            client_email: form.clientEmail,
            notes: `${form.notes}${actionReason ? `\n\n[Rescheduled: ${actionReason}]` : ''}`
          })
          .eq('id', editingEventId)
          .select()
          .single();

        if (error) throw error;
        setEvents(prev => prev.map(e => e.id === editingEventId ? { ...data, dateTime: data.date_time, clientEmail: data.client_email } : e));
        // Check for conflicts before saving
        const { data: conflicts, error: conflictErr } = await supabase
          .from('events')
          .select('id, title, date_time')
          .eq('user_id', userId)
          .eq('date_time', form.dateTime)
          .neq('id', editingEventId || 'none');

        if (conflicts && conflicts.length > 0 && !conflictWarning) {
          setConflictWarning(`Overlap detected: You already have "${conflicts[0].title}" scheduled at this time.`);
          setSubmitting(false);
          return;
        }

        // Always save to Supabase as 'draft' first
        const eventData = {
          user_id: userId,
          title: form.title,
          type: form.type,
          date_time: form.dateTime,
          client_email: form.clientEmail,
          notes: form.notes,
          status: 'draft'
        };

        let result;
        if (editingEventId) {
          result = await supabase
            .from('events')
            .update(eventData)
            .eq('id', editingEventId)
            .select()
            .single();
        } else {
          result = await supabase
            .from('events')
            .insert(eventData)
            .select()
            .single();
        }

        if (result.error) throw result.error;
        const newEvent = { 
          ...result.data, 
          dateTime: result.data.date_time, 
          clientEmail: result.data.client_email,
          status: result.data.status || 'draft'
        };
        
        if (editingEventId) {
          setEvents(prev => prev.map(e => e.id === editingEventId ? newEvent : e));
        } else {
          setEvents(prev => [...prev, newEvent]);
        }

        setPreviewEvent(newEvent);
        setShowPreview(true);
        setShowCreate(false);
        setEditingEventId(null);
        setActionReason('');
        setForm({ title: '', type: 'meeting', dateTime: '', clientEmail: '', notes: '' });
      }
    } catch (err: any) {
      console.error('Error saving event:', err.message || err);
      setCreateError(err.message || 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeAndSend = async () => {
    if (!previewEvent || !userId) return;
    setSubmitting(true);
    try {
      // 1. Sync with Google Calendar if connected
      let gLink = '';
      if (isGoogleConnected) {
        const start = new Date(previewEvent.date_time);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const toISO = (d: Date) => d.toISOString().slice(0, 19);

        const result = await createCalendarEvent(userId, {
          title: previewEvent.title,
          start_datetime: toISO(start),
          end_datetime: toISO(end),
          description: previewEvent.notes,
        });
        if (result.success) gLink = result.link || '';
      }

      // 2. Update status to pending
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'pending', googleLink: gLink || null })
        .eq('id', previewEvent.id)
        .select()
        .single();

      if (error) throw error;

      // 3. Trigger Resend API
      await fetch('/api/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: previewEvent.client_email,
          type: 'schedule',
          eventDetails: {
            eventId: previewEvent.id,
            eventType: previewEvent.type,
            dateTime: previewEvent.date_time,
            notes: previewEvent.notes,
          },
        }),
      });

      setEvents(prev => prev.map(e => e.id === previewEvent.id ? { ...data, dateTime: data.date_time, clientEmail: data.client_email } : e));
      setShowPreview(false);
      setPreviewEvent(null);
    } catch (err) {
      console.error('Finalization error:', err);
      alert('Failed to finalize appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!actionEventId || !actionReason || !userId) return;
    setSubmitting(true);

    try {
      // If it's a Google event, delete it there first
      const eventToDelete = events.find(e => e.id === actionEventId);
      if (eventToDelete?.isGoogleEvent) {
        await deleteCalendarEvent(userId, String(actionEventId));
      }

      // Delete from Supabase
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', actionEventId);

      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== actionEventId));
      setSelectedDayEvents(prev => prev.filter(e => e.id !== actionEventId));

      setSubmitting(false);
      setPendingAction(null);
      setActionEventId(null);
      setActionReason('');

      if (selectedDayEvents.length <= 1) {
        setShowDayDetails(false);
      }
    } catch (err: any) {
      console.error('Error canceling event:', err.message || err);
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string | number) => {
    if (!userId) return;
    try {
      const eventToDelete = events.find(e => e.id === eventId);
      if (eventToDelete?.isGoogleEvent) {
        await deleteCalendarEvent(userId, String(eventId));
      }

      await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err: any) {
      console.error('[Calendar] delete error:', err);
    }
  };

  const handleConnectGoogle = () => {
    if (!userId) return;
    window.location.href = getGoogleAuthUrl(userId, '/calendar');
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
                <RefreshCw size={14} className={isLoadingEvents ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-[#8B4564] hover:bg-[#9D5373] text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
            >
              <Plus size={16} /> Create Event
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
                onClick={() => setActiveMobileTab('calendar')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeMobileTab === 'calendar' ? 'bg-[#8B4564] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Calendar size={14} /> Calendar
              </button>
              <button
                onClick={() => setActiveMobileTab('agenda')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeMobileTab === 'agenda' ? 'bg-[#8B4564] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Clock size={14} /> Events
              </button>
            </div>
          </div>

          {/* LEFT — Calendar Grid */}
          <div className={`${activeMobileTab === 'calendar' ? 'flex' : 'hidden md:flex'} flex-col flex-1 border-r border-white/5 overflow-y-auto p-4 md:p-5`}>
            <div className="bg-[#2A2A2A]/70 backdrop-blur border border-white/5 rounded-2xl p-5">
              {/* Google Auth Banner */}
              {!isCheckingAuth && !isGoogleConnected && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 rounded-xl border border-[#8B4564]/40 bg-[#8B4564]/10 p-4 flex items-start gap-3"
                >
                  <div className="p-1.5 bg-[#8B4564]/20 rounded-lg flex-shrink-0">
                    <Calendar size={16} className="text-[#E0A7C2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Connect Google Calendar</p>
                    <p className="text-xs text-gray-400 mt-0.5">Sync your events and let the AI schedule directly to your calendar.</p>
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
                  <Loader2 size={12} className="animate-spin" /> Checking Google Calendar…
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
                  onClick={() => { const d = new Date(viewYear, viewMonth - 1); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all"
                >
                  <ArrowLeft size={16} className="text-gray-400" />
                </button>
                <h2 className="font-bold text-white text-sm">{MONTHS[viewMonth]} {viewYear}</h2>
                <button
                  onClick={() => { const d = new Date(viewYear, viewMonth + 1); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all"
                >
                  <ArrowLeft size={16} className="text-gray-400 rotate-180" />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-gray-500 pb-2">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === NOW.getDate() && viewMonth === NOW.getMonth() && viewYear === NOW.getFullYear();
                  const hasEvent = eventDatesThisMonth.has(day);
                  return (
                    <div key={day}
                      onClick={() => {
                        if (hasEvent) {
                          const dayEvents = events.filter(e => {
                            const d = new Date(e.date_time || e.dateTime || '');
                            return d.getDate() === day && d.getMonth() === viewMonth && d.getFullYear() === viewYear;
                          });
                          setSelectedDayEvents(dayEvents);
                          setSelectedDay(day);
                          setShowDayDetails(true);
                        }
                      }}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg md:rounded-xl text-xs md:text-sm cursor-pointer transition-all relative
                      ${isToday ? 'bg-[#8B4564]/40 border border-[#8B4564]/60 text-white font-bold' : 'hover:bg-white/5 text-gray-400 hover:text-white'}
                      ${hasEvent ? 'hover:bg-[#8B4564]/20 font-medium' : ''}`}
                    >
                      {day}
                      {hasEvent && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#E0A7C2]" />}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(EVENT_COLORS).map(([type, c]) => (
                  <span key={type} className="flex items-center gap-1.5 text-[10px] text-gray-400 capitalize">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />{type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Events Panel */}
          <div className={`${activeMobileTab === 'agenda' ? 'flex' : 'hidden md:flex'} flex-col overflow-hidden w-full md:w-[340px] xl:w-[380px] flex-shrink-0`}>
            {/* Mobile: Google auth banner */}
            {!isCheckingAuth && !isGoogleConnected && (
              <div className="md:hidden mx-4 mt-4 rounded-xl border border-[#8B4564]/40 bg-[#8B4564]/10 p-3 flex items-center gap-3">
                <Calendar size={14} className="text-[#E0A7C2] flex-shrink-0" />
                <p className="text-xs text-gray-300 flex-1">Connect Google Calendar to sync events.</p>
                <button onClick={handleConnectGoogle} className="text-xs font-bold text-[#E0A7C2] hover:text-white transition-colors flex-shrink-0">Connect →</button>
              </div>
            )}

            {/* Tabs + Search */}
            <div className="flex-shrink-0 px-5 pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setActiveTab('upcoming'); setShowAll(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'upcoming' ? 'bg-[#8B4564]/30 border border-[#8B4564]/50 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Calendar size={14} /> Upcoming <span className="text-xs bg-[#8B4564]/40 px-1.5 py-0.5 rounded-full">{upcomingEvents.length}</span>
                </button>
                <button
                  onClick={() => { setActiveTab('accomplished'); setShowAll(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'accomplished' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <History size={14} /> Accomplished <span className="text-xs bg-emerald-500/20 px-1.5 py-0.5 rounded-full text-emerald-400">{accomplishedEvents.length}</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowAll(false); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#8B4564]/50 focus:ring-1 focus:ring-[#8B4564]/30 placeholder:text-gray-600 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Loading spinner */}
            {(isLoadingEvents || isLoading) && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" /> Loading events…
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
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                      <Loader2 size={32} className="text-[#E0A7C2] animate-spin mx-auto mb-4" />
                      <p className="text-sm text-gray-500">Loading your schedule...</p>
                    </motion.div>
                  ) : visibleList.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                      <div className="inline-flex p-4 bg-[#8B4564]/10 rounded-full mb-3">
                        {activeTab === 'accomplished' ? <CheckCircle size={28} className="text-emerald-400" /> : <Calendar size={28} className="text-[#E0A7C2]" />}
                      </div>
                      <p className="text-sm text-gray-400 font-medium">
                        {searchQuery ? `No results for "${searchQuery}"` : activeTab === 'upcoming' ? 'No upcoming events' : 'No accomplished events yet'}
                      </p>
                      {!isGoogleConnected && !isCheckingAuth && (
                        <p className="text-xs text-gray-600 mt-2">Connect Google Calendar to see your real events.</p>
                      )}
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
                        className={`bg-[#2A2A2A]/70 backdrop-blur border rounded-2xl p-4 hover:border-white/10 transition-all group ${activeTab === 'accomplished' ? 'border-white/5 opacity-75' : 'border-white/5'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${EVENT_COLORS[event.type].dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <h3 className="font-semibold text-white text-sm flex-1">{event.title}</h3>
                                {activeTab === 'accomplished' ? (
                                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <StatusBadge status={event.status} />
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock size={11} /> {formatDT(event.date_time)}</p>
                              {event.client_email && (
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><User size={11} /> {event.client_email}</p>
                              )}
                              {event.notes && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed italic">{event.notes}</p>}
                              {event.googleLink && (
                                <a
                                  href={event.googleLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1.5 flex items-center gap-1 text-[10px] text-[#E0A7C2] hover:text-white transition-colors"
                                >
                                  <LinkIcon size={10} /> Open in Google Calendar
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border flex-shrink-0 ${EVENT_COLORS[event.type].badge}`}>
                              {event.type}
                            </span>
                            {event.isGoogleEvent && activeTab === 'upcoming' && (
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-600 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                                title="Remove event"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
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
                    {showAll
                      ? <><ChevronUp size={14} /> Show Less</>
                      : <><ChevronDown size={14} /> Show {filteredList.length - 5} More</>
                    }
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Event Modal */}
        <AnimatePresence>
          {showCreate && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setShowCreate(false); setEditingEventId(null); setActionReason(''); setCreateError(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#10B981]/10 text-[#10B981] rounded-xl">
                      {editingEventId ? <Clock size={18} /> : <Calendar size={18} />}
                    </div>
                    <div>
                      <h2 className="font-bold text-white">{editingEventId ? 'Reschedule Event' : 'Create Event'}</h2>
                      <p className="text-xs text-gray-400">
                        {editingEventId ? 'Update appointment details' : 'Schedule a meeting, hearing, or appointment'}
                        {isGoogleConnected && !editingEventId && <span className="ml-1 text-emerald-400">→ syncs to Google Calendar</span>}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setShowCreate(false); setEditingEventId(null); setActionReason(''); setCreateError(null); }} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"><X size={18} /></button>
                </div>

                <div className="p-5 space-y-4">
                  {editingEventId && (
                    <div>
                      <label className="block text-xs font-semibold text-[#E0A7C2] uppercase tracking-wider mb-1.5">Reschedule Reason *</label>
                      <textarea
                        placeholder="Why are you rescheduling? (Mandatory)"
                        value={actionReason}
                        onChange={e => setActionReason(e.target.value)}
                        rows={2}
                        className="w-full bg-black/40 border border-[#E0A7C2]/30 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#E0A7C2]/60 placeholder:text-gray-600 resize-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Event Title *</label>
                    <input type="text" placeholder="e.g. RTC Hearing" value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#10B981]/50 placeholder:text-gray-600" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
                      <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CalendarEvent['type'] }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-[#10B981]/50 appearance-none cursor-pointer">
                        <option value="meeting">Meeting</option>
                        <option value="appointment">Appointment</option>
                        <option value="hearing">Hearing</option>
                        <option value="deposition">Deposition</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Date & Time *</label>
                      <input type="datetime-local" value={form.dateTime}
                        onChange={e => setForm(f => ({ ...f, dateTime: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#10B981]/50 [color-scheme:dark]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Client Email</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="email" placeholder="client@example.com" value={form.clientEmail}
                        onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#10B981]/50 placeholder:text-gray-600" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                    <textarea placeholder="Brief agenda or notes..." value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#10B981]/50 placeholder:text-gray-600 resize-none" />
                  </div>

                  {createError && (
                    <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <button onClick={handleSave} disabled={Boolean(!form.title || !form.dateTime || submitting || (editingEventId && !actionReason))}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${submitted ? 'bg-emerald-600 text-white'
                        : (!form.title || !form.dateTime || (editingEventId && !actionReason)) ? 'bg-[#10B981]/20 text-gray-500 cursor-not-allowed'
                          : 'bg-[#10B981] text-black hover:bg-white'
                      }`}
                  >
                    {submitted ? '✓ Saved!' : submitting ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Calendar size={15} /> Confirm & Save</>}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Day Details Modal */}
        <AnimatePresence>
          {showDayDetails && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowDayDetails(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#8B4564]/20 text-[#E0A7C2] rounded-xl"><Calendar size={18} /></div>
                    <div>
                      <h2 className="font-bold text-white">Events for {MONTHS[viewMonth]} {selectedDay}, {viewYear}</h2>
                    </div>
                  </div>
                  <button onClick={() => setShowDayDetails(false)} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"><X size={18} /></button>
                </div>

                <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
                  {selectedDayEvents.map((event, idx) => (
                    <div key={event.id} className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-base leading-tight mb-1">{event.title}</h3>
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
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${EVENT_COLORS[event.type || 'meeting'].badge}`}>
                          {event.type}
                        </span>
                      </div>

                      {event.notes && (
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-xs text-gray-400 italic leading-relaxed whitespace-pre-wrap line-clamp-3">{event.notes}</p>
                        </div>
                      )}

                      {/* Action Buttons & Reason Form */}
                      <div className="pt-3 border-t border-white/5">
                        {pendingAction && actionEventId === event.id ? (
                          <div className="space-y-3 bg-[#E0A7C2]/5 rounded-lg p-3 border border-[#E0A7C2]/20">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#E0A7C2]">Provide Reason for {pendingAction === 'cancel' ? 'Cancellation' : 'Rescheduling'}</label>
                            <textarea
                              autoFocus
                              value={actionReason}
                              onChange={e => setActionReason(e.target.value)}
                              placeholder={`Enter reason to ${pendingAction}...`}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#E0A7C2]/50 resize-none h-16"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => { setPendingAction(null); setActionReason(''); }} className="text-[10px] font-bold text-gray-500 hover:text-white">Back</button>
                              <button
                                onClick={() => {
                                  if (pendingAction === 'cancel') {
                                    handleCancelConfirm();
                                  } else {
                                    // Reschedule: pre-fill form and open create modal
                                    setEditingEventId(event.id);
                                    const dt = event.date_time || event.dateTime || '';
                                    setForm({
                                      title: event.title,
                                      type: event.type as CalendarEvent['type'],
                                      dateTime: dt.slice(0, 16),
                                      clientEmail: event.client_email || event.clientEmail || '',
                                      notes: event.notes || ''
                                    });
                                    setShowCreate(true);
                                    setPendingAction(null);
                                    setShowDayDetails(false);
                                  }
                                }}
                                disabled={Boolean(!actionReason || submitting)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${!actionReason ? 'bg-white/5 text-gray-600' : 'bg-[#E0A7C2] text-black hover:bg-white'
                                  }`}
                              >
                                {submitting ? 'Processing...' : `Confirm ${pendingAction}`}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setPendingAction('reschedule'); setActionEventId(event.id); }}
                              className="text-[10px] font-bold px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => { setPendingAction('cancel'); setActionEventId(event.id); }}
                              className="text-[10px] font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20"
                            >
                              Cancel Event
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 bg-black/10 flex justify-end">
                  <button
                    onClick={() => setShowDayDetails(false)}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </PageLayout>
    );
}
