'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Shield, Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BackButton from './back-button';
import { AuthBackground } from './auth-background';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = (path: string) => router.push(path);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      router.push('/consultation');
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col bg-[#0a0e17] relative overflow-hidden text-white font-sans">
      {/* Dynamic Background */}
      <AuthBackground />

      <BackButton
        label="Return"
        className="absolute top-6 left-6 z-20"
        fallbackHref="/"
      />

      {/* Main Login Container */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Login Card */}
          <div className="bg-[#242424]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
            {/* Icon */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-16 h-16 rounded-full bg-[#8B4564]/20 flex items-center justify-center">
                <Lock className="w-8 h-8 text-[#8B4564]" />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1
              className="text-3xl md:text-4xl text-center text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Secure Sign In
            </motion.h1>
            
            <motion.p
              className="text-center text-white/60 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Access your legal AI consultation platform
            </motion.p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <label htmlFor="email" className="block text-white/80 mb-2 text-sm">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 bg-[#1A1A1A]/60 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#8B4564] focus:ring-1 focus:ring-[#8B4564] transition-all"
                  required
                />
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <label htmlFor="password" className="block text-white/80 mb-2 text-sm">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 bg-[#1A1A1A]/60 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#8B4564] focus:ring-1 focus:ring-[#8B4564] transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Forgot Password Link */}
              <motion.div
                className="flex justify-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/auth/forgot-password')}
                  className="text-[#8B4564] hover:text-[#a85678] transition-colors text-sm cursor-pointer"
                >
                  Forgot password?
                </button>
              </motion.div>

              {/* Sign In Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#8B4564] hover:bg-[#a85678] text-white py-3 rounded-lg transition-all shadow-lg hover:shadow-[#8B4564]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </motion.button>
            </form>

            {/* Sign Up Link */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              <p className="text-white/60 text-sm">
                No account yet?{' '}
                <button
                  onClick={() => navigate('/auth/sign-up')}
                  className="text-[#8B4564] hover:text-[#a85678] transition-colors cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </motion.div>
          </div>

          {/* Privacy Standards Section */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
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
              By signing in, you agree to our{' '}
              <button type="button" className="text-white/60 hover:text-white underline transition-colors text-[12px] cursor-pointer">
                Legal Terms
              </button>
              {' '}&{' '}
              <button type="button" className="text-white/60 hover:text-white underline transition-colors text-[12px] cursor-pointer">
                Data Privacy Policy
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginScreen;
