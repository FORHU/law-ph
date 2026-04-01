'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, AlertCircle, Calendar, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Initialize a public-only Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ConfirmationPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'confirmed' | 'declined'>('idle');

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  async function fetchEvent() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
      
      // Auto-confirm if pending or draft
      if (data.status === 'pending' || data.status === 'draft') {
        handleUpdateStatus('confirmed');
      }
    } catch (err: any) {
      console.error('Error fetching event:', err);
      setError('Could not find this appointment. It may have been removed or the link is invalid.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(newStatus: 'confirmed' | 'requested_change') {
    setStatus('submitting');
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          status: newStatus,
          client_feedback: feedback || null 
        })
        .eq('id', eventId);

      if (error) throw error;
      setStatus(newStatus === 'confirmed' ? 'confirmed' : 'declined');
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Failed to update. Please try again.');
    }
  }

  const downloadICS = () => {
    if (!event) return;
    const startDate = new Date(event.date_time);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().replace(/-|:/g, '').split('.')[0] + 'Z';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.notes || '').replace(/\n/g, '\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'appointment.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#8B4564] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1A1A1A] border border-white/10 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Appointment Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'This link is no longer valid.'}</p>
          <a href="/" className="text-[#E0A7C2] hover:underline font-medium">Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-2xl w-full bg-[#111111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#8B4564] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Legal Appointment</h1>
            <p className="text-[#E0A7C2] font-medium">Please review and confirm your availability</p>
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {status === 'confirmed' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-4">Confirmed!</h2>
                <p className="text-gray-400 mb-8">Your appointment is now locked in. We have notified our team.</p>
                
                <div className="flex flex-col gap-3 max-w-sm mx-auto mb-8">
                  <a 
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${new Date(event.date_time).toISOString().replace(/-|:/g, '').split('.')[0]}Z/${new Date(new Date(event.date_time).getTime() + 3600000).toISOString().replace(/-|:/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.notes || '')}`}
                    target="_blank"
                    className="w-full py-4 bg-[#10B981] text-black font-bold rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-white"
                  >
                    <Calendar size={18} />
                    Add to Google Calendar
                  </a>
                  <button 
                    onClick={downloadICS}
                    className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-white/10"
                  >
                    <ArrowRight size={18} className="rotate-90" />
                    Download calendar file (.ics)
                  </button>
                </div>

                <button 
                  onClick={() => window.close()} 
                  className="text-gray-500 hover:text-white transition-colors text-sm"
                >
                  Close This Window
                </button>
              </motion.div>
            ) : status === 'declined' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-4">Feedback Sent</h2>
                <p className="text-gray-400 mb-8">We have received your request for a schedule change. Our team will reach out to you shortly.</p>
                <button 
                  onClick={() => setStatus('idle')} 
                  className="text-[#E0A7C2] hover:underline"
                >
                  Changed your mind? Return to event details.
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Event Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#8B4564]/20 text-[#E0A7C2] rounded-xl">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{event.title}</h3>
                      <p className="text-sm text-gray-500 capitalize">{event.type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3 text-gray-300">
                      <Clock size={18} className="text-[#E0A7C2]" />
                      <span>{new Date(event.date_time).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {event.notes && (
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Subject / Notes</p>
                      <p className="text-gray-300 italic">"{event.notes}"</p>
                    </div>
                  )}
                </div>

                {/* Feedback Input */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-400">Add a note or suggest a new time (Optional)</label>
                  <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g. Can we move this to 2pm instead?"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-[#E0A7C2]/50 outline-none transition-all resize-none min-h-[100px]"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    disabled={status === 'submitting'}
                    onClick={() => handleUpdateStatus('confirmed')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {status === 'submitting' ? 'Processing...' : (
                      <>
                        <CheckCircle size={20} />
                        Confirm Attendance
                      </>
                    )}
                  </button>
                  <button 
                    disabled={status === 'submitting'}
                    onClick={() => handleUpdateStatus('requested_change')}
                    className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white font-bold py-4 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all"
                  >
                    Request Change
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 text-center text-xs text-gray-600">
          Powered by ILoveLawyer Legal Automation
        </div>
      </div>
    </div>
  );
}
