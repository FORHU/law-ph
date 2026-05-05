'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ASSETS } from '@/lib/constants';
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
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0a0a0a] relative overflow-hidden text-white font-sans">
      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[#722f37]/10 mix-blend-overlay" />
      </div>
      
      <BackButton
        label={backButtonLabel}
        className="absolute top-8 left-8 z-20 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-[#722f37] transition-colors"
        fallbackHref={backButtonHref}
      />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 z-10">
        {mounted && (
          <motion.div
            className={`w-full ${maxWidth}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
}
 
