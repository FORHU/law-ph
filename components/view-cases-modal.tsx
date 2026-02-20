'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Trash2, FileText, Users, Loader2 } from 'lucide-react';
import { Portal } from './portal';
import { useConversations } from './conversation-provider/conversation-context';
import { CaseData } from '@/types';

interface ViewCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CaseCard({ caseItem, onDelete }: { caseItem: CaseData; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(caseItem.id);
    setDeleting(false);
    setShowConfirm(false);
  };

  return (
    <div className="group p-4 bg-black/30 border border-[#8B4564]/20 rounded-xl hover:border-[#8B4564]/40 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{caseItem.case_name}</h3>
          {caseItem.party_involved && (
            <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray-400">
              <Users size={11} />
              <span className="truncate">{caseItem.party_involved}</span>
            </div>
          )}
          {caseItem.notes && (
            <div className="flex items-start gap-1.5 mt-2 text-[12px] text-gray-500">
              <FileText size={11} className="flex-shrink-0 mt-0.5" />
              <p className="line-clamp-2 leading-relaxed">{caseItem.notes}</p>
            </div>
          )}
          <p className="mt-2 text-[11px] text-gray-600">
            {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }) : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <AnimatePresence mode="wait">
            {!showConfirm ? (
              <motion.button
                key="delete-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConfirm(true)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                title="Delete Case"
              >
                <Trash2 size={16} />
              </motion.button>
            ) : (
              <motion.div
                key="confirm-btns"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2"
              >
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-[11px] font-bold transition-all flex items-center gap-1"
                >
                  {deleting ? <Loader2 size={11} className="animate-spin" /> : "Delete"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#1A1A1A] border border-[#8B4564]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-[#8B4564]/20 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#8B4564]/20 rounded-lg text-[#E0A7C2]">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">My Cases</h2>
                    <p className="text-[12px] text-gray-500">{cases.length} case{cases.length !== 1 ? 's' : ''} found</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Cases list */}
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {cases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-[#8B4564]/10 rounded-2xl mb-3">
                      <Briefcase size={28} className="text-[#8B4564]" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">No cases yet</p>
                    <p className="text-[12px] text-gray-600 mt-1">Create a case using the "Create Case" button.</p>
                  </div>
                ) : (
                  cases.map(c => (
                    <CaseCard key={c.id} caseItem={c} onDelete={handleDeleteCase} />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#8B4564]/20 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 border border-[#8B4564]/30 rounded-xl text-gray-400 hover:bg-white/5 transition-all font-medium text-[13px]"
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
