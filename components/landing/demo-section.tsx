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
        <span className="text-secondary text-sm tracking-[0.4em] font-bold uppercase mb-8 block">Live Preview</span>
        <h2 className="text-7xl font-serif text-white mb-10 leading-[1.1]">AI Legal Consultation in Action</h2>
        <p className="text-on-surface/50 text-2xl mb-24 max-w-3xl mx-auto font-light">See how our AI provides instant, accurate legal guidance based on Philippine law.</p>
        
        <div className="glass-panel rounded-[3rem] p-16 md:p-24 border border-white/10 text-left relative overflow-hidden shadow-2xl bg-white/[0.01]">
          <div className="space-y-12 max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex justify-end"
            >
              <div className="bg-[#2A1F1A]/80 rounded-[2rem] rounded-tr-none p-10 text-on-surface/90 text-lg md:text-xl max-w-2xl border border-white/5 shadow-xl leading-relaxed">
                What are my rights as a tenant if my landlord wants to terminate my lease early?
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="flex gap-8"
            >
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 border border-secondary/20 shadow-lg shadow-secondary/5">
                <Scale className="w-8 h-8 text-secondary" />
              </div>
              <div className="bg-white/5 rounded-[2rem] rounded-tl-none p-12 text-on-surface/80 text-lg md:text-xl leading-relaxed border border-white/5 shadow-xl font-light">
                Under Philippine law, particularly the Civil Code, a landlord cannot arbitrarily terminate a lease agreement before the agreed period ends. According to Article 1673, you have the right to continue occupying the property...
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
              className="bg-[#722f37] text-white px-12 py-6 rounded-xl flex items-center gap-4 text-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#722f37]/20"
            >
              <MessageSquare className="w-6 h-6" />
              Start Your Consultation <ArrowRight className="w-6 h-6" />
            </button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
