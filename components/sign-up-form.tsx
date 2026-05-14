"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, Lock, Shield, Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AUTH_ROUTES } from '@/lib/constants';
import { AuthLayout } from './auth/shared/auth-layout';
import { AuthCard } from './auth/shared/auth-card';
import { AuthHeader } from './auth/shared/auth-header';
import { AuthInput } from './auth/shared/auth-input';
import { AuthButton } from './auth/shared/auth-button';
import { SignUpSuccessModal } from './auth/sign-up-success-modal';

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}${AUTH_ROUTES.LOGIN}${redirectQuery}`,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("User already registered") || signUpError.code === 'user_already_exists') {
          setError("This email is already registered. Please sign in instead.");
        } else {
          throw signUpError;
        }
        return;
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("This email is already registered. Please sign in instead.");
        setIsLoading(false);
        return;
      }
      
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout maxWidth="max-w-xl">
      <AuthCard>
        <AuthHeader 
          icon={UserPlus}
          title="Create Account"
          description="Set up your account to access intelligent legal assistance."
        />

        <form onSubmit={handleSubmit} className="space-y-3">
          <AuthInput 
            id="fullName"
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Your full name"
            required
            delay={0.6}
          />

          <AuthInput 
            id="email"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@example.com"
            required
            delay={0.7}
          />

          <AuthInput 
            id="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Create a secure password"
            required
            minLength={8}
            delay={0.8}
          />

          <AuthInput 
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm your password"
            required
            minLength={8}
            delay={0.9}
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
              className="mt-[2px] w-4 h-4 accent-[#722f37] shrink-0 border-white/20 rounded bg-white/5"
              required
            />
            <label htmlFor="terms" className="text-white/60 text-[11px] font-medium leading-tight">
              I agree to the{' '}
              <button type="button" className="text-white hover:text-[#e9c176] transition-colors cursor-pointer font-bold underline">
                Terms
              </button>
              {' '}and{' '}
              <button type="button" className="text-white hover:text-[#e9c176] transition-colors cursor-pointer font-bold underline">
                Privacy Policy
              </button>
            </label>
          </motion.div>

          <AuthButton isLoading={isLoading} loadingText="Creating Account..." delay={1.1}>
            CREATE ACCOUNT
          </AuthButton>
        </form>

        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em]">
            Already authorized?{' '}
            <button
              onClick={() => router.push(`${AUTH_ROUTES.LOGIN}${redirectQuery}`)}
              className="text-[#e9c176] hover:text-white transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </motion.div>
      </AuthCard>



      <SignUpSuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => router.push(`${AUTH_ROUTES.LOGIN}${redirectQuery}`)}
        email={formData.email}
      />
    </AuthLayout>
  );
}
