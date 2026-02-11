"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { Portal } from "../portal";

interface LogoutConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmationModal({ onClose, onConfirm }: LogoutConfirmationModalProps) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden pointer-events-auto">
        {/* Backdrop with higher z-index and explicit blocking */}
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
          className="relative w-full max-w-sm bg-[#1A1A1A] border p-1 rounded-2xl shadow-2xl"
          style={{ borderColor: `${COLORS.PRIMARY}33` }}
        >
          <div className="bg-[#1A1A1A]/80 p-6 rounded-[calc(1rem-4px)]">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${COLORS.PRIMARY}22` }}>
                <AlertCircle className="w-6 h-6" style={{ color: COLORS.PRIMARY }} />
              </div>
              <h3 className="text-xl font-semibold text-white">Confirm Logout</h3>
            </div>
            
            <p className="text-gray-400 mb-8 leading-relaxed text-sm">
              Are you sure you want to sign out? You'll need to login again to access your consultations and legal documents.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-3 text-sm font-medium text-white rounded-xl transition-all shadow-lg active:scale-95"
                style={{ 
                  backgroundColor: COLORS.PRIMARY,
                  boxShadow: `0 10px 15px -3px ${COLORS.PRIMARY}44, 0 4px 6px -2px ${COLORS.PRIMARY}22`
                }}
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
