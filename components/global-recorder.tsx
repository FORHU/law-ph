"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StopCircle } from "lucide-react";
import { useConversations } from "./conversation-provider/conversation-context";

export function GlobalRecorder() {
  const { isRecording, recordingTime, stopRecording, formatTime } = useConversations();

  // Find if any recording is active
  const activeId = Object.keys(isRecording).find((id) => isRecording[id]);

  if (!activeId) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        className="fixed bottom-28 right-4 md:right-8 z-[9999] flex items-center gap-2.5 bg-[#0B0B0C]/95 border border-[#722f37]/30 px-3 py-1.5 rounded-lg shadow-2xl backdrop-blur-xl cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping absolute inset-0" />
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full relative z-10" />
          </div>
          <span className="text-[#e9c176] font-mono text-sm font-bold min-w-[45px] tracking-widest uppercase">
            {formatTime(recordingTime[activeId] || 0)}
          </span>
        </div>

        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        <button
          onClick={() => stopRecording(activeId)}
          className="group flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-2 py-1.5 rounded-md transition-all duration-300 font-bold text-[9px]"
        >
          <StopCircle
            size={12}
            className="group-hover:scale-110 transition-transform"
          />
          Stop
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
