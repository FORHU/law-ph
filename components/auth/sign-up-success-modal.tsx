'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import { COLORS } from '@/lib/constants';

interface SignUpSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function SignUpSuccessModal({ isOpen, onClose, email }: SignUpSuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#242424] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden"
          >
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B4564]/10 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <div className="relative z-10 text-center">
              {/* Icon Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, delay: 0.2 }}
                className="w-20 h-20 bg-[#8B4564]/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-[#8B4564]" />
              </motion.div>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                Thank you for signing up!
              </h2>
              
              <div className="flex items-center justify-center gap-2 text-[#8B4564] font-medium mb-6">
                <Mail size={18} />
                <span>Check your email to confirm</span>
              </div>

              <p className="text-white/60 mb-8 leading-relaxed">
                We've sent a verification link to <span className="text-white font-medium">{email}</span>. 
                Please check your inbox (and spam folder) to activate your account.
              </p>

              <button
                onClick={onClose}
                className="w-full bg-[#8B4564] hover:bg-[#a85678] text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-[#8B4564]/30 flex items-center justify-center gap-2 group"
              >
                Go to Login
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
