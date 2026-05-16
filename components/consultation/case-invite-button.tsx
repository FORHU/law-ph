'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Copy, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';

export function CaseInviteButton({ caseId }: { caseId: string }) {
  const { loggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleGenerateLink = async () => {
    if (!loggedIn) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: caseId }),
      });

      if (!res.ok) throw new Error('Failed to create invite');
      const json = await res.json();
      const linkToken = json.invite.id;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteLink(`${origin}/case-invite/${linkToken}`);

      // Inject system message for group chat start
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: caseId,
          role: 'system',
          content: 'A group invite link was created for this case.',
        }),
      });
    } catch (err: any) {
      console.error("Failed to generate link", err);
      setError("Failed to create invite link. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
                    <h2 className="text-xl font-serif text-white tracking-tight">Institutional <span className="text-[#e9c176] italic">Invite</span></h2>
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
                Distribute this institutional link to authorize third-party participation. All sessions are ratified and recorded.
              </p>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
                    <Loader2 className="w-8 h-8 animate-spin text-[#e9c176]" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] animate-pulse">Ratifying Secure Token...</p>
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm text-red-200">
                  {error}
                </div>
              ) : inviteLink ? (
                <div className="space-y-4">
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
                    <p className="text-xs text-green-400 text-center font-medium">
                      Link copied to clipboard!
                    </p>
                  )}
                </div>
              ) : null}
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
          if (!inviteLink) handleGenerateLink();
        }}
        className="text-[#e9c176] hover:text-white flex items-center gap-1.5 transition-colors text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-[#722f37]/20 hover:bg-[#722f37]/50 border border-[#722f37]/30 rounded-full"
      >
        <UserPlus size={13} /> Case Invite
      </button>

      {isMounted && createPortal(modalContent, document.body)}
    </>
  );
}
