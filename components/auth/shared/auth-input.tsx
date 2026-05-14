'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

interface AuthInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  delay?: number;
  minLength?: number;
}

export function AuthInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  delay = 0.6,
  minLength
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <label htmlFor={id} className="block text-white/60 mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] ml-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-5 py-3.5 bg-[rgba(255,255,255,0.05)] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-secondary/40 focus:bg-[rgba(255,255,255,0.08)] transition-all duration-300 ${isPassword ? 'pr-14' : ''}`}
          required={required}
          minLength={minLength}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
