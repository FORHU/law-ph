'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AuthBackground } from '../auth-background';
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
  maxWidth = "max-w-2xl"
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0a0e17] relative overflow-hidden text-white font-sans">
      <AuthBackground />
      
      <BackButton
        label={backButtonLabel}
        className="absolute top-6 left-6 z-20"
        fallbackHref={backButtonHref}
      />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 z-10">
        <motion.div
          className={`w-full ${maxWidth}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
