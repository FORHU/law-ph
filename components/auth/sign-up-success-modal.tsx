'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import { COLORS } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n/language-provider';

interface SignUpSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function SignUpSuccessModal({ isOpen, onClose, email }: SignUpSuccessModalProps) {
  const { t } = useTranslation();
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#722f37]/10 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <div className="relative z-10 text-center">
              {/* Icon Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, delay: 0.2 }}
                className="w-24 h-24 bg-[#722f37]/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-[#722f37]/30 shadow-2xl shadow-[#722f37]/20"
              >
                <CheckCircle2 className="w-12 h-12 text-[#e9c176]" />
              </motion.div>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t('auth.signupSuccess.title')}
              </h2>

              <div className="flex items-center justify-center gap-3 text-[#e9c176] font-bold mb-8 uppercase tracking-[0.2em] text-[10px]">
                <Mail size={18} />
                <span>{t('auth.signupSuccess.checkEmail')}</span>
              </div>

              <p className="text-white/60 mb-8 leading-relaxed">
                {t('auth.signupSuccess.descPrefix')} <span className="text-white font-medium">{email}</span>.{' '}
                {t('auth.signupSuccess.descSuffix')}
              </p>

              <button
                onClick={onClose}
                className="w-full bg-[#722f37] hover:bg-[#8b3a44] text-white py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#722f37]/20 flex items-center justify-center gap-3 group"
              >
                {t('auth.signupSuccess.goToLogin')}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
