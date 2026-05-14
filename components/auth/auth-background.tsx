import React from 'react';
import { motion } from 'framer-motion';
import { ASSETS } from '@/lib/constants';

/**
 * Shared background component used across landing page and auth pages
 * Features the Lady Justice image with animated gradient orbs
 */
export function AuthBackground() {
  return (
    <div className="fixed inset-0 z-0">

      <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/70 via-[#1A1A1A]/50 to-[#1A1A1A]/90"></div>
      {/* Static gradient orbs instead of animated to reduce lag */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#722f37]/10 rounded-full blur-3xl"
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#722f37]/10 rounded-full blur-3xl"
      />
    </div>
  );
}
