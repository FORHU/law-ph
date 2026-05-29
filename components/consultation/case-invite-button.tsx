'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Copy, Check, Loader2, X, RefreshCw, Clock, UserMinus } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';

export function CaseInviteButton({ caseId }: { caseId: string }) {
  const { loggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // Load participants whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/conversations/${caseId}/participants`)
      .then(r => r.ok ? r.json() : { participants: [] })
      .then(j => setParticipants(j.participants ?? []))
      .catch(() => {});
  }, [isOpen, caseId]);

  const handleRemoveParticipant = async (userId: string) => {
    setRemovingId(userId);
    try {
      await fetch(`/api/conversations/${caseId}/participants/${userId}`, { method: 'DELETE' });
      setParticipants(prev => prev.filter(p => p.id !== userId));
    } finally {
      setRemovingId(null);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const handleGenerateLink = useCallback(async () => {
    if (!loggedIn) return;
    setIsGenerating(true);
    setError(null);
    setInviteLink(null);
    setExpiresAt(null);

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: caseId }),
      });

      if (!res.ok) throw new Error('Failed to create invite');
      const json = await res.json();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteLink(`${origin}/case-invite/${json.invite.id}`);
      setExpiresAt(new Date(json.invite.expiresAt));
    } catch (err: any) {
      console.error("Failed to generate link", err);
      setError("Failed to create invite link. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [loggedIn, caseId]);

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isExpired = secondsLeft === 0 && !!expiresAt;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#0B0B0C] border border-[#722f37]/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
                    <UserPlus className="w-5 h-5 text-[#e9c176]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif text-white tracking-tight">Case <span className="text-[#e9c176] italic">Invite</span></h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Secure Collaboration Access</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all border border-transparent hover:border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[12px] text-gray-400 mb-8 leading-relaxed font-medium">
                Share this link with anyone who should collaborate on this case. The link is valid for <span className="text-[#e9c176]">5 minutes</span> and can be used by multiple people.
              </p>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
                    <Loader2 className="w-8 h-8 animate-spin text-[#e9c176]" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] animate-pulse">Generating link...</p>
                </div>
              ) : error ? (
                <div className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm text-red-200">
                    {error}
                  </div>
                  <button
                    onClick={handleGenerateLink}
                    className="w-full py-3 bg-[#722f37]/20 hover:bg-[#722f37]/40 text-[#e9c176] rounded-xl text-[11px] font-bold uppercase tracking-widest border border-[#722f37]/30 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                  </button>
                </div>
              ) : inviteLink ? (
                <div className="space-y-4">
                  {/* Countdown */}
                  <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${isExpired ? 'text-red-400' : 'text-[#e9c176]'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {isExpired ? 'Link expired' : `Expires in ${mm}:${ss}`}
                  </div>

                  {isExpired ? (
                    <button
                      onClick={handleGenerateLink}
                      className="w-full py-3 bg-[#722f37]/20 hover:bg-[#722f37]/40 text-[#e9c176] rounded-xl text-[11px] font-bold uppercase tracking-widest border border-[#722f37]/30 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Generate New Link
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-1">
                        <input
                          type="text"
                          readOnly
                          value={inviteLink}
                          className="w-full bg-transparent text-sm text-white px-3 focus:outline-none"
                        />
                        <button
                          onClick={handleCopy}
                          className="p-2 shrink-0 bg-[#722f37]/20 hover:bg-[#722f37]/40 text-[#e9c176] rounded-md transition-colors flex items-center justify-center w-10 h-10 border border-[#722f37]/30"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      {copied && (
                        <p className="text-xs text-green-400 text-center font-medium">Link copied to clipboard!</p>
                      )}
                      <button
                        onClick={handleGenerateLink}
                        className="w-full py-2.5 bg-transparent hover:bg-white/5 text-gray-500 hover:text-gray-300 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/5 hover:border-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3 h-3" /> Generate New Link
                      </button>
                    </>
                  )}
                </div>
              ) : null}

              {/* Current members */}
              {participants.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Current Members ({participants.length})
                  </p>
                  <div className="space-y-2">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#722f37]/30 border border-[#722f37]/40 flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-3 h-3 text-[#e9c176]" />
                          </div>
                          <span className="text-[12px] text-gray-300 truncate">{p.name || p.email}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveParticipant(p.id)}
                          disabled={removingId === p.id}
                          className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                          title="Remove from case"
                        >
                          {removingId === p.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <UserMinus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          if (!inviteLink || isExpired) handleGenerateLink();
        }}
        className="text-[#e9c176] hover:text-white flex items-center gap-1.5 transition-colors text-[10px] font-bold uppercase tracking-widest px-2 sm:px-4 py-2 bg-[#722f37]/20 hover:bg-[#722f37]/50 border border-[#722f37]/30 rounded-full"
      >
        <UserPlus size={13} /> <span className="hidden sm:inline">Case Invite</span>
      </button>

      {isMounted && createPortal(modalContent, document.body)}
    </>
  );
}
