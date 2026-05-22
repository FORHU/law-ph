'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowRight, Scale } from 'lucide-react';

interface DemoSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function DemoSection({ setActiveAngle }: DemoSectionProps) {
  const router = useRouter();

  return (
    <section
      className="py-48 bg-background"
      onMouseEnter={() => setActiveAngle?.(3)}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-[1200px] mx-auto px-12 text-center"
      >
        <span className="text-gray-500 text-sm tracking-[0.4em] font-bold uppercase mb-8 block">Live Preview</span>
        <h2 className="text-5xl font-serif text-white mb-8 leading-[1.1]">AI Legal Consultation in Action</h2>
        <p className="text-on-surface/50 text-lg mb-16 max-w-3xl mx-auto font-light">See how our AI provides instant, accurate legal guidance based on Philippine law.</p>

        <div className="glass-panel rounded-[3rem] p-16 md:p-24 border border-white/10 text-left relative overflow-hidden shadow-2xl bg-white/[0.01]">
          <div className="space-y-12 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex justify-end"
            >
              <div className="bg-[#722f37]/20 rounded-[2rem] rounded-tr-none p-8 text-white text-base md:text-lg max-w-2xl border border-[#722f37]/30 shadow-xl leading-relaxed backdrop-blur-xl">
                What are the legal requirements for terminating a lease early under the Civil Code?
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="flex gap-8"
            >
              <div className="w-16 h-16 rounded-full bg-[#722f37]/10 flex items-center justify-center shrink-0 border border-[#722f37]/20 shadow-lg shadow-[#722f37]/5">
                <Scale className="w-8 h-8 text-gray-400" />
              </div>
              <div className="bg-[#0B0B0C]/60 rounded-[2rem] rounded-tl-none p-10 text-gray-300 text-base md:text-lg leading-relaxed border border-[#e9c176]/20 shadow-2xl font-light backdrop-blur-3xl">
                <span className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] block mb-4">AI Summary</span>
                Under the Civil Code of the Philippines, particularly Article 1673, a lessor cannot arbitrarily terminate a lease agreement prior to the expiration of the stipulated period. All terminations must follow proper legal procedures...
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.2 }}
            className="mt-20 flex justify-center"
          >
            <button
              onClick={() => router.push('/consultation')}
              className="bg-[#722f37] text-white px-8 py-4 rounded-xl flex items-center gap-4 text-lg font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#722f37]/20"
            >
              <MessageSquare className="w-5 h-5" />
              Start Your Consultation <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
