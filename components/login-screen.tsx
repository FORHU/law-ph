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

const LoginScreen = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/consultation';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const oauthError = searchParams?.get('error');
  const oauthErrorMessage =
    oauthError === 'google_denied' ? 'Google sign-in was cancelled.' :
    oauthError === 'google_auth_failed' ? 'Google sign-in failed. Please try again.' :
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
        throw new Error(data.error || 'Sign in failed');
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout maxWidth="max-w-xl">
      <AuthCard>
        <AuthHeader
          icon={Lock}
          title="Secure Sign In"
          description="Access your legal AI consultation platform"
        />

        <form onSubmit={handleSubmit} className="space-y-3">
          <AuthInput
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            required
          />

          <AuthInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
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
              Forgot password?
            </button>
          </div>

          <AuthButton isLoading={isLoading} loadingText="Verifying Credentials...">
            Log In to ilovelawyer
          </AuthButton>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5" />
          </div>
        </div>

        <div>
          <GoogleLoginButton />
        </div>

        <div className="mt-8 text-center border-t border-white/5 pt-8">
          <p className="text-white/30 text-xs font-medium uppercase tracking-widest">
            New to the platform?{' '}
            <button
              onClick={() => router.push(AUTH_ROUTES.SIGN_UP)}
              className="text-[#e9c176] hover:text-white transition-colors cursor-pointer ml-2"
            >
              Request Access
            </button>
          </p>
        </div>
      </AuthCard>

      <div className="mt-8 text-center">
        <p className="text-white/50 text-xs uppercase tracking-wider mb-4">
          Privacy Standards
        </p>
        <div className="flex items-center justify-center gap-8 mb-6">
          <Shield className="w-6 h-6 text-white/40" />
          <Lock className="w-6 h-6 text-white/40" />
          <Scale className="w-6 h-6 text-white/40" />
        </div>
        <p className="text-white/40 text-xs">
          By signing in, you agree to our{' '}
          <button type="button" className="text-white/60 hover:text-white underline transition-colors text-[12px] cursor-pointer">
            Legal Terms
          </button>
          {' '}&{' '}
          <button type="button" className="text-white/60 hover:text-white underline transition-colors text-[12px] cursor-pointer">
            Data Privacy Policy
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoginScreen;
