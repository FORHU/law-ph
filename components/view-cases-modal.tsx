'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Trash2, FileText, Users, Loader2, AlertTriangle, LogOut } from 'lucide-react';
import { Portal } from './portal';
import { useConversations } from './conversation-provider/conversation-context';
import { CaseData } from '@/types';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth/auth-provider';

interface ViewCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CaseCard({ caseItem, onDelete, onClose }: { caseItem: CaseData; onDelete: (id: string) => Promise<void>; onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [deleting, setDeleting] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [participants, setParticipants] = React.useState<{ id: string; name: string | null; email: string }[]>([]);
  const [checkingParticipants, setCheckingParticipants] = React.useState(false);

  const isShared = !!caseItem.is_shared;

  const handleActionClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isShared) {
      // Participant leaving — no need to check other participants
      setParticipants([]);
      setShowConfirm(true);
      return;
    }
    setCheckingParticipants(true);
    try {
      const res = await fetch(`/api/conversations/${caseItem.id}/participants`);
      if (res.ok) {
        const json = await res.json();
        setParticipants(json.participants ?? []);
      }
    } catch {
      setParticipants([]);
    } finally {
      setCheckingParticipants(false);
      setShowConfirm(true);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    if (isShared) {
      await fetch(`/api/conversations/${caseItem.id}`, { method: 'DELETE' });
      onClose();
    } else {
      await onDelete(caseItem.id);
    }
    setDeleting(false);
    setShowConfirm(false);
  };

  return (
    <div 
      onClick={() => {
        onClose();
        router.push(`/cases/${caseItem.id}`);
      }}
      className="group p-4 bg-black/40 border border-[#722f37]/20 rounded-xl hover:border-white/10 transition-all cursor-pointer shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-[15px] text-white truncate tracking-tight">{caseItem.case_name}</h3>
          {caseItem.party_involved && (
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              <Users size={10} />
              <span className="truncate">{caseItem.party_involved}</span>
            </div>
          )}
          {caseItem.notes && (
            <div className="flex items-start gap-1.5 mt-2 text-[12px] text-gray-400">
              <FileText size={11} className="flex-shrink-0 mt-0.5 opacity-50" />
              <p className="line-clamp-2 leading-relaxed italic opacity-80">{caseItem.notes}</p>
            </div>
          )}
          <p className="mt-2 text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
            {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }) : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {(caseItem.user_id === user?.id || isShared) && (
            <button
              onClick={handleActionClick}
              disabled={checkingParticipants}
              className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all ${isShared ? 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'}`}
              title={isShared ? 'Leave Case' : 'Delete Case'}
            >
              {checkingParticipants
                ? <Loader2 size={16} className="animate-spin" />
                : isShared ? <LogOut size={16} /> : <Trash2 size={16} />}
            </button>
          )}
          {isShared && (
            <div className="p-2 text-[#e9c176]/60" title="Shared with you">
              <Users size={13} />
            </div>
          )}
        </div>
      </div>

      {/* Warning modal — shown via Portal so it floats above the cases list */}
      <AnimatePresence>
        {showConfirm && (
          <Portal>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                onClick={e => e.stopPropagation()}
                className="bg-[#0B0B0C] border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  {/* Icon + title */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${isShared ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'} border flex items-center justify-center flex-shrink-0`}>
                      {isShared
                        ? <LogOut className="w-6 h-6 text-yellow-400" />
                        : <AlertTriangle className="w-6 h-6 text-red-400" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-serif text-white tracking-tight">{isShared ? 'Leave Case?' : 'Delete Case?'}</h3>
                      <p className={`text-[10px] font-bold ${isShared ? 'text-yellow-400' : 'text-red-400'} uppercase tracking-widest mt-0.5`}>
                        {isShared ? 'You will lose access' : 'This cannot be undone'}
                      </p>
                    </div>
                  </div>

                  {isShared ? (
                    <p className="text-[13px] text-gray-300 leading-relaxed">
                      You will be removed from this case. The case and all its history will remain intact for the owner. The owner can re-invite you if needed.
                    </p>
                  ) : participants.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-[13px] text-gray-300 leading-relaxed">
                        <span className="text-white font-semibold">{participants.length} {participants.length === 1 ? 'lawyer is' : 'lawyers are'} currently collaborating</span> on this case. Deleting it will permanently remove their access to all messages, documents, and case history.
                      </p>
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-2">
                        {participants.map(p => (
                          <div key={p.id} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#722f37]/30 border border-[#722f37]/40 flex items-center justify-center flex-shrink-0">
                              <Users size={10} className="text-[#e9c176]" />
                            </div>
                            <span className="text-[12px] text-gray-300 truncate">{p.name || p.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-300 leading-relaxed">
                      All messages and case history will be permanently deleted.
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white ${isShared ? 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30' : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30'} border transition-all flex items-center justify-center gap-2`}
                    >
                      {deleting ? <Loader2 size={13} className="animate-spin" /> : null}
                      {deleting ? 'Please wait...' : isShared ? 'Leave Case' : 'Delete Case'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ViewCasesModal({ isOpen, onClose }: ViewCasesModalProps) {
  const { cases, handleDeleteCase, refreshCases } = useConversations();

  React.useEffect(() => {
    if (isOpen) refreshCases();
  }, [isOpen]);

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0B0B0C] border border-[#722f37]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-[#722f37]/20 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#722f37]/20 rounded-lg text-gray-400">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif text-white tracking-tight">My Cases</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{cases.length} case{cases.length !== 1 ? 's' : ''} found</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Cases list */}
              <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
                {cases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-6 bg-[#722f37]/10 rounded-3xl mb-6">
                      <Briefcase size={36} className="text-[#722f37]" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg font-serif text-white mb-2">No cases found.</p>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Create a new case to begin</p>
                  </div>
                ) : (
                  cases.map(c => (
                    <CaseCard key={c.id} caseItem={c} onDelete={handleDeleteCase} onClose={onClose} />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#722f37]/20 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 border border-[#722f37]/30 rounded-xl text-gray-400 hover:bg-white/5 transition-all font-bold text-[12px] uppercase tracking-widest"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
