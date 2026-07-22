'use client';

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/auth-provider";
import { useTranslation } from "@/lib/i18n/language-provider";

interface HeroSectionProps {
  onStartConsultation: () => void;
  setActiveAngle: (angle: number) => void;
}

export function HeroSection({ onStartConsultation, setActiveAngle }: HeroSectionProps) {
  const router = useRouter();
  const { loggedIn } = useAuth();
  const { t } = useTranslation();

  const handleStartConsultation = () => {
    if (!loggedIn) {
      router.push("/auth/login");
      return;
    }
    router.push("/consultation");
  };

  return (
    <section
      className="relative min-h-screen flex flex-col justify-start overflow-hidden pt-24 sm:pt-36 lg:pt-48"
      onMouseEnter={() => setActiveAngle(1)}
    >
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 w-full">
        <div className="max-w-4xl">

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white mb-6 sm:mb-8 leading-[1.1] tracking-tight"
          >
            {t('landing.hero.titlePrefix')} <span className="text-secondary italic">{t('landing.hero.titleAccent')}</span> {t('landing.hero.titleSuffix')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-base sm:text-lg md:text-xl text-on-surface/80 mb-8 sm:mb-12 max-w-2xl leading-relaxed font-light"
          >
            {t('landing.hero.subtitle')}
          </motion.p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
            <motion.button
              initial={{ backgroundColor: "rgba(114, 47, 55, 1)" }}
              whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(114, 47, 55, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartConsultation}
              onMouseEnter={() => setActiveAngle(2)}
              className="bg-[#722f37] text-white px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-bold rounded-lg shadow-2xl transition-all cursor-pointer w-full sm:w-auto"
            >
              {t('landing.hero.startConsultation')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              onMouseEnter={() => setActiveAngle(3)}
              className="bg-white/5 text-white px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-medium rounded-lg border border-white/10 transition-all cursor-pointer w-full sm:w-auto"
            >
              {t('landing.hero.learnHowItWorks')}
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
