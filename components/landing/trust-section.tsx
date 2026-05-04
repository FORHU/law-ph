'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, EyeOff, ShieldCheck, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface TrustSectionProps {
  setActiveAngle?: (angle: number) => void;
}

export function TrustSection({ setActiveAngle }: TrustSectionProps) {
  const trustItems = [
    { 
      icon: <Lock className="w-8 h-8 text-secondary" />, 
      title: 'AES-256 Encryption', 
      desc: 'Military-grade encryption protects all your data in transit and at rest.' 
    },
    { 
      icon: <EyeOff className="w-8 h-8 text-secondary" />, 
      title: 'Zero Knowledge Architecture', 
      desc: 'Your conversations and documents are encrypted end-to-end.' 
    },
    { 
      icon: <ShieldAlert className="w-8 h-8 text-secondary" />, 
      title: 'No Third-Party Sharing', 
      desc: 'We never share your data with third parties without explicit consent.' 
    },
    { 
      icon: <CheckCircle2 className="w-8 h-8 text-secondary" />, 
      title: 'DPA Compliant', 
      desc: 'Fully compliant with the Philippine Data Privacy Act of 2012 (R.A. 10173).' 
    }
  ];

  return (
    <section 
      className="py-48 px-12 bg-background"
      onMouseEnter={() => setActiveAngle?.(2)}
    >
      <div className="max-w-[1200px] mx-auto">
        <motion.div 
          className="glass-panel rounded-[3rem] p-24 border border-white/10 text-center shadow-2xl bg-white/[0.01]"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-center mb-24">
            <h2 className="text-6xl font-serif text-white mb-8 leading-tight">Built on Trust & Security</h2>
            <p className="text-on-surface/50 text-lg mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Legal matters require absolute confidentiality. We prioritize your data security and privacy above all else.
            </p>
            <motion.div whileHover={{ scale: 1.05 }}>
              <a 
                href="#" 
                className="text-secondary text-lg font-bold border-b-2 border-secondary/20 pb-2 inline-flex items-center gap-3 hover:border-secondary transition-all"
              >
                Read Our Privacy Policy <ExternalLink size={20} />
              </a>
            </motion.div>
          </div>

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
            className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left"
          >
            {trustItems.map((item, index) => (
              <motion.div 
                key={index} 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
                }}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                animate={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                className="border border-white/5 rounded-[2rem] p-12 group transition-all shadow-lg cursor-default"
                whileHover={{ y: -8, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(233, 193, 118, 0.2)' }}
              >
                <div className="mb-10 transition-transform group-hover:scale-110">{item.icon}</div>
                <h4 className="text-xl font-bold text-white mb-4 leading-tight group-hover:text-secondary transition-colors">{item.title}</h4>
                <p className="text-on-surface/40 text-base leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="mt-16 p-10 bg-primary-container/5 rounded-[2rem] border border-primary-container/10 inline-flex items-center gap-6 text-lg text-on-surface/40 font-medium"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            <Shield className="w-10 h-10 text-primary-container shrink-0" /> 
            <span className="max-w-2xl text-left">Your privacy is our priority. We use industry-standard security measures to protect your information.</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
