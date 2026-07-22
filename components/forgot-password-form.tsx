"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, CheckCircle } from 'lucide-react';
import { AUTH_ROUTES } from '@/lib/constants';
import { AuthLayout } from './auth/shared/auth-layout';
import { AuthCard } from './auth/shared/auth-card';
import { AuthHeader } from './auth/shared/auth-header';
import { AuthInput } from './auth/shared/auth-input';
import { AuthButton } from './auth/shared/auth-button';
import { useTranslation } from '@/lib/i18n/language-provider';

export function ForgotPasswordForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('auth.forgotPassword.failedToSend'));
      }
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || t('auth.forgotPassword.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      backButtonLabel={t('auth.forgotPassword.returnToLogin')}
      backButtonHref={AUTH_ROUTES.LOGIN}
      maxWidth="max-w-xl"
    >
      <AuthCard>
        {!isSubmitted ? (
          <>
            <AuthHeader
              icon={Lock}
              title={t('auth.forgotPassword.title')}
              description={t('auth.forgotPassword.subtitle')}
            />

            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthInput
                id="email"
                label={t('auth.forgotPassword.emailLabel')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
                required
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center bg-red-400/10 py-3 px-4 rounded-xl border border-red-400/20"
                >
                  {error}
                </motion.div>
              )}

              <AuthButton isLoading={isLoading} loadingText={t('auth.forgotPassword.ratifying')} className="uppercase tracking-widest font-bold">
                {t('auth.forgotPassword.sendResetLink')}
              </AuthButton>
            </form>

            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em]">
                {t('auth.forgotPassword.rememberedPassword')}{' '}
                <button
                  onClick={() => router.push(AUTH_ROUTES.LOGIN)}
                  className="text-[#e9c176] hover:text-white transition-colors cursor-pointer uppercase tracking-widest font-bold"
                >
                  {t('auth.forgotPassword.signIn')}
                </button>
              </p>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </motion.div>

            <motion.h1
              className="text-3xl md:text-4xl text-center text-white mb-2 font-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t('auth.forgotPassword.protocolInitiated')}
            </motion.h1>

            <motion.p
              className="text-center text-white/50 mb-8 font-light leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {t('auth.forgotPassword.sentInstructionsPrefix')} <span className="text-[#e9c176] font-bold">{email}</span>. {t('auth.forgotPassword.sentInstructionsSuffix')}
            </motion.p>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-[#0B0B0C]/60 border border-[#722f37]/20 rounded-2xl p-6">
                <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-3">
                  <strong className="text-[#e9c176]">{t('auth.forgotPassword.transmissionIssues')}</strong>
                </p>
                <ul className="text-white/40 text-[10px] font-medium space-y-2 list-none">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#722f37]" />
                    {t('auth.forgotPassword.checkSpam')}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#722f37]" />
                    {t('auth.forgotPassword.waitBeforeRetry')}
                  </li>
                </ul>
              </div>

              <AuthButton
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="bg-transparent border-2 border-[#722f37] hover:bg-[#722f37] uppercase tracking-widest font-bold text-[11px]"
              >
                {t('auth.forgotPassword.retryAlternative')}
              </AuthButton>

              <button
                onClick={() => router.push(AUTH_ROUTES.LOGIN)}
                className="w-full text-white/40 hover:text-white py-3 transition-colors cursor-pointer text-[10px] font-bold uppercase tracking-[0.2em]"
              >
                {t('auth.forgotPassword.returnToAuthenticator')}
              </button>
            </motion.div>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
