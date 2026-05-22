'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS, ASSETS } from '@/lib/constants';

// Modular Landing Components
import { HeroSection } from './landing/hero-section';
import { WhyChooseSection } from './landing/why-choose-section';
import { HowItWorksSection } from './landing/how-it-works-section';
import { DemoSection } from './landing/demo-section';
import { CapabilitiesSection } from './landing/capabilities-section';
import { TrustSection } from './landing/trust-section';
import { FAQSection } from './faq-section';
import { ResourcesSection } from './resources-section';

import { Footer } from './footer-default';

export function OnboardingPage() {
  const router = useRouter();
  const { loggedIn } = useAuth();
  const [activeAngle, setActiveAngle] = useState(1);

  const getAngleImage = (angle: number) => {
    switch (angle) {
      case 2: return ASSETS.HALL_ANGLE_2;
      case 3: return ASSETS.HALL_ANGLE_3;
      case 4: return ASSETS.HALL_ANGLE_4;
      default: return ASSETS.HALL_ANGLE_1;
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-transparent text-on-background font-body-md overflow-x-hidden min-h-screen relative flex flex-col">
      {/* 3D Model is rendered globally behind this component */}

      {/* TopNavBar */}
      <motion.header
        initial={{ backgroundColor: 'rgba(11, 11, 12, 0)', backdropFilter: 'blur(0px)', borderBottomColor: 'rgba(255, 255, 255, 0.01)' }}
        animate={{
          backgroundColor: isScrolled ? 'rgba(11, 11, 12, 0.8)' : 'rgba(11, 11, 12, 0)',
          backdropFilter: isScrolled ? 'blur(24px)' : 'blur(0px)',
          borderBottomColor: isScrolled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.01)',
          paddingTop: isScrolled ? '12px' : '24px',
          paddingBottom: isScrolled ? '12px' : '24px',
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="sticky top-0 z-50 flex justify-between items-center w-full px-12 border-b shadow-none"
      >
        <div className="flex items-center gap-12">
          <motion.span
            className="antialiased cursor-pointer flex items-center"
            onClick={() => router.push('/')}
          >
            <span className="font-serif italic lowercase text-3xl" style={{ color: COLORS.SECONDARY }}>ilove</span>
            <span className="font-serif text-white font-medium lowercase text-3xl">lawyer</span>
          </motion.span>
          <nav className="hidden md:flex gap-10 items-center">
            {[
              { label: 'Why Choose', id: 'why-choose' },
              { label: 'How It Works', id: 'how-it-works' },
              { label: 'Capabilities', id: 'capabilities' },
              { label: 'Resources', id: 'resources' },
              { label: 'FAQ', id: 'faq' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  const el = document.getElementById(tab.id);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-on-surface/40 hover:text-white transition-all text-sm font-bold uppercase tracking-widest cursor-pointer relative group"
              >
                {tab.label}
                <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-secondary transition-all group-hover:w-full" />
              </button>
            ))}
          </nav>
        </div>
      </motion.header>

      <main className="relative z-10 flex-1 flex flex-col">
        {/* Latest Updates News Ticker Removed */}

        {/* Section Assembly */}
        <div className="flex-1">
          <HeroSection
            onStartConsultation={() => router.push('/consultation')}
            setActiveAngle={setActiveAngle}
          />

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
