'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, FileText, LayoutGrid } from 'lucide-react';

interface WhyChooseSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function WhyChooseSection({ setActiveAngle }: WhyChooseSectionProps) {
  const [time, setTime] = useState('0:00.00');

  useEffect(() => {
    let frame = 0;
    const targetMs = 6000;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - startTime) % targetMs;
      const totalSeconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');
      const centiseconds = Math.floor((elapsed % 1000) / 10).toString().padStart(2, '0');
      setTime(`${minutes}:${seconds}.${centiseconds}`);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section
      id="why-choose"
      className="py-48 overflow-hidden bg-background"
      onMouseEnter={() => setActiveAngle?.(2)}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-[1440px] mx-auto px-12 grid grid-cols-12 gap-24 items-center"
      >
        <div className="col-span-12 lg:col-span-7">
          <h2 className="text-6xl font-serif text-white mb-12 leading-[1.1]">
            Why Choose <br />
            <span className="text-[#e9c176]">ilovelawyer?</span>
          </h2>
          <p className="text-lg text-on-surface/50 mb-16 leading-relaxed max-w-2xl font-light">
            Traditional legal consultations can be fragmented and opaque. ilovelawyer provides immediate, institutional-grade guidance when precision is paramount.
          </p>

          <motion.div
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15
                }
              }
            }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-12"
          >
            {[
              { title: '24/7 Availability', desc: 'Secure institutional guidance at any hour.', icon: <Clock className="w-6 h-6" /> },
              { title: 'Instant Responses', desc: 'Immediate synthesis of relevant legal codes.', icon: <Zap className="w-6 h-6" /> },
              { title: 'Ratified Knowledge', desc: 'Based on current legal codes and precedents.', icon: <FileText className="w-6 h-6" /> },
              { title: 'Affordable Access', desc: 'Professional legal records at institutional efficiency.', icon: <LayoutGrid className="w-6 h-6" /> },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
                }}
                className="flex gap-8 items-start group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#722f37]/10 flex items-center justify-center text-[#e9c176] border border-[#722f37]/20 mt-1 shrink-0 transition-all group-hover:scale-110 group-hover:bg-[#722f37]/20 group-hover:border-[#e9c176]/30">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2 group-hover:text-[#e9c176] transition-colors">{item.title}</h4>
                  <p className="text-on-surface/40 text-lg leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="col-span-12 lg:col-span-5 flex justify-center">
          <motion.div
            whileHover={{ scale: 1.02, rotate: 1 }}
            className="glass-panel rounded-[3rem] p-20 border border-white/5 w-full max-w-xl text-center relative overflow-hidden group shadow-2xl bg-[#0B0B0C]/40 backdrop-blur-3xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center mx-auto mb-12 text-[#e9c176] border border-[#722f37]/20">
              <Clock className="w-8 h-8" />
            </div>
            <div className="text-6xl font-serif text-white mb-6 tracking-tighter tabular-nums">
              {time}
            </div>
            <p className="text-[#e9c176]/50 text-[10px] tracking-[0.4em] uppercase mb-16 font-bold">Institutional Response Time</p>
            <button className="w-full bg-[#722f37] hover:bg-[#8b3a44] text-white py-4 rounded-xl text-lg font-bold transition-all shadow-xl shadow-[#722f37]/20 uppercase tracking-widest active:scale-95">
              Initiate Consultation
            </button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
