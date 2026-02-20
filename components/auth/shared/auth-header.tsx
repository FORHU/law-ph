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
  iconColor = "#8B4564" 
}: AuthHeaderProps) {
  return (
    <>
      <motion.div
        className="flex justify-center mb-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${iconColor}20` }}>
          <Icon className="w-8 h-8" style={{ color: iconColor }} />
        </div>
      </motion.div>

      <motion.h1
        className="text-3xl md:text-4xl text-center text-white mb-2"
        style={{ fontFamily: "'Playfair Display', serif" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {title}
      </motion.h1>

      <motion.p
        className="text-center text-white/60 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {description}
      </motion.p>
    </>
  );
}
