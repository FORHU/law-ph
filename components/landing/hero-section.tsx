'use client';

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/auth-provider";

interface HeroSectionProps {
  onStartConsultation: () => void;
  setActiveAngle: (angle: number) => void;
}

export function HeroSection({ onStartConsultation, setActiveAngle }: HeroSectionProps) {
  const router = useRouter();
  const { loggedIn } = useAuth();

  const handleStartConsultation = () => {
    if (!loggedIn) {
      router.push("/auth/login");
      return;
    }
    router.push("/consultation");
  };

  return (
    <section 
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20"
      onMouseEnter={() => setActiveAngle(1)}
    >
      <div className="relative z-10 max-w-[1440px] mx-auto px-12 w-full">
        <div className="max-w-4xl">
          <motion.span 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-2 mb-8 border border-[#722f37]/30 bg-primary-container/10 text-[#ffb2b8] rounded-full text-sm font-bold tracking-[0.2em] uppercase"
          >
            SOVEREIGN MODERNISM • AI-POWERED
          </motion.span>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-serif text-8xl md:text-9xl text-white mb-10 leading-[1.05] tracking-tight"
          >
            Navigate <span className="text-secondary italic">Philippine Law</span> with AI Precision
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl md:text-3xl text-on-surface/80 mb-16 max-w-3xl leading-relaxed font-light"
          >
            The definitive digital workspace for the Philippine legal profession. ilovelawyer bridges centuries of jurisprudence with cutting-edge artificial intelligence.
          </motion.p>
          
          <div className="flex flex-wrap gap-6">
            <button 
              onClick={handleStartConsultation}
              onMouseEnter={() => setActiveAngle(2)}
              className="bg-[#722f37] hover:brightness-110 text-white px-12 py-6 text-2xl font-bold rounded-lg shadow-2xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Start Quick Consultation
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onMouseEnter={() => setActiveAngle(3)}
              className="bg-white/5 hover:bg-white/10 text-white px-12 py-6 text-2xl font-medium rounded-lg border border-white/10 transition-all cursor-pointer"
            >
              Learn How It Works
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
