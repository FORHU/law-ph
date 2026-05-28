'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Users, X, UserMinus, Loader2, Crown, LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { motion, AnimatePresence } from 'framer-motion';

type Member = { id: string; name: string | null; email: string };

export function CaseMembersButton({ caseId, isOwner }: { caseId: string; isOwner: boolean }) {
  const { user } = useAuth();
  const { refreshCases } = useConversations();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [owner, setOwner] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/conversations/${caseId}/participants`)
      .then(r => r.ok ? r.json() : { owner: null, participants: [] })
      .then(j => {
        setOwner(j.owner ?? null);
        setMembers(j.participants ?? []);
      })
      .catch(() => { setOwner(null); setMembers([]); })
      .finally(() => setLoading(false));
  }, [isOpen, caseId]);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await fetch(`/api/conversations/${caseId}`, { method: 'DELETE' });
      await refreshCases();
      router.replace('/cases');
    } finally {
      setLeaving(false);
      setIsOpen(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await fetch(`/api/conversations/${caseId}/participants/${userId}`, { method: 'DELETE' });
      setMembers(prev => prev.filter(m => m.id !== userId));
    } finally {
      setRemovingId(null);
    }
  };

  const totalCount = (owner ? 1 : 0) + members.length;

  const renderMember = (m: Member, role: 'owner' | 'member') => {
    const isYou = m.id === user?.id;
    return (
      <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#722f37]/30 border border-[#722f37]/40 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#e9c176] uppercase">
            {(m.name || m.email).charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[12px] text-white font-medium truncate">{m.name || m.email}</p>
              {role === 'owner' && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest text-[#e9c176] bg-[#722f37]/20 border border-[#722f37]/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Crown size={8} /> Creator
                </span>
              )}
              {isYou && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  You
                </span>
              )}
            </div>
            {m.name && <p className="text-[10px] text-gray-500 truncate">{m.email}</p>}
          </div>
        </div>
        {isOwner && role === 'member' && (
          <button
            onClick={() => handleRemove(m.id)}
            disabled={removingId === m.id}
            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
            title="Remove from case"
          >
            {removingId === m.id
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <UserMinus className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    );
  };

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#0B0B0C] border border-[#722f37]/30 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
                    <Users className="w-5 h-5 text-[#e9c176]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif text-white tracking-tight">Case <span className="text-[#e9c176] italic">Members</span></h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                      {totalCount} {totalCount === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all border border-transparent hover:border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#e9c176]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {owner && renderMember(owner, 'owner')}
                  {members.map(m => renderMember(m, 'member'))}
                  {!owner && members.length === 0 && (
                    <p className="text-center text-[12px] text-gray-500 py-8">No members found.</p>
                  )}
                </div>
              )}

              {/* Leave button for participants */}
              {!isOwner && !loading && (
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="mt-6 w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  {leaving ? 'Leaving...' : 'Leave Case'}
                </button>
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
        onClick={() => setIsOpen(true)}
        className="text-[#e9c176] hover:text-white flex items-center gap-1.5 transition-colors text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-[#722f37]/20 hover:bg-[#722f37]/50 border border-[#722f37]/30 rounded-full"
      >
        <Users size={13} /> Members
      </button>
      {isMounted && createPortal(modal, document.body)}
    </>
  );
}
