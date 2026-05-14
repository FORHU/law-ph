'use client';

import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="glass-panel backdrop-blur-2xl bg-[#0B0B0C]/60 border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] relative overflow-hidden">
      {/* Subtle top light effect */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#722f37]/50 to-transparent" />
      {children}
    </div>
  );
}
