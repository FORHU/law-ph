'use client';

import React from 'react';
import BackButton from '../../back-button';

interface AuthLayoutProps {
  children: React.ReactNode;
  backButtonLabel?: string;
  backButtonHref?: string;
  maxWidth?: string;
}

export function AuthLayout({
  children,
  backButtonLabel = "Return",
  backButtonHref = "/",
  maxWidth = "max-w-xl"
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-transparent relative overflow-y-auto text-white font-sans scroll-smooth">
      {/* Ambient overlay to ensure text readability over the global background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0B0C]/20 to-[#0B0B0C]/60" />
      </div>

      <BackButton
        label={backButtonLabel}
        className="absolute top-8 left-8 z-20 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-[#722f37] transition-colors"
        fallbackHref={backButtonHref}
      />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 z-10">
        <div className={`w-full ${maxWidth}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
 
