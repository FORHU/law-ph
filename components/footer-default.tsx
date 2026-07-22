'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/constants';
import { LegalModal } from '@/components/auth/legal-modal';
import { useTranslation } from '@/lib/i18n/language-provider';

const SOCIAL_LINKS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61585471193562',
    icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/forhu_ai/',
    icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>,
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/forhuai',
    icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/forhu-ai-42484a3a3/',
    icon: <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@ForhuAI2025',
    icon: <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>,
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@forhu_ai',
    icon: <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/>,
  },
];

export function Footer() {
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'ethical-ai' | 'compliance' | null>(null);
  const { t } = useTranslation();

  return (
    <footer className="relative bg-[#0B0B0C] border-t border-white/5 z-10 overflow-hidden">
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />

      {/* Main footer body */}
      <div className="max-w-[1280px] mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-start gap-12 md:gap-0 justify-between">

          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-4 max-w-xs"
          >
            <span
              className="flex items-center cursor-pointer w-fit"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <span className="font-serif italic lowercase text-3xl" style={{ color: COLORS.SECONDARY }}>{t('common.brand.part1')}</span>
              <span className="font-serif text-white font-medium lowercase text-3xl">{t('common.brand.part2')}</span>
            </span>
            <p className="text-white/30 text-sm leading-relaxed">
              {t('landing.footer.tagline')}
            </p>
          </motion.div>

          {/* Legal links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white/50 font-bold text-[10px] tracking-[0.2em] uppercase">{t('landing.footer.legal')}</h4>
            <ul className="flex flex-col gap-3 text-sm text-white/30">
              <li>
                <button onClick={() => setLegalModal('privacy')} className="hover:text-secondary transition-colors">{t('landing.footer.privacyPolicy')}</button>
              </li>
              <li>
                <button onClick={() => setLegalModal('terms')} className="hover:text-secondary transition-colors">{t('landing.footer.termsOfService')}</button>
              </li>
              <li>
                <button onClick={() => setLegalModal('ethical-ai')} className="hover:text-secondary transition-colors">{t('landing.footer.ethicalAiCharter')}</button>
              </li>
              <li>
                <button onClick={() => setLegalModal('compliance')} className="hover:text-secondary transition-colors">{t('landing.footer.compliance')}</button>
              </li>
            </ul>
          </div>

          {/* Social links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white/50 font-bold text-[10px] tracking-[0.2em] uppercase">{t('landing.footer.followUs')}</h4>
            <div className="grid grid-cols-3 gap-2">
              {SOCIAL_LINKS.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-white/30 hover:text-secondary hover:border-secondary/30 hover:bg-secondary/5 transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">{icon}</svg>
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.05]">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} Law-PH · ilovelawyer. {t('landing.footer.allRightsReserved')}</p>
          <p className="text-white/20 text-xs">{t('landing.footer.builtFor')}</p>
        </div>
      </div>
    </footer>
  );
}
