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
      className={`w-full bg-[#8B4564] hover:bg-[#a85678] text-white py-3 rounded-lg transition-all shadow-lg hover:shadow-[#8B4564]/20 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isLoading ? (loadingText || "Processing...") : children}
    </motion.button>
  );
}
