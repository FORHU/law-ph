'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, EyeOff, ShieldAlert, CheckCircle2, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-provider';

interface TrustSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function TrustSection({ setActiveAngle }: TrustSectionProps) {
  const { t, dict } = useTranslation();
  const trustIcons = [
    <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" key="lock" />,
    <EyeOff className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" key="eye" />,
    <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" key="shield-alert" />,
    <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" key="check" />,
  ];

  return (
    <section
      className="py-16 sm:py-24 lg:py-48 px-4 sm:px-8 lg:px-12 bg-background"
      onMouseEnter={() => setActiveAngle?.(2)}
    >
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          className="glass-panel rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-10 lg:p-24 border border-white/10 text-center shadow-2xl bg-white/[0.01]"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Header */}
          <div className="text-center mb-8 sm:mb-16 lg:mb-24">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-serif text-white mb-4 sm:mb-6 lg:mb-8 leading-tight">
              {t('landing.trust.heading')}
            </h2>
            <p className="text-on-surface/50 text-base sm:text-lg mb-6 sm:mb-8 lg:mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              {t('landing.trust.description')}
            </p>
            <motion.div whileHover={{ scale: 1.05 }}>
              <a
                href="#"
                className="text-white text-base sm:text-lg font-bold border-b-2 border-white/20 pb-2 inline-flex items-center gap-2 sm:gap-3 hover:text-secondary hover:border-secondary transition-all"
              >
                {t('landing.trust.readPrivacyPolicy')} <ExternalLink size={18} />
              </a>
            </motion.div>
          </div>

          {/* Trust grid */}
          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-12 text-left"
          >
            {dict.landing.trust.items.map((item, index) => (
              <motion.div
                key={index}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } } }}
                animate={{ backgroundColor: '#ffffff0d' }}
                whileHover={{ y: -8, backgroundColor: '#ffffff14', borderColor: '#e9c17633' }}
                className="border border-white/5 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 lg:p-12 group transition-all shadow-lg cursor-default"
              >
                <div className="mb-4 sm:mb-6 lg:mb-10 transition-transform group-hover:scale-110">{trustIcons[index]}</div>
                <h4 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 sm:mb-3 lg:mb-4 leading-tight group-hover:text-secondary transition-colors">{item.title}</h4>
                <p className="text-on-surface/40 text-sm sm:text-base leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Shield badge */}
          <motion.div
            className="mt-8 sm:mt-12 lg:mt-16 p-5 sm:p-8 lg:p-10 bg-[#722f37]/5 rounded-[1.5rem] sm:rounded-[2rem] border border-[#722f37]/20 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-left sm:text-left"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-[#722f37] shrink-0" />
            <span className="text-sm sm:text-base lg:text-lg text-gray-400 font-medium leading-relaxed">
              {t('landing.trust.badgeText')}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
