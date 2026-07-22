'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, FileText, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-provider';

interface HowItWorksSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function HowItWorksSection({ setActiveAngle }: HowItWorksSectionProps) {
  const { t, dict } = useTranslation();
  const icons = [
    <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8" key="msg" />,
    <Search className="w-6 h-6 sm:w-8 sm:h-8" key="search" />,
    <FileText className="w-6 h-6 sm:w-8 sm:h-8" key="file" />,
    <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" key="arrow" />,
  ];
  return (
    <section
      className="py-16 sm:py-24 lg:py-48 bg-black/20"
      id="how-it-works"
      onMouseEnter={() => setActiveAngle?.(3)}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-gray-500 text-sm tracking-[0.3em] font-bold uppercase mb-6 sm:mb-8 block"
        >
          {t('landing.howItWorks.eyebrow')}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-4 sm:mb-6"
        >
          {t('landing.howItWorks.heading')}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-on-surface/50 text-base sm:text-lg max-w-3xl mx-auto mb-10 sm:mb-16 font-light leading-relaxed"
        >
          {t('landing.howItWorks.description')}
        </motion.p>

        <motion.div
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.2 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-16 relative"
        >
          {/* Connector line — desktop only */}
          <div className="absolute top-16 left-0 w-full h-px bg-white/10 hidden md:block" />

          {dict.landing.howItWorks.steps.map((item, idx) => (
            <motion.div
              key={item.title}
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 1, ease: 'easeOut' } } }}
              className="flex flex-col items-center group relative z-10"
            >
              <motion.div
                whileHover={{ scale: 1.05, backgroundColor: '#8b3a44' }}
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-[#722f37] text-white flex items-center justify-center text-xl sm:text-2xl font-bold mb-5 sm:mb-8 shadow-2xl transition-all ring-4 ring-transparent group-hover:ring-[#e9c176]/20"
              >
                {idx + 1}
              </motion.div>

              <motion.div
                initial={{ backgroundColor: 'rgba(11,11,12,0.4)' }}
                whileHover={{ y: -10, backgroundColor: 'rgba(11,11,12,0.6)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', borderColor: 'rgba(233,193,118,0.3)' }}
                className="glass-panel p-6 sm:p-8 lg:p-12 rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 w-full flex flex-col items-center shadow-lg transition-all backdrop-blur-xl"
              >
                <div className="text-gray-500 mb-4 sm:mb-8 transition-transform group-hover:scale-110 group-hover:text-[#e9c176]">{icons[idx]}</div>
                <h4 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 sm:mb-4 leading-tight transition-colors group-hover:text-[#e9c176]">{item.title}</h4>
                <p className="text-on-surface/50 text-sm sm:text-base leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
