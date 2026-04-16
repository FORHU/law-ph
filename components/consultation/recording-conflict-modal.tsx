"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Mic, StopCircle, CornerDownRight } from "lucide-react";
import { useConversations } from "../conversation-provider/conversation-context";

export function RecordingConflictModal() {
  const { 
    conflictRecordingId, 
    activeRecordingTitle, 
    resolveRecordingConflict 
  } = useConversations();

  if (!conflictRecordingId) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => resolveRecordingConflict(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-[380px] bg-[#1A1A1A] border border-[#8B4564]/30 rounded-[2rem] shadow-2xl overflow-hidden"
      >
        {/* Header Decor */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#8B4564] to-transparent opacity-40" />
        
        <div className="p-6">
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Mic className="text-red-500 w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight leading-tight">Recording in Progress</h3>
              <p className="text-[10px] text-[#E0A7C2]/60 uppercase tracking-[0.15em] font-bold">Overlap Detected</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <div className="flex gap-3 items-start">
                <div className="bg-[#8B4564]/10 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle size={14} className="text-[#E0A7C2]/80" />
                </div>
                <p className="text-[13px] leading-relaxed text-gray-400">
                  Active voice note for:
                  <span className="block mt-0.5 font-bold text-white text-sm italic line-clamp-2">
                    "{activeRecordingTitle}"
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-gray-500 pl-1">
              <CornerDownRight size={12} className="text-[#8B4564] mt-0.5 flex-shrink-0" />
              <span>Starting now will safely save the background recording.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-7">
            <button
              onClick={() => resolveRecordingConflict(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all border border-white/5 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => resolveRecordingConflict(true)}
              className="px-2.5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition-all shadow-lg shadow-red-500/10 active:scale-95 flex items-center justify-center gap-2"
            >
              <StopCircle size={13} />
              Start New Recording
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
