
import React from 'react';
import FAQSection from './faq-section';
import ResourcesSection from './resources-section';
import { HeroSection } from './landing/hero-section';
import { HowItWorksSection } from './landing/how-it-works-section';
import { DemoSection } from './landing/demo-section';
import { CapabilitiesSection } from './landing/capabilities-section';
import { WhyChooseSection } from './landing/why-choose-section';
import { TrustSection } from './landing/trust-section';

interface LandingPageProps {
  onStartConsultation: () => void;
}

export function LandingPage({ onStartConsultation } : LandingPageProps ) {
  return (
    <div className="space-y-0">
      <HeroSection onStartConsultation={onStartConsultation} />
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <DemoSection />
      <CapabilitiesSection />
      <WhyChooseSection />
      <ResourcesSection />
      <TrustSection />
      <FAQSection />
    </div>
  );
};

