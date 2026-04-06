'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Copy, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';

export function CaseInviteButton({ caseId }: { caseId: string }) {
  const { supabase, session } = useAuth();
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
    if (!supabase || !session?.user?.id) return;
    setIsGenerating(true);
    setError(null);

    try {
      // 1. Check if invite already exists
      const { data: existing, error: fetchError } = await supabase
        .from('conversation_invites')
        .select('*')
        .eq('conversation_id', caseId)
        .single();

      let linkToken = existing?.id;

      if (!existing && fetchError?.code === 'PGRST116') {
        // 2. Generate a new invite
        const { data: newInvite, error: insertError } = await supabase
          .from('conversation_invites')
          .insert({
            conversation_id: caseId,
            created_by: session.user.id
          })
          .select()
          .single();

        if (insertError) throw insertError;
        linkToken = newInvite.id;

        // Automatically inject a system message denoting the group chat was started
        const displayName = session.user.user_metadata?.full_name || session.user.email || 'You';
        await supabase.from('messages').insert({
          conversation_id: caseId,
          role: 'system',
          content: `${displayName} started the group chat with a group link.`
        });

      } else if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (linkToken) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setInviteLink(`${origin}/case-invite/${linkToken}`);
      }
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
            className="bg-[#1A1A1A] border border-[#8B4564]/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#E0A7C2]" />
                  Case Invite Link
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                Share this link to invite others to this case. They will be able to view the history and participate.
              </p>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E0A7C2]" />
                  <p className="text-sm text-gray-400">Generating secure link...</p>
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
                      className="p-2 shrink-0 bg-[#8B4564]/20 hover:bg-[#8B4564]/40 text-[#E0A7C2] rounded-md transition-colors flex items-center justify-center w-10 h-10"
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
        className="text-[#E0A7C2] hover:text-white flex items-center gap-1.5 transition-colors text-xs font-semibold px-3 py-1.5 bg-[#8B4564]/20 hover:bg-[#8B4564]/50 border border-[#8B4564]/30 rounded-full"
      >
        <UserPlus size={13} /> Case Invite
      </button>

      {isMounted && createPortal(modalContent, document.body)}
    </>
  );
}
