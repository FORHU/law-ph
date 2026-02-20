"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Shield, Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      router.push('/consultation');
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
              className="text-[#8B4564] hover:text-[#a85678] transition-colors text-sm cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          <AuthButton isLoading={isLoading} loadingText="Signing In...">
            Sign In
          </AuthButton>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#242424] px-2 text-white/40">Or continue with</span>
          </div>
        </div>

        <div className="mb-6">
          <GoogleLoginButton />
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            No account yet?{' '}
            <button
              onClick={() => router.push(AUTH_ROUTES.SIGN_UP)}
              className="text-[#8B4564] hover:text-[#a85678] transition-colors cursor-pointer"
            >
              Sign up
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
