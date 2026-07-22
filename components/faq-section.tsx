'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-provider';

interface FAQSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function FAQSection({ setActiveAngle }: FAQSectionProps) {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const { t, dict } = useTranslation();
  const faqs = dict.landing.faq.items;

  return (
    <section
      id="faq"
      className="py-16 sm:py-24 lg:py-48 px-4 sm:px-8 lg:px-12 bg-transparent"
      onMouseEnter={() => setActiveAngle?.(1)}
    >
      <div className="max-w-[1000px] mx-auto text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-secondary text-sm tracking-[0.4em] font-bold uppercase mb-6 sm:mb-8 block"
        >
          {t('landing.faq.eyebrow')}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-5xl lg:text-7xl font-serif text-white mb-8 sm:mb-12 lg:mb-24 leading-tight"
        >
          {t('landing.faq.heading')}
        </motion.h2>

        <div className="space-y-3 sm:space-y-4 lg:space-y-6 text-left">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 overflow-hidden transition-all hover:border-[#722f37]/30 bg-[#0B0B0C]/40 backdrop-blur-3xl"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-5 sm:px-8 lg:px-12 py-5 sm:py-7 lg:py-10 flex justify-between items-center text-white hover:bg-[#722f37]/5 transition-colors text-left group"
              >
                <span className="font-bold text-base sm:text-lg lg:text-2xl pr-4 sm:pr-6 lg:pr-8 leading-tight group-hover:text-[#e9c176] transition-colors">
                  {faq.question}
                </span>
                {openFaq === idx
                  ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-[#e9c176] shrink-0" />
                  : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-on-surface/20 shrink-0" />
                }
              </button>

              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 sm:px-8 lg:px-12 pb-5 sm:pb-7 lg:pb-10 text-on-surface/60 leading-relaxed text-sm sm:text-base lg:text-lg font-light border-t border-white/5 pt-4 sm:pt-6 lg:pt-8 mx-4 sm:mx-8 lg:mx-12 mb-2"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
