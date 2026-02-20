"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AUTH_ROUTES } from "@/lib/constants";
import { AuthLayout } from "./auth/shared/auth-layout";
import { AuthCard } from "./auth/shared/auth-card";
import { AuthHeader } from "./auth/shared/auth-header";
import { AuthInput } from "./auth/shared/auth-input";
import { AuthButton } from "./auth/shared/auth-button";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setIsSubmitted(true);
      setTimeout(() => {
        router.push(AUTH_ROUTES.LOGIN);
      }, 3000);
    } catch (error: any) {
      setError(error.message || "An error occurred during password update");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      backButtonLabel="Return to login" 
      backButtonHref={AUTH_ROUTES.LOGIN}
      maxWidth="max-w-xl"
    >
      <AuthCard>
        {!isSubmitted ? (
          <>
            <AuthHeader 
              icon={Lock}
              title="Update Password"
              description="Secure your account with a new password"
            />

            <form onSubmit={handleSubmit} className="space-y-6">
              <AuthInput 
                id="password"
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                minLength={6}
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              <AuthButton isLoading={isLoading} loadingText="Updating...">
                Update Password
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
              className="text-3xl md:text-4xl text-center text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Password Updated
            </motion.h1>

            <motion.p
              className="text-center text-white/60 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Your password has been changed successfully. Redirecting to login...
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
              <span>Secure Update</span>
            </div>
          </div>
        </motion.div>
      )}
    </AuthLayout>
  );
}
