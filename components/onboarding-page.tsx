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
    switch(angle) {
      case 2: return '/images/onboarding/angle2.png';
      case 3: return '/images/onboarding/angle3.png';
      default: return '/images/onboarding/angle1.png';
    }
  };

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
        <div className="absolute inset-0 bg-gradient-to-b from-[#131314]/90 via-transparent to-[#131314]" />
      </div>

      {/* TopNavBar */}
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-8 py-3 bg-[#0B0B0C]/80 backdrop-blur-xl border-b border-white/10 shadow-none">
        <div className="flex items-center gap-8">
          <span className="text-3xl font-semibold text-white tracking-widest font-serif antialiased tracking-tight cursor-pointer" onClick={() => router.push('/')}>ilovelawyer</span>
          <nav className="hidden md:flex gap-6">
            <button onMouseEnter={() => setActiveAngle(1)} onClick={() => router.push('/')} className="text-white border-b-2 border-[#722f37] pb-1 text-lg cursor-pointer">Home</button>
            <button onMouseEnter={() => setActiveAngle(2)} onClick={() => router.push('/consultation')} className="text-gray-400 hover:text-white transition-colors text-lg cursor-pointer">AI Consultation</button>
            <button onMouseEnter={() => setActiveAngle(3)} onClick={() => router.push('/cases')} className="text-gray-400 hover:text-white transition-colors text-lg cursor-pointer">Case Management</button>
            <button onMouseEnter={() => setActiveAngle(3)} onClick={() => router.push('/transcribe')} className="text-gray-400 hover:text-white transition-colors text-lg cursor-pointer">TSN Transcription</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-white/5 overflow-hidden border border-white/10">
            <img alt="Profile" className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8EY39Zq5rT78j-9WLvOV_OWueCpYW0vIVSwA6qP1P3mJXXdmNbYskk-67GCWiqX3xHpSaozK19Fidiy4-udLPYiDF43ncMGieO3l56KDI8a_f_KHWePGed-hsMwC5tlhFJ0MhduiFT2NhZpKok7TcvBa2HpMYwkuq35RUAPn7snfHmiizDhfWUU8O8sQJNP_3OPpJYw7I4appIlCXpzOdEADs5m15rucssoUggiZJK5wRMjP_8WxywZefFd63VE4l793c-l2udQ" />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        {/* Latest Updates News Ticker */}
        <section className="bg-black/40 py-2 border-b border-white/5 overflow-hidden">
          <div className="max-w-[1280px] mx-auto px-8 flex items-center gap-4">
            <span className="text-sm font-bold tracking-widest text-secondary whitespace-nowrap uppercase">Latest Updates</span>
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-12 animate-marquee whitespace-nowrap text-base font-medium text-on-surface/70">
                <span>SC Ruling: En Banc Resolution on Rule 138-A ...</span>
                <span>SEC Memorandum Circular No. 12: New Sustainability Reporting Guidelines ...</span>
                <span>G.R. No. 256789: Landmark Privacy Case Decision Released ...</span>
              </div>
            </div>
          </div>
        </section>

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

        {/* Persistent Sticky Search Bar */}
        <div className="fixed bottom-12 left-0 right-0 z-50 px-6 pointer-events-none">
          <div className="max-w-3xl mx-auto glass-panel rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl border border-white/10 pointer-events-auto">
            <div className="flex items-center gap-4 flex-1">
              <span className="material-symbols-outlined text-secondary">auto_awesome</span>
              <input 
                className="bg-transparent border-none text-on-surface focus:ring-0 w-full placeholder:text-on-surface/30 text-lg" 
                placeholder="Ask ilovelawyer anything about PH Law..." 
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    router.push('/consultation?q=' + encodeURIComponent(e.currentTarget.value));
                  }
                }}
              />
            </div>
            <button 
              onClick={() => router.push('/consultation')}
              className="bg-[#722f37] text-white p-3 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
