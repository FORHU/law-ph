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
      className="relative min-h-screen flex flex-col justify-start overflow-hidden pt-50"
      onMouseEnter={() => setActiveAngle(1)}
    >
      <div className="relative z-10 max-w-[1440px] mx-auto px-12 w-full">
        <div className="max-w-4xl">
          {/* Sovereign Modernism Tag Removed */}

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-6xl md:text-7xl text-white mb-8 leading-[1.1] tracking-tight"
          >
            Navigate <span className="text-secondary italic">Philippine Law</span> with AI Precision
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-on-surface/80 mb-12 max-w-2xl leading-relaxed font-light"
          >
            The definitive digital workspace for the Philippine legal profession. ilovelawyer bridges centuries of jurisprudence with cutting-edge artificial intelligence.
          </motion.p>

          <div className="flex flex-wrap gap-6">
            <motion.button
              initial={{ backgroundColor: "rgba(114, 47, 55, 1)" }}
              whileHover={{
                scale: 1.02,
                boxShadow: "0 0 40px rgba(114, 47, 55, 0.4)",
                backgroundColor: "rgba(114, 47, 55, 1)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartConsultation}
              onMouseEnter={() => setActiveAngle(2)}
              className="bg-[#722f37] text-white px-8 py-4 text-lg font-bold rounded-lg shadow-2xl transition-all cursor-pointer"
            >
              Start Quick Consultation
            </motion.button>
            <motion.button
              whileHover={{
                scale: 1.02,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                boxShadow: "0 0 30px rgba(255, 255, 255, 0.05)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onMouseEnter={() => setActiveAngle(3)}
              className="bg-white/5 text-white px-8 py-4 text-lg font-medium rounded-lg border border-white/10 transition-all cursor-pointer"
            >
              Learn How It Works
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
