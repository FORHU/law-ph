"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { Portal } from "../portal";

export function LogoutLoadingOverlay() {
  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1100] bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 pointer-events-auto"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-16 h-16 rounded-full border-t-2 border-r-2"
            style={{ borderColor: COLORS.PRIMARY }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-pulse" style={{ color: COLORS.PRIMARY }} />
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-xl font-medium text-white mb-2 tracking-tight">Signing out...</h2>
          <p className="text-gray-500 text-sm max-w-[200px] leading-relaxed">
            Please wait while we secure your legal session.
          </p>
        </div>
      </motion.div>
    </Portal>
  );
}
