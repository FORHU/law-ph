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
          <span className="text-secondary text-sm tracking-[0.4em] font-bold uppercase mb-8 block">POWERFUL FEATURES</span>
          <h2 className="text-8xl font-serif text-white mb-10 leading-[1.1]">Comprehensive Legal Capabilities</h2>
          <p className="text-on-surface/50 text-2xl max-w-3xl mx-auto font-light leading-relaxed">Empowering you with tools designed for the complexities of the Philippine legal system.</p>
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
                className="w-24 h-24 rounded-3xl bg-primary-container/20 flex items-center justify-center mb-12 border border-primary-container/30 text-primary-container shadow-xl shadow-primary-container/10"
                initial={{ scale: 0, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
              >
                <FileCheck size={48} />
              </motion.div>
              <h3 className="text-6xl font-serif text-white mb-10 leading-tight">AI-Powered Document Review</h3>
              <p className="text-2xl text-on-surface/70 leading-relaxed mb-12 font-light">
                Draft, analyze, and review contracts and legal documents with AI-driven precision. Our system identifies potential issues and ensures compliance.
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
                    <div className="w-2 h-2 rounded-full bg-secondary shrink-0 transition-transform group-hover/item:scale-150" />
                    <span className="font-medium group-hover/item:text-white transition-colors">{item}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(114, 47, 55, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/documents')}
                className="bg-[#722f37] text-white px-12 py-6 rounded-xl text-xl font-bold flex items-center gap-4 transition-all cursor-pointer"
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
                  <div className="flex items-center gap-4 text-xs text-on-surface/40 mb-6 tracking-[0.3em] uppercase font-black">
                    <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    AI Analysis Complete
                  </div>
                  <div className="h-3 w-full bg-secondary/10 rounded mb-4" />
                  <div className="h-3 w-2/3 bg-secondary/10 rounded" />
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
            animate={{ backgroundColor: "rgba(255, 255, 255, 0.01)" }}
            whileHover={{ y: -10, borderColor: 'rgba(233, 193, 118, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
            onClick={() => router.push('/consultation')}
            className="glass-panel p-20 rounded-[3rem] border border-white/10 group transition-all shadow-xl hover:shadow-2xl cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-12 text-on-surface/30 group-hover:text-secondary transition-colors border border-white/5">
              <Search size={36} />
            </div>
            <h3 className="text-5xl font-serif text-white mb-8">Advanced Legal Research</h3>
            <p className="text-xl text-on-surface/50 leading-relaxed mb-12 font-light">
              Get instant citations from Republic Acts and Batas Pambansa. Our AI searches through decades of legal documentation in seconds.
            </p>
            <div className="text-secondary text-xl font-bold flex items-center gap-3 group-hover:gap-5 transition-all">
              Explore Research Tools <ArrowRight size={28} />
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
            animate={{ backgroundColor: "rgba(255, 255, 255, 0.01)" }}
            whileHover={{ y: -10, borderColor: 'rgba(233, 193, 118, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
            onClick={() => router.push('/cases')}
            className="glass-panel p-20 rounded-[3rem] border border-white/10 group transition-all shadow-xl hover:shadow-2xl cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-12 text-on-surface/30 group-hover:text-secondary transition-colors border border-white/5">
              <Scale size={36} />
            </div>
            <h3 className="text-5xl font-serif text-white mb-8">Supreme Court Case Summaries</h3>
            <p className="text-xl text-on-surface/50 leading-relaxed mb-12 font-light">
              Simplify complex jurisprudence with AI-generated summaries of landmark SC decisions, making legal precedents accessible.
            </p>
            <div className="text-secondary text-xl font-bold flex items-center gap-3 group-hover:gap-5 transition-all">
              Browse Case Library <ArrowRight size={28} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
