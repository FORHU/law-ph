'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, Shield, Scale, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BackButton from './back-button';

export function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const navigate = (path: string) => router.push(path);

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
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/login`,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) throw error;
      
      router.push('/auth/sign-up-success');
    } catch (error: any) {
      setError(error.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col bg-[#0a0e17] relative overflow-hidden text-white font-sans">
      {/* Dynamic Background */}
      {/* Dynamic Background */}
        <div className="fixed inset-0 z-0">
          <motion.img 
            src="https://images.unsplash.com/photo-1701267148058-9159d6642f79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYWR5JTIwanVzdGljZSUyMHN0YXR1ZSUyMGRyYW1hdGljJTIwbGlnaHRpbmd8ZW58MXx8fHwxNzcwMTcyODAxfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Lady Justice"
            className="w-full h-full object-cover opacity-40 grayscale"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/70 via-[#1A1A1A]/50 to-[#1A1A1A]/90"></div>
          {/* Animated gradient orbs */}
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8B4564]/10 rounded-full blur-3xl"
            animate={{ 
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8B4564]/10 rounded-full blur-3xl"
            animate={{ 
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

       <BackButton
              label="Return"
              className="absolute top-6 left-6 z-20"
              fallbackHref="/"
            />

      {/* Main Signup Container */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Signup Card */}
          <div className="bg-[#242424]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
            {/* Icon */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-16 h-16 rounded-full bg-[#8B4564]/20 flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-[#8B4564]" />
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
              Create Account
            </motion.h1>
            
            <motion.p
              className="text-center text-white/60 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Join ilovelawyer and access AI-powered legal guidance
            </motion.p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <label htmlFor="fullName" className="block text-white/80 mb-2 text-sm">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Juan Dela Cruz"
                  className="w-full px-4 py-3 bg-[#1A1A1A]/60 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#8B4564] focus:ring-1 focus:ring-[#8B4564] transition-all"
                  required
                />
              </motion.div>

              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <label htmlFor="email" className="block text-white/80 mb-2 text-sm">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 bg-[#1A1A1A]/60 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#8B4564] focus:ring-1 focus:ring-[#8B4564] transition-all"
                  required
                />
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <label htmlFor="password" className="block text-white/80 mb-2 text-sm">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 bg-[#1A1A1A]/60 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#8B4564] focus:ring-1 focus:ring-[#8B4564] transition-all pr-12"
                    required
                    minLength={8}
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

              {/* Confirm Password Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <label htmlFor="confirmPassword" className="block text-white/80 mb-2 text-sm">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 bg-[#1A1A1A]/60 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#8B4564] focus:ring-1 focus:ring-[#8B4564] transition-all pr-12"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
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

              {/* Terms Agreement */}
              <motion.div
                className="flex items-start gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
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

              {/* Create Account Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#8B4564] hover:bg-[#a85678] text-white py-3 rounded-lg transition-all shadow-lg hover:shadow-[#8B4564]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </motion.button>
            </form>

            {/* Login Link */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <p className="text-white/60 text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/auth/login')}
                  className="text-[#8B4564] hover:text-[#a85678] transition-colors cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </motion.div>
          </div>

          {/* Privacy Standards Section */}
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
        </motion.div>
      </div>
    </div>
  );
}
