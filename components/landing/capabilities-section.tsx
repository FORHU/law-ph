'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FileCheck, Search, Scale, ArrowRight, Briefcase, BookOpen, Shield } from 'lucide-react';

interface CapabilitiesSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function CapabilitiesSection({ setActiveAngle }: CapabilitiesSectionProps) {
  const router = useRouter();

  return (
    <section 
      id="capabilities"
      className="relative py-48 px-12 bg-transparent"
      onMouseEnter={() => setActiveAngle?.(1)}
    >
      <div className="max-w-[1440px] mx-auto">
        <motion.div 
          className="text-center mb-32"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-gray-500 text-sm tracking-[0.4em] font-bold uppercase mb-8 block">POWERFUL FEATURES</span>
          <h2 className="text-6xl font-serif text-white mb-8 leading-[1.1]">Comprehensive Legal Capabilities</h2>
          <p className="text-on-surface/50 text-xl max-w-3xl mx-auto font-light leading-relaxed">Empowering you with tools designed for the complexities of the Philippine legal system.</p>
        </motion.div>

        {/* Main Featured Capability */}
        <motion.div 
          className="mb-16 group"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="glass-panel rounded-[3rem] p-24 border border-white/10 flex flex-col lg:flex-row gap-24 items-center shadow-2xl bg-white/[0.01]">
            <div className="flex-1">
              <motion.div 
                className="w-24 h-24 rounded-3xl bg-[#722f37]/10 flex items-center justify-center mb-12 border border-[#722f37]/20 text-[#e9c176] shadow-xl shadow-[#722f37]/20"
                initial={{ scale: 0, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
              >
                <FileCheck size={48} />
              </motion.div>
              <h3 className="text-4xl font-serif text-white mb-8 leading-tight tracking-tight">Institutional <span className="text-[#e9c176] italic">Review</span></h3>
              <p className="text-xl text-on-surface/70 leading-relaxed mb-10 font-light">
                Analyze, and ratify contracts and legal documents with AI-driven precision. Our system identifies potential protocol risks and ensures institutional compliance.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-16">
                {[
                  'Contract analysis and risk assessment',
                  'Compliance checking with PH regulations',
                  'Clause-by-clause breakdown',
                  'Automated redlining and suggestions'
                ].map((item, idx) => (
                  <motion.li 
                    key={idx} 
                    className="flex items-center gap-4 text-on-surface/60 text-lg group/item"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + idx * 0.1, duration: 0.8 }}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#722f37] shrink-0 transition-transform group-hover/item:scale-150" />
                    <span className="font-medium group-hover/item:text-white transition-colors">{item}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(114, 47, 55, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/documents')}
                className="bg-[#722f37] text-white px-8 py-4 rounded-xl text-lg font-bold flex items-center gap-4 transition-all cursor-pointer"
              >
                Try Document Review <ArrowRight size={24} />
              </motion.button>
            </div>
            
            {/* Animated Visual Element */}
            <div className="flex-1 w-full lg:max-w-2xl">
              <div className="bg-black/40 rounded-[2.5rem] border border-white/5 p-16 relative overflow-hidden backdrop-blur-xl shadow-2xl">
                <div className="space-y-6">
                  <div className="flex gap-6">
                    <FileCheck className="w-8 h-8 text-primary-container" />
                    <div className="h-3 w-48 bg-white/10 rounded mt-2.5" />
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-5/6 bg-white/5 rounded" />
                  <div className="flex gap-6 mt-12">
                    <Shield className="w-8 h-8 text-emerald-500" />
                    <div className="h-3 w-64 bg-white/10 rounded mt-2.5" />
                  </div>
                </div>
                
                <motion.div 
                  className="mt-16 p-10 bg-white/5 rounded-[2rem] border border-white/10 shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1 }}
                >
                  <div className="flex items-center gap-4 text-[10px] text-gray-500 mb-6 tracking-[0.2em] uppercase font-bold">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                    Protocol Analysis Complete
                  </div>
                  <div className="h-1.5 w-full bg-[#e9c176]/20 rounded-full mb-4" />
                  <div className="h-1.5 w-2/3 bg-[#e9c176]/20 rounded-full" />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secondary Capabilities Grid */}
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
          className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12"
        >
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 30 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
            }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            animate={{ backgroundColor: "#ffffff03" }}
            whileHover={{ y: -10, borderColor: '#e9c17666', backgroundColor: '#ffffff08' }}
            onClick={() => router.push('/consultation')}
            className="glass-panel p-20 rounded-[3rem] border border-white/5 group transition-all shadow-xl hover:shadow-2xl cursor-pointer bg-[#0B0B0C]/40 backdrop-blur-3xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center mb-12 text-[#e9c176]/40 group-hover:text-[#e9c176] transition-all border border-[#722f37]/20 group-hover:border-[#e9c176]/30">
              <Search size={36} />
            </div>
            <h3 className="text-3xl font-serif text-white mb-6">Institutional <span className="text-[#e9c176] italic">Research</span></h3>
            <p className="text-lg text-on-surface/50 leading-relaxed mb-10 font-light">
              Access instant citations from Republic Acts and Batas Pambansa. Our AI synthesizes decades of legal documentation with millisecond precision.
            </p>
            <div className="text-[#e9c176] text-lg font-bold flex items-center gap-3 group-hover:gap-5 transition-all uppercase tracking-widest text-[11px]">
              Explore Protocol Tools <ArrowRight size={24} />
            </div>
          </motion.div>

          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 30 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
            }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            animate={{ backgroundColor: "#ffffff03" }}
            whileHover={{ y: -10, borderColor: '#e9c17666', backgroundColor: '#ffffff08' }}
            onClick={() => router.push('/cases')}
            className="glass-panel p-20 rounded-[3rem] border border-white/5 group transition-all shadow-xl hover:shadow-2xl cursor-pointer bg-[#0B0B0C]/40 backdrop-blur-3xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center mb-12 text-[#e9c176]/40 group-hover:text-[#e9c176] transition-all border border-[#722f37]/20 group-hover:border-[#e9c176]/30">
              <Scale size={36} />
            </div>
            <h3 className="text-3xl font-serif text-white mb-6">Jurisprudential <span className="text-[#e9c176] italic">Archives</span></h3>
            <p className="text-lg text-on-surface/50 leading-relaxed mb-10 font-light">
              Simplify complex jurisprudence with AI-generated summaries of landmark SC decisions, making institutional precedents immediately accessible.
            </p>
            <div className="text-[#e9c176] text-lg font-bold flex items-center gap-3 group-hover:gap-5 transition-all uppercase tracking-widest text-[11px]">
              Browse Case Library <ArrowRight size={24} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
