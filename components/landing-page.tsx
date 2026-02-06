
import React from 'react';
import FAQSection from './faq-section';
import ResourcesSection from './resources-section';
import { HeroSection } from './landing/hero-section';
import { HowItWorksSection } from './landing/how-it-works-section';
import { DemoSection } from './landing/demo-section';
import { CapabilitiesSection } from './landing/capabilities-section';
import { WhyChooseSection } from './landing/why-choose-section';

interface LandingPageProps {
  onStartConsultation: () => void;
}

export function LandingPage({ onStartConsultation } : LandingPageProps ) {
  return (
    <div className="space-y-0">
      <HeroSection onStartConsultation={onStartConsultation} />
      <HowItWorksSection />
      <DemoSection />
      <CapabilitiesSection />
      <WhyChooseSection />
      <FAQSection />
      <ResourcesSection />

      {/* Trust Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-5 flex flex-col justify-center">
              <h2 className="text-4xl font-bold tracking-tight mb-6">
                Built on Trust & Security
              </h2>
              <p className="text-gray-400 text-xl mb-8 leading-relaxed">
                Legal matters require absolute confidentiality. We prioritize your data security and privacy above all else.
              </p>
              <a href="#" className="text-primary text-lg font-bold hover:underline inline-flex items-center gap-2 group">
                Read our Privacy Policy
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </a>
            </div>
            
            <div className="lg:col-span-7 grid sm:grid-cols-1 gap-6">
              <TrustCard 
                icon="verified_user"
                title="Data Privacy Compliant"
                description="Fully compliant with the Philippine Data Privacy Act of 2012 (R.A. 10173). Your data is handled with strict adherence to local laws."
                accentColor="text-green-400"
                bgColor="bg-green-500/10"
              />
              <TrustCard 
                icon="lock"
                title="Secure Encryption"
                description="All conversations and uploaded documents are protected by enterprise-grade AES-256 encryption and multi-factor authentication."
                accentColor="text-blue-400"
                bgColor="bg-blue-500/10"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="group relative p-8 rounded-3xl bg-card-dark border border-border-dark hover:border-primary/50 transition-all duration-300">
    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
);

const TrustCard: React.FC<{ icon: string; title: string; description: string; accentColor: string; bgColor: string }> = ({ icon, title, description, accentColor, bgColor }) => (
  <div className="flex flex-col sm:flex-row gap-6 p-8 rounded-3xl bg-card-dark border border-border-dark hover:border-border-dark/80 transition-all">
    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${bgColor} flex items-center justify-center ${accentColor}`}>
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </div>
    <div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  </div>
);

