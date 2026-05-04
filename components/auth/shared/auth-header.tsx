'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface AuthHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
}

export function AuthHeader({ 
  icon: Icon, 
  title, 
  description, 
  iconColor = "#722f37" 
}: AuthHeaderProps) {
  return (
    <>
      <motion.div
        className="flex justify-center mb-10"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center border border-white/10 bg-[rgba(255,255,255,0.05)] relative group`}>
          <div className="absolute inset-0 bg-secondary/10 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <Icon className="w-10 h-10 text-white relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.h1
        className="text-4xl md:text-5xl text-center text-white mb-4 font-serif leading-tight tracking-tight"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
      >
        {title}
      </motion.h1>

      <motion.p
        className="text-center text-on-surface/50 mb-12 font-light text-lg leading-relaxed px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {description}
      </motion.p>
    </>
  );
}
