"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, CheckCircle } from "lucide-react";
import { AUTH_ROUTES } from "@/lib/constants";
import { AuthLayout } from "./auth/shared/auth-layout";
import { AuthCard } from "./auth/shared/auth-card";
import { AuthHeader } from "./auth/shared/auth-header";
import { AuthInput } from "./auth/shared/auth-input";
import { AuthButton } from "./auth/shared/auth-button";
import { useTranslation } from '@/lib/i18n/language-provider';

export function UpdatePasswordForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? undefined;

  const [password, setPassword] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, token }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('auth.updatePassword.failedToUpdate'));
      }
      setIsSubmitted(true);
      setTimeout(() => { router.push(AUTH_ROUTES.LOGIN); }, 3000);
    } catch (error: any) {
      setError(error.message || t('auth.updatePassword.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      backButtonLabel={t('auth.updatePassword.returnToLogin')}
      backButtonHref={AUTH_ROUTES.LOGIN}
      maxWidth="max-w-2xl"
    >
      <AuthCard>
        {!isSubmitted ? (
          <>
            <AuthHeader
              icon={Lock}
              title={t('auth.updatePassword.title')}
              description={t('auth.updatePassword.subtitle')}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
              <AuthInput
                id="password"
                label={t('auth.updatePassword.newPasswordLabel')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.updatePassword.newPasswordPlaceholder')}
                required
                minLength={6}
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

              <AuthButton isLoading={isLoading} loadingText={t('auth.updatePassword.updating')} className="uppercase tracking-widest font-bold">
                {t('auth.updatePassword.submit')}
              </AuthButton>
            </form>
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
              {t('auth.updatePassword.updated')}
            </motion.h1>

            <motion.p
              className="text-center text-white/60 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {t('auth.updatePassword.updatedDesc')}
            </motion.p>
          </>
        )}
      </AuthCard>

      {!isSubmitted && (
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <div className="flex items-center justify-center gap-6 text-white/50 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>{t('auth.updatePassword.secureUpdate')}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AuthLayout>
  );
}
