'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, X, ArrowLeft, Menu, Clock, User,
  Search, ChevronDown, ChevronUp, CheckCircle, History, Loader2
} from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { ASSETS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

interface CalendarEvent {
  id: string | number;
  title: string;
  type: 'meeting' | 'appointment' | 'hearing' | 'deposition';
  date_time: string;
  client_email?: string;
  notes?: string;
}

const EVENT_COLORS: Record<string, { badge: string; dot: string }> = {
  meeting:     { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  appointment: { badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  hearing:     { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  deposition:  { badge: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-400' },
};

const NOW = new Date();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatDT(dt: string) {
  try { return new Date(dt).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }); }
  catch { return dt; }
}

export default function CalendarPage() {
  const router  = useRouter();
  const { isSidebarOpen, setIsSidebarOpen } = useConversations();
  const { supabase, session, loggedIn } = useAuth();
  const userId = session?.user?.id;

  const [events, setEvents]           = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [viewMonth, setViewMonth]     = useState(NOW.getMonth());
  const [viewYear, setViewYear]       = useState(NOW.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab]     = useState<'upcoming' | 'accomplished'>('upcoming');
  const [showAll, setShowAll]         = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
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

  const [form, setForm]               = useState({ title: '', type: 'meeting', dateTime: '', clientEmail: '', notes: '' });
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  // Fetch events from Supabase
  const fetchEvents = async () => {
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
        setEvents(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn && userId) {
      fetchEvents();
    }
  }, [loggedIn, userId]);

  // Split events into upcoming / accomplished
  const upcomingEvents     = useMemo(() => events.filter(e => new Date(e.date_time) >= NOW).sort((a,b) => a.date_time.localeCompare(b.date_time)), [events]);
  const accomplishedEvents = useMemo(() => events.filter(e => new Date(e.date_time) < NOW).sort((a,b) => b.date_time.localeCompare(a.date_time)), [events]);

  const activeList = activeTab === 'upcoming' ? upcomingEvents : accomplishedEvents;

  // AJAX-like search filtering
  const filteredList = useMemo(() =>
    searchQuery.trim()
      ? activeList.filter(e =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.client_email || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : activeList,
    [activeList, searchQuery]
  );

  const visibleList  = showAll ? filteredList : filteredList.slice(0, 5);
  const hasMore      = filteredList.length > 5;

  // Calendar grid helpers
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const eventDatesThisMonth = new Set(
    events
      .filter(e => { const d = new Date(e.date_time); return d.getMonth() === viewMonth && d.getFullYear() === viewYear; })
      .map(e => new Date(e.date_time).getDate())
  );

  const handleSave = async () => {
    if (!form.title || !form.dateTime || !userId) return;
    setSubmitting(true);
    
    try {
      if (editingEventId) {
        // Update existing event
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
        setEvents(prev => prev.map(e => e.id === editingEventId ? (data as CalendarEvent) : e));
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            title: form.title,
            type: form.type,
            date_time: form.dateTime,
            client_email: form.clientEmail,
            notes: form.notes
          })
          .select()
          .single();

        if (error) throw error;
        setEvents(prev => [...prev, data as CalendarEvent]);
      }

      setSubmitting(false); 
      setSubmitted(true);
      setTimeout(() => { 
        setSubmitted(false); 
        setShowCreate(false); 
        setEditingEventId(null);
        setActionReason('');
        setForm({ title:'', type:'meeting', dateTime:'', clientEmail:'', notes:'' }); 
      }, 2000);
    } catch (err: any) {
      console.error('Error saving event:', err.message || err);
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!actionEventId || !actionReason || !userId) return;
    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', actionEventId);

      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== actionEventId));
      setSelectedDayEvents(prev => prev.filter(e => e.id !== actionEventId));
      
      // Optionally log reason (using notes or a separate log table)
      // For now, we just proceed with deletion as requested
      
      setSubmitting(false);
      setPendingAction(null);
      setActionEventId(null);
      setActionReason('');
      
      // If no more events for this day, close popup
      if (selectedDayEvents.length <= 1) {
        setShowDayDetails(false);
      }
    } catch (err: any) {
      console.error('Error canceling event:', err.message || err);
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      activePage="calendar"
      title="Calendar"
      subtitle="Legal appointments and hearings"
      headerActions={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#8B4564] hover:bg-[#9D5373] text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
        >
          <Plus size={16} /> Create Event
        </button>
      }
      maxWidth="max-w-7xl"
    >
      <div className="flex flex-col md:flex-row flex-1 h-full relative z-10 overflow-hidden">
          {/* Mobile View Toggle */}
          <div className="md:hidden flex-shrink-0 px-5 pt-4 pb-2 border-b border-white/5 bg-black/20">
            <div className="bg-[#2A2A2A] p-1 rounded-xl flex items-center gap-1">
              <button 
                onClick={() => setActiveMobileTab('calendar')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeMobileTab === 'calendar' ? 'bg-[#8B4564] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Calendar size={14} /> Calendar
              </button>
              <button 
                onClick={() => setActiveMobileTab('agenda')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeMobileTab === 'agenda' ? 'bg-[#8B4564] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Clock size={14} /> Events
              </button>
            </div>
          </div>

          {/* LEFT — Calendar Grid */}
          <div className={`${activeMobileTab === 'calendar' ? 'flex' : 'hidden md:flex'} flex-col flex-1 border-r border-white/5 overflow-y-auto p-4 md:p-5`}>
            <div className="bg-[#2A2A2A]/70 backdrop-blur border border-white/5 rounded-2xl p-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => { const d = new Date(viewYear, viewMonth - 1); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <ArrowLeft size={16} className="text-gray-400" />
                </button>
                <h2 className="font-bold text-white text-sm">{MONTHS[viewMonth]} {viewYear}</h2>
                <button onClick={() => { const d = new Date(viewYear, viewMonth + 1); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all">
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
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === NOW.getDate() && viewMonth === NOW.getMonth() && viewYear === NOW.getFullYear();
                  const hasEvent = eventDatesThisMonth.has(day);
                  return (
                    <div key={day}
                      onClick={() => {
                        if (hasEvent) {
                          const dayEvents = events.filter(e => {
                            const d = new Date(e.date_time);
                            return d.getDate() === day && d.getMonth() === viewMonth && d.getFullYear() === viewYear;
                          });
                          setSelectedDayEvents(dayEvents);
                          setSelectedDay(day);
                          setShowDayDetails(true);
                        }
                      }}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg md:rounded-xl text-xs md:text-sm cursor-pointer transition-all relative
                        ${isToday ? 'bg-[#8B4564]/40 border border-[#8B4564]/60 text-white font-bold' : 'hover:bg-white/5 text-gray-400 hover:text-white'}
                        ${hasEvent ? 'hover:bg-[#8B4564]/20' : ''}`}
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
            {/* Tabs + Search */}
            <div className="flex-shrink-0 px-5 pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setActiveTab('upcoming'); setShowAll(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'upcoming' ? 'bg-[#8B4564]/30 border border-[#8B4564]/50 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Calendar size={14} /> Upcoming <span className="text-xs bg-[#8B4564]/40 px-1.5 py-0.5 rounded-full">{upcomingEvents.length}</span>
                </button>
                <button
                  onClick={() => { setActiveTab('accomplished'); setShowAll(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'accomplished' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
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

            {/* Events List */}
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
                      className={`bg-[#2A2A2A]/70 backdrop-blur border rounded-2xl p-4 hover:border-white/10 transition-all ${
                        activeTab === 'accomplished' ? 'border-white/5 opacity-75' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${EVENT_COLORS[event.type].dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <h3 className="font-semibold text-white text-sm flex-1">{event.title}</h3>
                              {activeTab === 'accomplished' && (
                                <CheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock size={11} /> {formatDT(event.date_time)}</p>
                            {event.client_email && (
                              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><User size={11} /> {event.client_email}</p>
                            )}
                            {event.notes && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed italic">{event.notes}</p>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border flex-shrink-0 ${EVENT_COLORS[event.type].badge}`}>
                          {event.type}
                        </span>
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
          </div>
        </div>

        {/* Create Event Modal */}
        <AnimatePresence>
          {showCreate && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
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
                      <p className="text-xs text-gray-400">{editingEventId ? 'Update appointment details' : 'Schedule a meeting, hearing, or appointment'}</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowCreate(false); setEditingEventId(null); setActionReason(''); }} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"><X size={18} /></button>
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
                      <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
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

                  <button onClick={handleSave} disabled={Boolean(!form.title || !form.dateTime || submitting || (editingEventId && !actionReason))}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      submitted ? 'bg-emerald-600 text-white'
                        : (!form.title || !form.dateTime || (editingEventId && !actionReason)) ? 'bg-[#10B981]/20 text-gray-500 cursor-not-allowed'
                        : 'bg-[#10B981] text-black hover:bg-white'
                    }`}
                  >
                    {submitted ? '✓ Saved!' : submitting ? 'Saving...' : <><Calendar size={15} /> Confirm & Save</>}
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
                      <p className="text-xs text-gray-400">Scheduled appointments and activities</p>
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
                              {new Date(event.date_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                            {event.client_email && (
                              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                <User size={13} className="text-[#E0A7C2]" /> 
                                {event.client_email}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${EVENT_COLORS[event.type].badge}`}>
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
                                    setForm({ 
                                      title: event.title, 
                                      type: event.type, 
                                      dateTime: event.date_time.slice(0, 16), 
                                      clientEmail: event.client_email || '', 
                                      notes: event.notes || '' 
                                    });
                                    setShowCreate(true);
                                    setPendingAction(null);
                                    setShowDayDetails(false);
                                  }
                                }}
                                disabled={Boolean(!actionReason || submitting)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                  !actionReason ? 'bg-white/5 text-gray-600' : 'bg-[#E0A7C2] text-black hover:bg-white'
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
