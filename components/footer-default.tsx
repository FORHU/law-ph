'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scale, Shield, FileText, LayoutGrid } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative bg-[#0B0B0C] border-t border-white/5 py-24 z-10 overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
      
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
          {/* Brand Column */}
          <div className="md:col-span-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <span className="text-3xl font-serif text-white antialiased cursor-pointer flex items-center gap-0.5" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <span className="font-light tracking-tight opacity-70">ilove</span>
                <span className="font-bold tracking-tighter text-secondary italic">lawyer</span>
              </span>
            </motion.div>
            <p className="text-on-surface/40 text-sm leading-relaxed max-w-sm mb-10">
              The definitive digital workspace for the Philippine legal profession. Bridging centuries of jurisprudence with cutting-edge artificial intelligence.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-on-surface/30 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                <Shield size={18} />
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-on-surface/30 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                <Scale size={18} />
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-12">
            <div>
              <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-8">Platform</h4>
              <ul className="space-y-4 text-sm text-on-surface/40">
                <li><a href="/consultation" className="hover:text-secondary transition-colors">AI Consultation</a></li>
                <li><a href="/cases" className="hover:text-secondary transition-colors">Case Management</a></li>
                <li><a href="/transcribe" className="hover:text-secondary transition-colors">TSN Transcription</a></li>
                <li><a href="/documents" className="hover:text-secondary transition-colors">Document Review</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-8">Resources</h4>
              <ul className="space-y-4 text-sm text-on-surface/40">
                <li><a href="https://www.officialgazette.gov.ph/" target="_blank" className="hover:text-secondary transition-colors">Official Gazette</a></li>
                <li><a href="https://sc.judiciary.gov.ph/" target="_blank" className="hover:text-secondary transition-colors">SC Jurisprudence</a></li>
                <li><a href="/consultation" className="hover:text-secondary transition-colors">Legal Templates</a></li>
                <li><a href="/consultation" className="hover:text-secondary transition-colors">Research Tools</a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-8">Legal</h4>
              <ul className="space-y-4 text-sm text-on-surface/40">
                <li><a href="/" className="hover:text-secondary transition-colors">Privacy Policy</a></li>
                <li><a href="/" className="hover:text-secondary transition-colors">Terms of Service</a></li>
                <li><a href="/" className="hover:text-secondary transition-colors">Ethical AI Charter</a></li>
                <li><a href="/" className="hover:text-secondary transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] font-bold tracking-widest text-on-surface/20 uppercase">
            © 2024 ILOVELAWYER PHILIPPINES. BUILT FOR THE FILIPINO PEOPLE.
          </p>
          <div className="flex gap-8 items-center">
            <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Systems Operational
            </span>
            <span className="text-[10px] font-bold text-on-surface/20 uppercase tracking-widest">
              v1.0.4-PRO
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
