'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS, ASSETS } from '@/lib/constants';
import { Menu, X } from 'lucide-react';

import { HeroSection } from './landing/hero-section';
import { WhyChooseSection } from './landing/why-choose-section';
import { HowItWorksSection } from './landing/how-it-works-section';
import { DemoSection } from './landing/demo-section';
import { CapabilitiesSection } from './landing/capabilities-section';
import { TrustSection } from './landing/trust-section';
import { FAQSection } from './faq-section';
import { ResourcesSection } from './resources-section';
import { Footer } from './footer-default';

const NAV_LINKS = [
  { label: 'Why Choose', id: 'why-choose' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Capabilities', id: 'capabilities' },
  { label: 'Resources', id: 'resources' },
  { label: 'FAQ', id: 'faq' },
];

export function OnboardingPage() {
  const router = useRouter();
  const { loggedIn } = useAuth();
  const [activeAngle, setActiveAngle] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getAngleImage = (angle: number) => {
    switch (angle) {
      case 2: return ASSETS.HALL_ANGLE_2;
      case 3: return ASSETS.HALL_ANGLE_3;
      case 4: return ASSETS.HALL_ANGLE_4;
      default: return ASSETS.HALL_ANGLE_1;
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-transparent text-on-background font-body-md overflow-x-hidden min-h-screen relative flex flex-col">

      {/* ── Top Nav ──────────────────────────────────────────────── */}
      <motion.header
        initial={{ backgroundColor: 'rgba(11,11,12,0)', backdropFilter: 'blur(0px)', borderBottomColor: 'rgba(255,255,255,0.01)' }}
        animate={{
          backgroundColor: isScrolled ? 'rgba(11,11,12,0.85)' : 'rgba(11,11,12,0)',
          backdropFilter: isScrolled ? 'blur(24px)' : 'blur(0px)',
          borderBottomColor: isScrolled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.01)',
          paddingTop: isScrolled ? '10px' : '20px',
          paddingBottom: isScrolled ? '10px' : '20px',
        }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="sticky top-0 z-50 flex justify-between items-center w-full px-4 sm:px-8 lg:px-12 border-b"
      >
        {/* Logo */}
        <motion.span
          className="antialiased cursor-pointer flex items-center shrink-0"
          onClick={() => router.push('/')}
        >
          <span className="font-serif italic lowercase text-2xl sm:text-3xl" style={{ color: COLORS.SECONDARY }}>ilove</span>
          <span className="font-serif text-white font-medium lowercase text-2xl sm:text-3xl">lawyer</span>
        </motion.span>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 lg:gap-10 items-center">
          {NAV_LINKS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => scrollTo(tab.id)}
              className="text-on-surface/40 hover:text-white transition-all text-xs lg:text-sm font-bold uppercase tracking-widest cursor-pointer relative group"
            >
              {tab.label}
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-secondary transition-all group-hover:w-full" />
            </button>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </motion.header>

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[56px] inset-x-0 z-40 bg-[#0B0B0C]/95 backdrop-blur-xl border-b border-white/10 md:hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-1">
              {NAV_LINKS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => scrollTo(tab.id)}
                  className="text-left py-3 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white border-b border-white/5 last:border-0 transition-colors"
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 flex-1 flex flex-col">
        <div className="flex-1">
          <HeroSection onStartConsultation={() => router.push('/consultation')} setActiveAngle={setActiveAngle} />
          <WhyChooseSection setActiveAngle={setActiveAngle} />
          <HowItWorksSection setActiveAngle={setActiveAngle} />
          <DemoSection setActiveAngle={setActiveAngle} />
          <CapabilitiesSection setActiveAngle={setActiveAngle} />
          <TrustSection setActiveAngle={setActiveAngle} />
          <ResourcesSection setActiveAngle={setActiveAngle} />
          <FAQSection setActiveAngle={setActiveAngle} />
        </div>
        <Footer />
      </main>
    </div>
  );
}
