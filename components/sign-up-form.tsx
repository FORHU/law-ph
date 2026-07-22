"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { AUTH_ROUTES } from '@/lib/constants';
import { AuthLayout } from './auth/shared/auth-layout';
import { AuthCard } from './auth/shared/auth-card';
import { AuthHeader } from './auth/shared/auth-header';
import { AuthInput } from './auth/shared/auth-input';
import { AuthButton } from './auth/shared/auth-button';
import { LegalModal } from './auth/legal-modal';
import { useTranslation } from '@/lib/i18n/language-provider';

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const redirectParam = searchParams?.get('redirect');
  const redirectQuery = redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : '';
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [hasRead, setHasRead] = useState({ terms: false, privacy: false });

  const bothRead = hasRead.terms && hasRead.privacy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.signup.passwordsNoMatch'));
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.fullName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setError(t('auth.signup.emailTaken'));
        } else {
          throw new Error(data.error || t('auth.signup.signUpFailed'));
        }
        return;
      }

      router.push(`${AUTH_ROUTES.LOGIN}${redirectQuery}`);
      router.refresh();
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || t('auth.signup.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthLayout maxWidth="max-w-xl">
        <AuthCard>
          <AuthHeader
            icon={UserPlus}
            title={t('auth.signup.title')}
            description={t('auth.signup.subtitle')}
          />

          <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
            {/* Hidden inputs absorb any browser autofill before it reaches real fields */}
            <input type="text" name="fakeUsername" style={{ display: 'none' }} readOnly />
            <input type="password" name="fakePassword" style={{ display: 'none' }} readOnly />

            <AuthInput
              id="fullName"
              label={t('auth.signup.fullNameLabel')}
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder={t('auth.signup.fullNamePlaceholder')}
              required
              delay={0.6}
              autoComplete="off"
            />

            <AuthInput
              id="email"
              label={t('auth.signup.emailLabel')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('auth.signup.emailPlaceholder')}
              required
              delay={0.7}
              autoComplete="off"
            />

            <AuthInput
              id="password"
              label={t('auth.signup.passwordLabel')}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t('auth.signup.passwordPlaceholder')}
              required
              minLength={8}
              delay={0.8}
              autoComplete="new-password"
            />

            <AuthInput
              id="confirmPassword"
              label={t('auth.signup.confirmPasswordLabel')}
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder={t('auth.signup.confirmPasswordPlaceholder')}
              required
              minLength={8}
              delay={0.9}
              autoComplete="new-password"
            />

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-[11px] font-bold uppercase tracking-widest text-center bg-red-400/10 py-3 px-4 rounded-xl border border-red-400/20"
              >
                {error}
              </motion.div>
            )}

            <motion.div
              className="flex items-start gap-3 my-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <input
                type="checkbox"
                id="terms"
                className="mt-[2px] w-4 h-4 accent-[#722f37] shrink-0 border-white/20 rounded bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                required
                disabled={!bothRead}
                title={!bothRead ? t('auth.signup.readBothTooltip') : undefined}
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="terms" className={`text-[11px] font-medium leading-tight ${bothRead ? 'text-white/60' : 'text-white/30'}`}>
                  {t('auth.signup.agreePrefix')}{' '}
                  <button
                    type="button"
                    onClick={() => setLegalModal('terms')}
                    className={`transition-colors cursor-pointer font-bold underline ${hasRead.terms ? 'text-[#e9c176]' : 'text-white hover:text-[#e9c176]'}`}
                  >
                    {t('auth.signup.terms')}
                  </button>
                  {' '}{t('auth.signup.and')}{' '}
                  <button
                    type="button"
                    onClick={() => setLegalModal('privacy')}
                    className={`transition-colors cursor-pointer font-bold underline ${hasRead.privacy ? 'text-[#e9c176]' : 'text-white hover:text-[#e9c176]'}`}
                  >
                    {t('auth.signup.privacyPolicy')}
                  </button>
                </label>
                {!bothRead && (
                  <p className="text-[10px] text-[#722f37] font-bold uppercase tracking-widest">
                    {t('auth.signup.readBothDocuments')}
                  </p>
                )}
              </div>
            </motion.div>

            <AuthButton isLoading={isLoading} loadingText={t('auth.signup.creatingAccount')} delay={1.1}>
              {t('auth.signup.createAccount')}
            </AuthButton>
          </form>

          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em]">
              {t('auth.signup.alreadyAuthorized')}{' '}
              <button
                onClick={() => router.push(`${AUTH_ROUTES.LOGIN}${redirectQuery}`)}
                className="text-[#e9c176] hover:text-white transition-colors cursor-pointer"
              >
                {t('auth.signup.signIn')}
              </button>
            </p>
          </motion.div>
        </AuthCard>
      </AuthLayout>

      {legalModal && (
        <LegalModal
          type={legalModal}
          onClose={() => setLegalModal(null)}
          onRead={(type) => setHasRead((prev) => ({ ...prev, [type]: true }))}
        />
      )}
    </>
  );
}
