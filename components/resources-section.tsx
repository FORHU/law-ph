'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Scale, ShieldCheck, ExternalLink } from 'lucide-react';

interface ResourcesSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function ResourcesSection({ setActiveAngle }: ResourcesSectionProps) {
  const resources = [
    {
      title: 'Official Gazette',
      desc: 'The official journal of the Republic of the Philippines featuring newly enacted laws, executive orders, and proclamations.',
      badge: 'OFFICIAL',
      icon: <FileText className="w-6 h-6 sm:w-8 sm:h-8" />,
      url: 'https://www.officialgazette.gov.ph/'
    },
    {
      title: 'Integrated Bar of the Philippines',
      desc: 'Find accredited lawyers, legal resources, and information about the Philippine legal profession.',
      badge: 'PROFESSIONAL',
      icon: <Scale className="w-6 h-6 sm:w-8 sm:h-8" />,
      url: 'https://ibp.ph/'
    },
    {
      title: 'Security and Exchange Commission',
      desc: 'Responsible for the oversight and regulation of the financial services industry within the Philippines.',
      badge: 'OFFICIAL',
      icon: <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8" />,
      url: 'https://www.sec.gov.ph/'
    },
  ];

  return (
    <section
      id="resources"
      className="py-16 sm:py-24 lg:py-48 px-4 sm:px-8 lg:px-12 bg-transparent"
      onMouseEnter={() => setActiveAngle?.(3)}
    >
      <div className="max-w-[1440px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 sm:mb-16 lg:mb-24"
        >
          <span className="px-4 sm:px-6 py-2 bg-[#722f37]/10 border border-[#722f37]/20 text-[#e9c176] text-[10px] font-bold tracking-[0.4em] uppercase rounded-full mb-6 sm:mb-10 inline-block">
            Citizen Archives
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-7xl xl:text-8xl font-serif text-white mb-4 sm:mb-6 lg:mb-8 leading-tight">
            Legal <span className="text-[#e9c176] italic">Resources</span>
          </h2>
          <p className="text-on-surface/50 text-base sm:text-lg lg:text-xl xl:text-2xl max-w-3xl font-light leading-relaxed">
            Direct access to official government portals and verified legal assistance programs in the Philippines.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-12">
          {resources.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              whileHover={{ y: -10, borderColor: 'rgba(233,193,118,0.3)', backgroundColor: 'rgba(11,11,12,0.6)' }}
              onClick={() => window.open(item.url, '_blank')}
              className="glass-panel p-6 sm:p-8 lg:p-12 xl:p-16 rounded-[2rem] lg:rounded-[3rem] border border-white/5 group transition-all cursor-pointer shadow-lg hover:shadow-[#e9c176]/5 bg-[#0B0B0C]/40 backdrop-blur-3xl"
            >
              <div className="flex justify-between items-start mb-6 sm:mb-8 lg:mb-12">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center text-[#e9c176]/30 group-hover:text-[#e9c176] transition-all border border-[#722f37]/20">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#e9c176]/60 border border-[#722f37]/30 px-3 sm:px-4 py-1.5 rounded-full uppercase">
                  {item.badge}
                </span>
              </div>
              <h4 className="text-xl sm:text-2xl lg:text-3xl font-serif text-white mb-3 sm:mb-4 lg:mb-6 leading-tight group-hover:text-[#e9c176] transition-colors">
                {item.title}
              </h4>
              <p className="text-on-surface/40 text-sm sm:text-base lg:text-lg leading-relaxed mb-6 sm:mb-8 lg:mb-12 font-medium">
                {item.desc}
              </p>
              <button className="text-[#e9c176] font-bold flex items-center gap-2 sm:gap-3 group-hover:gap-4 sm:group-hover:gap-5 transition-all uppercase tracking-widest text-[11px]">
                Access Portal <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
