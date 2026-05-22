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
          className="text-gray-500 text-sm tracking-[0.3em] font-bold uppercase mb-8 block"
        >
          Simple Process
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl font-serif text-white mb-6"
        >
          How It Works
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-on-surface/50 text-lg max-w-3xl mx-auto mb-16 font-light leading-relaxed"
        >
          Getting legal guidance has never been easier. Follow these simple steps to start your consultation.
        </motion.p>

        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2
              }
            }
          }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-4 gap-16 relative"
        >
          <div className="absolute top-20 left-0 w-full h-px bg-white/10 hidden md:block" />
          {[
            { step: '1', title: 'Ask Your Question', desc: 'Type your legal question in plain language.', icon: <MessageSquare className="w-8 h-8" /> },
            { step: '2', title: 'AI Analysis', desc: 'Our AI searches through Philippine legal codes.', icon: <Search className="w-8 h-8" /> },
            { step: '3', title: 'Receive Guidance', desc: 'Receive cited legal information with references.', icon: <FileText className="w-8 h-8" /> },
            { step: '4', title: 'Take Action', desc: 'Use insights to make informed decisions.', icon: <ArrowRight className="w-8 h-8" /> },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              variants={{
                hidden: { opacity: 0, y: 30 },
                show: { opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } }
              }}
              className="flex flex-col items-center group relative z-10"
            >
              <motion.div
                whileHover={{ scale: 1.05, backgroundColor: '#8b3a44' }}
                className="w-24 h-24 rounded-full bg-[#722f37] text-white flex items-center justify-center text-2xl font-bold mb-8 shadow-2xl transition-all ring-4 ring-transparent group-hover:ring-[#e9c176]/20"
              >
                {item.step}
              </motion.div>
              <motion.div
                initial={{ backgroundColor: "rgba(11, 11, 12, 0.4)" }}
                whileHover={{
                  y: -10,
                  backgroundColor: "rgba(11, 11, 12, 0.6)",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                  borderColor: "rgba(233, 193, 118, 0.3)"
                }}
                className="glass-panel p-12 rounded-[2.5rem] border border-white/5 w-full min-h-[320px] flex flex-col items-center shadow-lg transition-all backdrop-blur-xl"
              >
                <div className="text-gray-500 mb-8 transition-transform group-hover:scale-110 group-hover:text-[#e9c176]">{item.icon}</div>
                <h4 className="text-xl font-bold text-white mb-4 leading-tight transition-colors group-hover:text-[#e9c176]">{item.title}</h4>
                <p className="text-on-surface/50 text-base leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
