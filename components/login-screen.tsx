"use client"

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Shield, Scale } from 'lucide-react';
import { AUTH_ROUTES } from '@/lib/constants';
import { GoogleLoginButton } from './auth/google-login-button';
import { AuthLayout } from './auth/shared/auth-layout';
import { AuthCard } from './auth/shared/auth-card';
import { AuthHeader } from './auth/shared/auth-header';
import { AuthInput } from './auth/shared/auth-input';
import { AuthButton } from './auth/shared/auth-button';
import { motion } from 'framer-motion';
import { LegalModal } from '@/components/auth/legal-modal';
import { useTranslation } from '@/lib/i18n/language-provider';

const LoginScreen = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/consultation';
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const oauthError = searchParams?.get('error');
  const oauthErrorMessage =
    oauthError === 'google_denied' ? t('auth.login.googleCancelled') :
    oauthError === 'google_auth_failed' ? t('auth.login.googleFailed') :
    null;

  const [error, setError] = useState<string | null>(oauthErrorMessage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('auth.login.signInFailed'));
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message || t('auth.login.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout maxWidth="max-w-xl">
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      <AuthCard>
        <AuthHeader
          icon={Lock}
          title={t('auth.login.title')}
          description={t('auth.login.subtitle')}
        />

        <form onSubmit={handleSubmit} className="space-y-3">
          <AuthInput
            id="email"
            label={t('auth.login.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.login.emailPlaceholder')}
            required
          />

          <AuthInput
            id="password"
            label={t('auth.login.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.login.passwordPlaceholder')}
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push(AUTH_ROUTES.FORGOT_PASSWORD)}
              className="text-[#e9c176]/60 hover:text-[#e9c176] transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              {t('auth.login.forgotPassword')}
            </button>
          </div>

          <AuthButton isLoading={isLoading} loadingText={t('auth.login.verifying')}>
            {t('auth.login.submit')}
          </AuthButton>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5" />
          </div>
        </div>

        <div>
          <GoogleLoginButton redirectUrl={redirectUrl} />
        </div>

        <div className="mt-8 text-center border-t border-white/5 pt-8">
          <p className="text-white/30 text-xs font-medium uppercase tracking-widest">
            {t('auth.login.newToPlatform')}{' '}
            <button
              onClick={() => router.push(AUTH_ROUTES.SIGN_UP)}
              className="text-[#e9c176] hover:text-white transition-colors cursor-pointer ml-2"
            >
              {t('auth.login.signUpHere')}
            </button>
          </p>
        </div>
      </AuthCard>

      <div className="mt-8 text-center">
        <p className="text-white/50 text-xs uppercase tracking-wider mb-4">
          {t('auth.login.privacyStandards')}
        </p>
        <div className="flex items-center justify-center gap-8 mb-6">
          <Shield className="w-6 h-6 text-white/40" />
          <Lock className="w-6 h-6 text-white/40" />
          <Scale className="w-6 h-6 text-white/40" />
        </div>
        <p className="text-white/40 text-xs">
          {t('auth.login.agreePrefix')}{' '}
          <button type="button" onClick={() => setLegalModal('terms')} className="text-white/60 hover:text-white underline transition-colors text-[12px] cursor-pointer">
            {t('auth.login.legalTerms')}
          </button>
          {' '}{t('auth.login.and')}{' '}
          <button type="button" onClick={() => setLegalModal('privacy')} className="text-white/60 hover:text-white underline transition-colors text-[12px] cursor-pointer">
            {t('auth.login.dataPrivacyPolicy')}
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoginScreen;
