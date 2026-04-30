'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';

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
    return '/assets/auth-bg.jpg';
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
    <div className="bg-background text-on-background font-body-md overflow-x-hidden min-h-screen relative flex flex-col">
      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={activeAngle}
            initial={{ opacity: 0, scale: 1.05, filter: 'grayscale(100%) blur(10px)' }}
            animate={{ opacity: 0.4, scale: 1, filter: 'grayscale(100%) blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'grayscale(100%) blur(10px)' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat contrast-125 brightness-[0.4]"
            style={{ backgroundImage: `url(${getAngleImage(activeAngle)})` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-[#131314]/60 backdrop-blur-[2px]" />

        {/* Ambient "Sovereign" Glows */}
        <div className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-[#722f37]/10 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-[#e9c176]/5 blur-[160px] rounded-full pointer-events-none" />

        {/* Deep Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')` }} />

        <div className="absolute inset-0 bg-gradient-to-b from-[#131314] via-transparent to-[#131314] opacity-90" />
      </div>

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
            whileHover={{ scale: 1.02 }}
            className="text-3xl font-serif text-white antialiased cursor-pointer flex items-center gap-0.5"
            onClick={() => router.push('/')}
          >
            <span className="font-light tracking-tight opacity-70">ilove</span>
            <span className="font-bold tracking-tighter text-secondary italic">lawyer</span>
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
        <div className="flex items-center gap-4">
          {/* Profile removed */}
        </div>
      </motion.header>

      <main className="relative z-10 flex-1 flex flex-col">
        {/* Latest Updates News Ticker Removed */}

        {/* Section Assembly */}
        <div className="flex-1 space-y-0">
          {[
            { 
              component: <HeroSection onStartConsultation={() => router.push('/consultation')} setActiveAngle={setActiveAngle} />, 
              id: 'hero',
              animation: {
                initial: { opacity: 0, scale: 1.1, y: 0 },
                whileInView: { opacity: 1, scale: 1, y: 0 }
              }
            },
            { 
              component: <WhyChooseSection setActiveAngle={setActiveAngle} />, 
              id: 'why-choose',
              animation: {
                initial: { opacity: 0, rotateX: 30, scale: 0.8, y: 100 },
                whileInView: { opacity: 1, rotateX: 0, scale: 1, y: 0 }
              }
            },
            { 
              component: <HowItWorksSection setActiveAngle={setActiveAngle} />, 
              id: 'how-it-works',
              animation: {
                initial: { opacity: 0, x: -100, skewX: -5 },
                whileInView: { opacity: 1, x: 0, skewX: 0 }
              }
            },
            { 
              component: <DemoSection setActiveAngle={setActiveAngle} />, 
              id: 'demo',
              animation: {
                initial: { opacity: 0, filter: 'blur(20px)', scale: 0.95 },
                whileInView: { opacity: 1, filter: 'blur(0px)', scale: 1 }
              }
            },
            { 
              component: <CapabilitiesSection setActiveAngle={setActiveAngle} />, 
              id: 'capabilities',
              animation: {
                initial: { opacity: 0, scale: 1.8, filter: 'blur(30px)', z: 500 },
                whileInView: { opacity: 1, scale: 1, filter: 'blur(0px)', z: 0 }
              }
            },
            { 
              component: <TrustSection setActiveAngle={setActiveAngle} />, 
              id: 'trust',
              animation: {
                initial: { opacity: 0, y: 50, filter: 'blur(10px)' },
                whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' }
              }
            },
            { 
              component: <ResourcesSection setActiveAngle={setActiveAngle} />, 
              id: 'resources',
              animation: {
                initial: { opacity: 0, scale: 0.9 },
                whileInView: { opacity: 1, scale: 1 }
              }
            },
            { 
              component: <FAQSection setActiveAngle={setActiveAngle} />, 
              id: 'faq',
              animation: {
                initial: { opacity: 0, y: 20 },
                whileInView: { opacity: 1, y: 0 }
              }
            }
          ].map((section) => (
            <div key={section.id} className="perspective-[2000px] overflow-hidden">
              <motion.div
                initial={section.animation.initial}
                whileInView={section.animation.whileInView}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="w-full transform-gpu"
              >
                {section.component}
              </motion.div>
            </div>
          ))}
        </div>


        <Footer />
      </main>
    </div>
  );
}
