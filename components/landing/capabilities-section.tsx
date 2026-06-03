'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/auth-provider';
import { FileCheck, Search, Scale, ArrowRight, Shield } from 'lucide-react';

interface CapabilitiesSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function CapabilitiesSection({ setActiveAngle }: CapabilitiesSectionProps) {
  const router = useRouter();
  const { loggedIn } = useAuth();

  const handleNav = (route: string) => {
    if (!loggedIn) {
      router.push('/auth/login');
      return;
    }
    router.push(route);
  };

  return (
    <section
      id="capabilities"
      className="relative py-16 sm:py-24 lg:py-48 px-4 sm:px-8 lg:px-12 bg-transparent"
      onMouseEnter={() => setActiveAngle?.(1)}
    >
      <div className="max-w-[1440px] mx-auto">

        {/* Heading */}
        <motion.div
          className="text-center mb-10 sm:mb-16 lg:mb-32"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-gray-500 text-sm tracking-[0.4em] font-bold uppercase mb-6 sm:mb-8 block">POWERFUL FEATURES</span>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-serif text-white mb-4 sm:mb-8 leading-[1.1]">
            Comprehensive Legal Capabilities
          </h2>
          <p className="text-on-surface/50 text-base sm:text-lg lg:text-xl max-w-3xl mx-auto font-light leading-relaxed">
            Empowering you with tools designed for the complexities of the Philippine legal system.
          </p>
        </motion.div>

        {/* Featured capability */}
        <motion.div
          className="mb-8 sm:mb-12 lg:mb-16 group"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="glass-panel rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-10 lg:p-24 border border-white/10 flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-24 items-start lg:items-center shadow-2xl bg-white/[0.01]">

            {/* Text side */}
            <div className="flex-1 w-full">
              <motion.div
                className="w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 rounded-2xl lg:rounded-3xl bg-[#722f37]/10 flex items-center justify-center mb-6 sm:mb-8 lg:mb-12 border border-[#722f37]/20 text-[#e9c176] shadow-xl shadow-[#722f37]/20"
                initial={{ scale: 0, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
              >
                <FileCheck size={28} className="sm:hidden" />
                <FileCheck size={40} className="hidden sm:block lg:hidden" />
                <FileCheck size={48} className="hidden lg:block" />
              </motion.div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-white mb-4 sm:mb-6 lg:mb-8 leading-tight tracking-tight">
                Document <span className="text-[#e9c176] italic">Review</span>
              </h3>
              <p className="text-base sm:text-lg lg:text-xl text-on-surface/70 leading-relaxed mb-6 sm:mb-8 lg:mb-10 font-light">
                Analyze contracts and legal documents with AI-driven precision. Our system identifies potential legal risks and ensures compliance.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 lg:gap-x-12 gap-y-3 sm:gap-y-4 lg:gap-y-6 mb-8 sm:mb-10 lg:mb-16">
                {[
                  'Contract analysis and risk assessment',
                  'Compliance checking with PH regulations',
                  'Clause-by-clause breakdown',
                  'Automated redlining and suggestions'
                ].map((item, idx) => (
                  <motion.li
                    key={idx}
                    className="flex items-center gap-3 sm:gap-4 text-on-surface/60 text-sm sm:text-base lg:text-lg group/item"
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
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(114,47,55,0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNav('/documents')}
                className="bg-[#722f37] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-bold flex items-center gap-3 sm:gap-4 transition-all cursor-pointer w-full sm:w-auto justify-center sm:justify-start"
              >
                Try Document Review <ArrowRight size={20} />
              </motion.button>
            </div>

            {/* Visual side */}
            <div className="flex-1 w-full lg:max-w-2xl">
              <div className="bg-black/40 rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 p-8 sm:p-12 lg:p-16 relative overflow-hidden backdrop-blur-xl shadow-2xl">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex gap-4 sm:gap-6">
                    <FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary-container" />
                    <div className="h-2.5 sm:h-3 w-32 sm:w-48 bg-white/10 rounded mt-1.5 sm:mt-2.5" />
                  </div>
                  <div className="h-2.5 sm:h-3 w-full bg-white/5 rounded" />
                  <div className="h-2.5 sm:h-3 w-5/6 bg-white/5 rounded" />
                  <div className="flex gap-4 sm:gap-6 mt-6 sm:mt-12">
                    <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                    <div className="h-2.5 sm:h-3 w-40 sm:w-64 bg-white/10 rounded mt-1.5 sm:mt-2.5" />
                  </div>
                </div>

                <motion.div
                  className="mt-8 sm:mt-12 lg:mt-16 p-5 sm:p-8 lg:p-10 bg-white/5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1 }}
                >
                  <div className="flex items-center gap-3 sm:gap-4 text-[10px] text-gray-500 mb-4 sm:mb-6 tracking-[0.2em] uppercase font-bold">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                    Analysis Complete
                  </div>
                  <div className="h-1.5 w-full bg-[#e9c176]/20 rounded-full mb-3 sm:mb-4" />
                  <div className="h-1.5 w-2/3 bg-[#e9c176]/20 rounded-full" />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secondary grid */}
        <motion.div
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.2 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mt-6 sm:mt-8 lg:mt-12"
        >
          {[
            {
              icon: <Search size={28} className="sm:hidden" />,
              iconSm: <Search size={36} className="hidden sm:block" />,
              title: 'Legal', accent: 'Research',
              desc: 'Access instant citations from Republic Acts and Batas Pambansa. Our AI instantly searches decades of legal documentation.',
              cta: 'Start Research',
              route: '/legal-library',
            },
            {
              icon: <Scale size={28} className="sm:hidden" />,
              iconSm: <Scale size={36} className="hidden sm:block" />,
              title: 'Jurisprudential', accent: 'Archives',
              desc: 'Simplify complex case law with AI-generated summaries of landmark SC decisions, making case law immediately accessible.',
              cta: 'Browse Case Library',
              route: '/cases',
            },
          ].map((card) => (
            <motion.div
              key={card.accent}
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}
              animate={{ backgroundColor: '#ffffff03' }}
              whileHover={{ y: -10, borderColor: '#e9c17666', backgroundColor: '#ffffff08' }}
              onClick={() => handleNav(card.route)}
              className="glass-panel p-8 sm:p-12 lg:p-20 rounded-[2rem] lg:rounded-[3rem] border border-white/5 group transition-all shadow-xl hover:shadow-2xl cursor-pointer bg-[#0B0B0C]/40 backdrop-blur-3xl"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center mb-6 sm:mb-10 lg:mb-12 text-[#e9c176]/40 group-hover:text-[#e9c176] transition-all border border-[#722f37]/20 group-hover:border-[#e9c176]/30">
                {card.icon}{card.iconSm}
              </div>
              <h3 className="text-2xl sm:text-2xl lg:text-3xl font-serif text-white mb-3 sm:mb-4 lg:mb-6">
                {card.title} <span className="text-[#e9c176] italic">{card.accent}</span>
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-on-surface/50 leading-relaxed mb-6 sm:mb-8 lg:mb-10 font-light">{card.desc}</p>
              <div className="text-[#e9c176] font-bold flex items-center gap-2 sm:gap-3 group-hover:gap-4 sm:group-hover:gap-5 transition-all uppercase tracking-widest text-[11px]">
                {card.cta} <ArrowRight size={20} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
