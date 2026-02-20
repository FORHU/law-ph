"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}${AUTH_ROUTES.UPDATE_PASSWORD}`,
      });
      
      if (resetError) throw resetError;
      
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      // Specifically handle the rate limit message or other Supabase errors
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
              description="Enter your email address and we'll send you instructions to reset your password"
            />

            <form onSubmit={handleSubmit} className="space-y-6">
              <AuthInput 
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm text-center bg-red-400/10 py-2 px-3 rounded-lg border border-red-400/20"
                >
                  {error}
                </motion.div>
              )}

              <AuthButton isLoading={isLoading} loadingText="Sending...">
                Send Reset Link
              </AuthButton>
            </form>

            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <p className="text-white/60 text-sm">
                Remember your password?{' '}
                <button
                  onClick={() => router.push(AUTH_ROUTES.LOGIN)}
                  className="text-[#8B4564] hover:text-[#a85678] transition-colors cursor-pointer"
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
              className="text-3xl md:text-4xl text-center text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Check Your Email
            </motion.h1>
            
            <motion.p
              className="text-center text-white/60 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              We've sent password reset instructions to <span className="text-[#8B4564]">{email}</span>
            </motion.p>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-[#1A1A1A]/60 border border-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm mb-2">
                  <strong className="text-white">Didn't receive the email?</strong>
                </p>
                <ul className="text-white/60 text-xs space-y-1 list-disc list-inside">
                  <li>Check your spam or junk folder</li>
                  <li>Wait a few minutes (Supabase has a 1-minute rate limit)</li>
                </ul>
              </div>

              <AuthButton 
                type="button" 
                onClick={() => setIsSubmitted(false)}
                className="bg-transparent border-2 border-[#8B4564] hover:bg-[#8B4564]"
              >
                Try Another Email
              </AuthButton>

              <button
                onClick={() => router.push(AUTH_ROUTES.LOGIN)}
                className="w-full text-white/60 hover:text-white py-3 transition-colors cursor-pointer text-sm font-medium"
              >
                Back to Login
              </button>
            </motion.div>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
