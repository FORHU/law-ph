'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function FAQSection({ setActiveAngle }: FAQSectionProps) {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const faqs = [
    {
      question: 'Is ilovelawyer a replacement for a licensed lawyer?',
      answer: 'No, ilovelawyer is an AI legal information tool designed to assist with research and document verification. It provides information based on Republic Acts, Batas Pambansa, various Codes, and jurisprudence. We strongly recommend consulting with a member of the Integrated Bar of the Philippines (IBP) for sensitive legal matters.'
    },
    {
      question: 'Which Philippine laws are included in the AI\'s knowledge base?',
      answer: 'Our knowledge base includes the Civil Code, Revised Penal Code, Family Code, Labor Code, and thousands of Supreme Court decisions up to the latest public records.'
    },
    {
      question: 'How secure is the information I share?',
      answer: 'We use industry-standard AES-256 encryption and follow strict Data Privacy Act (R.A. 10173) guidelines to ensure your information remains confidential.'
    },
    {
      question: 'Can the AI help me draft legal documents like affidavits?',
      answer: 'Yes, ilovelawyer can provide templates and draft initial versions of common legal documents, which you should then review with a licensed professional.'
    },
    {
      question: 'Is there a cost to use ilovelawyer?',
      answer: 'We offer both free basic access and premium subscription tiers for advanced research and document review capabilities.'
    }
  ];

  return (
    <section 
      id="faq" 
      className="py-48 px-12 bg-transparent"
      onMouseEnter={() => setActiveAngle?.(1)}
    >
      <div className="max-w-[1000px] mx-auto text-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-secondary text-sm tracking-[0.4em] font-bold uppercase mb-8 block"
        >
          Common Questions
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-7xl font-serif text-white mb-24 leading-tight"
        >
          Frequently Asked Questions
        </motion.h2>
        
        <div className="space-y-6 text-left">
          {faqs.map((faq, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden transition-all hover:border-white/10 bg-white/[0.01]"
            >
              <button 
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-12 py-10 flex justify-between items-center text-white hover:bg-white/5 transition-colors text-left"
              >
                <span className="font-bold text-2xl pr-8 leading-tight">{faq.question}</span>
                {openFaq === idx ? <ChevronUp className="w-8 h-8 text-secondary shrink-0" /> : <ChevronDown className="w-8 h-8 text-on-surface/30 shrink-0" />}
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-12 pb-10 text-on-surface/60 leading-relaxed text-xl font-light"
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
