"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}${AUTH_ROUTES.LOGIN}`,
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
          description="Join ilovelawyer and access AI-powered legal guidance"
        />

        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthInput 
            id="fullName"
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Juan Dela Cruz"
            required
            delay={0.6}
          />

          <AuthInput 
            id="email"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="your.email@example.com"
            required
            delay={0.7}
          />

          <AuthInput 
            id="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Create a strong password"
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
            placeholder="Re-enter your password"
            required
            minLength={8}
            delay={0.9}
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

          <motion.div
            className="flex items-start gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <input
              type="checkbox"
              id="terms"
              className="mt-1 w-4 h-4 accent-[#8B4564]"
              required
            />
            <label htmlFor="terms" className="text-white/60 text-xs">
              I agree to the{' '}
              <button type="button" className="text-[#8B4564] hover:text-[#a85678] transition-colors cursor-pointer">
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" className="text-[#8B4564] hover:text-[#a85678] transition-colors cursor-pointer">
                Privacy Policy
              </button>
            </label>
          </motion.div>

          <AuthButton isLoading={isLoading} loadingText="Creating Account..." delay={1.1}>
            Create Account
          </AuthButton>
        </form>

        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <p className="text-white/60 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => router.push(AUTH_ROUTES.LOGIN)}
              className="text-[#8B4564] hover:text-[#a85678] transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </motion.div>
      </AuthCard>

      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.3 }}
      >
        <p className="text-white/50 text-xs uppercase tracking-wider mb-4">
          Privacy Standards
        </p>
        <div className="flex items-center justify-center gap-8 mb-6">
          <Shield className="w-6 h-6 text-white/40" />
          <Lock className="w-6 h-6 text-white/40" />
          <Scale className="w-6 h-6 text-white/40" />
        </div>
        <p className="text-white/40 text-xs">
          By signing up, you agree to our{' '}
          <button type="button" className="text-white/60 hover:text-white underline transition-colors text-[12px] cursor-pointer">
            Legal Terms
          </button>
          {' '}&{' '}
          <button type="button" className="text-white/60 hover:text-white underline transition-colors text-[12px] cursor-pointer">
            Data Privacy Policy
          </button>
        </p>
      </motion.div>

      <SignUpSuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => router.push(AUTH_ROUTES.LOGIN)}
        email={formData.email}
      />
    </AuthLayout>
  );
}
