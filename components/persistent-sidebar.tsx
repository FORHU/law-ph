'use client';

import { useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppSidebar } from '@/components/app-sidebar';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Users, Loader2, LogOut } from 'lucide-react';

type Participant = { id: string; name: string | null; email: string };

export function PersistentSidebar() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    recentConsultations,
    cases,
    handleNewConsultation,
    handleRemoveConsultation,
    handleRenameConsultation,
    handleDeleteCase,
    refreshCases,
    currentConsultationId,
    openSourceByItemId,
    addBookmark,
  } = useConversations();

  const pathname = usePathname();
  const router = useRouter();

  // Modal state — isLeave=true means "leave shared case", false means "delete owned case"
  const [pendingDelete, setPendingDelete] = useState<{ caseId: string; isLeave: boolean } | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [deleting, setDeleting] = useState(false);

  const isNoSidebarRoute =
    pathname === '/' ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/onboarding');

  const handleClose = useCallback(() => setIsSidebarOpen(false), [setIsSidebarOpen]);

  const handleLeaveCase = useCallback((caseId: string) => {
    setPendingDelete({ caseId, isLeave: true });
    setParticipants([]);
  }, []);

  const confirmDeleteCase = useCallback(async (caseId: string) => {
    try {
      const res = await fetch(`/api/conversations/${caseId}/participants`);
      const json = res.ok ? await res.json() : { participants: [] };
      setParticipants(json.participants ?? []);
    } catch {
      setParticipants([]);
    }
    setPendingDelete({ caseId, isLeave: false });
  }, []);

  const executePending = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);

    if (pendingDelete.isLeave) {
      // Participant leaving — use the conversation endpoint which handles leave
      await fetch(`/api/conversations/${pendingDelete.caseId}`, { method: 'DELETE' });
      await refreshCases();
    } else {
      await handleDeleteCase(pendingDelete.caseId);
    }

    setDeleting(false);
    setPendingDelete(null);
    setParticipants([]);

    if (pathname?.startsWith(`/cases/${pendingDelete.caseId}`)) {
      router.push('/consultation');
    }
  }, [pendingDelete, handleDeleteCase, refreshCases, pathname, router]);

  const recentItems = useMemo(() => [
    ...recentConsultations.map(item => ({
      ...item,
      type: 'consultation' as const,
      onClick: () => router.push(`/consultation/${item.id}`),
      onRemove: () => handleRemoveConsultation(item.id),
      onRename: (newTitle: string) => handleRenameConsultation(item.id, newTitle),
    })),
    ...(cases ?? []).map(c => ({
      id: c.id,
      title: c.case_name,
      subtitle: c.party_involved ?? undefined,
      type: 'case' as const,
      onClick: () => router.push(`/cases/${c.id}`),
      onRemove: c.is_shared
        ? () => handleLeaveCase(c.id)
        : () => confirmDeleteCase(c.id),
      onBookmark: () => addBookmark({
        itemId: c.id,
        title: c.case_name,
        reference: c.party_involved ?? null,
        type: 'case',
        url: `/cases/${c.id}`,
        aiSummary: c.notes ?? null,
        doctrine: null,
        facts: null,
      }),
    })),
  ], [recentConsultations, cases, router, handleRemoveConsultation, handleRenameConsultation, confirmDeleteCase, handleLeaveCase, addBookmark]);

  if (isNoSidebarRoute) return null;

  const isLeave = pendingDelete?.isLeave ?? false;

  const warningModal = pendingDelete && createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          className={`bg-[#0B0B0C] border ${isLeave ? 'border-yellow-500/30' : 'border-red-500/30'} rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden`}
        >
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${isLeave ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'} border flex items-center justify-center flex-shrink-0`}>
                {isLeave
                  ? <LogOut className="w-6 h-6 text-yellow-400" />
                  : <AlertTriangle className="w-6 h-6 text-red-400" />}
              </div>
              <div>
                <h3 className="text-lg font-serif text-white tracking-tight">
                  {isLeave ? 'Leave Case?' : 'Delete Case?'}
                </h3>
                <p className={`text-[10px] font-bold ${isLeave ? 'text-yellow-400' : 'text-red-400'} uppercase tracking-widest mt-0.5`}>
                  {isLeave ? 'You will lose access' : 'This cannot be undone'}
                </p>
              </div>
            </div>

            {isLeave ? (
              <p className="text-[13px] text-gray-300 leading-relaxed">
                You will be removed from this case. The case and all its history will remain intact for the owner. The owner can re-invite you if needed.
              </p>
            ) : participants.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[13px] text-gray-300 leading-relaxed">
                  <span className="text-white font-semibold">
                    {participants.length} {participants.length === 1 ? 'lawyer is' : 'lawyers are'} currently collaborating
                  </span>{' '}
                  on this case. Deleting it will permanently remove their access to all messages, documents, and case history.
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
                onClick={() => { setPendingDelete(null); setParticipants([]); }}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executePending}
                disabled={deleting}
                className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white ${isLeave ? 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30' : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30'} border transition-all flex items-center justify-center gap-2`}
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : null}
                {deleting ? 'Please wait...' : isLeave ? 'Leave Case' : 'Delete Case'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={handleClose}
        recentItems={recentItems}
        onNewItem={handleNewConsultation}
        recentLabel="RECENT"
        currentConsultationId={currentConsultationId}
        openSourceByItemId={openSourceByItemId}
      />
      {warningModal}
    </>
  );
}
