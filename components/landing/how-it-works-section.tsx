'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, FileText, ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function HowItWorksSection({ setActiveAngle }: HowItWorksSectionProps) {
  return (
    <section 
      className="py-48 bg-black/20" 
      id="how-it-works"
      onMouseEnter={() => setActiveAngle?.(3)}
    >
      <div className="max-w-[1440px] mx-auto px-12 text-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-secondary text-sm tracking-[0.3em] font-bold uppercase mb-8 block"
        >
          Simple Process
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-7xl font-serif text-white mb-8"
        >
          How It Works
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-on-surface/50 text-2xl max-w-3xl mx-auto mb-24 font-light leading-relaxed"
        >
          Getting legal guidance has never been easier. Follow these simple steps to start your consultation.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 relative">
          <div className="absolute top-20 left-0 w-full h-px bg-white/10 hidden md:block" />
          {[
            { step: '1', title: 'Ask Your Question', desc: 'Type your legal question in plain language.', icon: <MessageSquare className="w-8 h-8" /> },
            { step: '2', title: 'AI Analysis', desc: 'Our AI searches through Philippine legal codes.', icon: <Search className="w-8 h-8" /> },
            { step: '3', title: 'Receive Guidance', desc: 'Receive cited legal information with references.', icon: <FileText className="w-8 h-8" /> },
            { step: '4', title: 'Take Action', desc: 'Use insights to make informed decisions.', icon: <ArrowRight className="w-8 h-8" /> },
          ].map((item, i) => (
            <motion.div 
              key={item.step} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i, duration: 0.6 }}
              className="flex flex-col items-center group relative z-10"
            >
              <div className="w-32 h-32 rounded-full bg-[#722f37] text-white flex items-center justify-center text-4xl font-bold mb-10 shadow-2xl transition-transform group-hover:scale-110 group-hover:shadow-[#722f37]/40 ring-4 ring-transparent group-hover:ring-white/10">
                {item.step}
              </div>
              <motion.div 
                whileHover={{ y: -10 }}
                className="glass-panel p-12 rounded-[2.5rem] border border-white/5 w-full min-h-[320px] flex flex-col items-center shadow-lg hover:shadow-2xl transition-shadow bg-white/[0.01]"
              >
                <div className="text-secondary mb-8 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h4 className="text-2xl font-bold text-white mb-6 leading-tight">{item.title}</h4>
                <p className="text-on-surface/50 text-base leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
