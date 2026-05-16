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

export function ForgotPasswordForm() {
  const router = useRouter();
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
        throw new Error(data.error || 'Failed to send reset email');
      }
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      backButtonLabel="Return to login"
      backButtonHref={AUTH_ROUTES.LOGIN}
      maxWidth="max-w-xl"
    >
      <AuthCard>
        {!isSubmitted ? (
          <>
            <AuthHeader
              icon={Lock}
              title="Reset Password"
              description="Enter your email address to reset your password."
            />

            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthInput
                id="email"
                label="EMAIL ADDRESS"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
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

              <AuthButton isLoading={isLoading} loadingText="RATIFYING REQUEST..." className="uppercase tracking-widest font-bold">
                SEND PASSWORD RESET LINK
              </AuthButton>
            </form>

            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em]">
                Remembered your password?{' '}
                <button
                  onClick={() => router.push(AUTH_ROUTES.LOGIN)}
                  className="text-[#e9c176] hover:text-white transition-colors cursor-pointer uppercase tracking-widest font-bold"
                >
                  Sign in
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
              Protocol Initiated
            </motion.h1>

            <motion.p
              className="text-center text-white/50 mb-8 font-light leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              We have dispatched recovery instructions to <span className="text-[#e9c176] font-bold">{email}</span>. Please verify your institutional inbox.
            </motion.p>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-[#0B0B0C]/60 border border-[#722f37]/20 rounded-2xl p-6">
                <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-3">
                  <strong className="text-[#e9c176]">Transmission Issues?</strong>
                </p>
                <ul className="text-white/40 text-[10px] font-medium space-y-2 list-none">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#722f37]" />
                    Inspect institutional spam or quarantine filters.
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#722f37]" />
                    Observe the 1-minute ratification interval.
                  </li>
                </ul>
              </div>

              <AuthButton
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="bg-transparent border-2 border-[#722f37] hover:bg-[#722f37] uppercase tracking-widest font-bold text-[11px]"
              >
                Retry Alternative Identifier
              </AuthButton>

              <button
                onClick={() => router.push(AUTH_ROUTES.LOGIN)}
                className="w-full text-white/40 hover:text-white py-3 transition-colors cursor-pointer text-[10px] font-bold uppercase tracking-[0.2em]"
              >
                Return to Authenticator
              </button>
            </motion.div>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
