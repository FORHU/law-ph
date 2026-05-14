'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AuthButtonProps {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  delay?: number;
  onClick?: () => void;
  className?: string;
}

export function AuthButton({
  type = "submit",
  disabled = false,
  isLoading = false,
  loadingText,
  children,
  delay = 0.7,
  onClick,
  className = ""
}: AuthButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`w-full bg-[#722f37] hover:bg-[#8a3c46] text-white py-4 rounded-xl font-bold text-base transition-all shadow-xl hover:shadow-[#722f37]/20 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {isLoading ? (loadingText || "Processing...") : children}
    </motion.button>
  );
}
