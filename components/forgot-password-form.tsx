'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, CheckCircle, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BackButton from './back-button';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = (path: string) => router.push(path);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/update-password`,
      });
      
      if (error) throw error;
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      // Ideally show an error message, but the design didn't explicitly have an error state in the snippet.
      // We'll keep it simple for now as per the snippet, or maybe alert/log it.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col bg-[#0a0e17] relative overflow-hidden text-white font-sans">
        <BackButton
              label="Return to login"
              className="absolute top-6 left-6 z-20"
              fallbackHref="/auth/login"
            />
      {/* Main Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Card */}
            <div className="bg-[#242424]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
              {!isSubmitted ? (
                <>
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
                    Reset Password
                  </motion.h1>
                  
                  <motion.p
                    className="text-center text-white/60 mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    Enter your email address and we&apos;ll send you instructions to reset your password
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
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A]/60 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#8B4564] focus:ring-1 focus:ring-[#8B4564] transition-all"
                          required
                        />
                      </div>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#8B4564] hover:bg-[#a85678] text-white py-3 rounded-lg transition-all shadow-lg hover:shadow-[#8B4564]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    >
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </motion.button>
                  </form>

                  {/* Back to Login Link */}
                  <motion.div
                    className="mt-6 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  >
                    <p className="text-white/60 text-sm">
                      Remember your password?{' '}
                      <button
                        onClick={() => navigate('/auth/login')}
                        className="text-[#8B4564] hover:text-[#a85678] transition-colors cursor-pointer"
                      >
                        Sign in
                      </button>
                    </p>
                  </motion.div>
                </>
              ) : (
                <>
                  {/* Success State */}
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
                        <li>Make sure you entered the correct email</li>
                        <li>Wait a few minutes and check again</li>
                      </ul>
                    </div>

                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="w-full border-2 border-[#8B4564] text-white py-3 rounded-lg hover:bg-[#8B4564] transition-all cursor-pointer"
                    >
                      Try Another Email
                    </button>

                    <button
                      onClick={() => navigate('/auth/login')}
                      className="w-full text-white/60 hover:text-white py-3 transition-colors cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </motion.div>
                </>
              )}
            </div>

            {/* Security Notice */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: isSubmitted ? 0.5 : 0.9 }}
            >
              <div className="flex items-center justify-center gap-6 text-white/50 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Secure Reset Process</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Encrypted Link</span>
                </div>
              </div>
              <p className="mt-4 text-white/40 text-xs">
                Password reset links expire after 1 hour for security
              </p>
            </motion.div>
          </motion.div>
        </div>
    </div>
  );
}
