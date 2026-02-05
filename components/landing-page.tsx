
import React from 'react';
import FAQSection from './faq-section';
import ResourcesSection from './resources-section';

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface LandingPageProps {
  onStartConsultation: () => void;
}

export function LandingPage({ onStartConsultation } : LandingPageProps ) {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative py-12 lg:py-24 overflow-hidden border-b border-border-dark">
        {/* Background Elements if needed, ensuring existing layout wrapper is replaced or adapted */}
        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div 
            className="mb-4 text-sm uppercase tracking-wider text-[#fffcfd] inline-flex items-center gap-2 bg-[#8B4564]/10 px-4 py-2 rounded-full border border-[#8B4564]/30 backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            
            Immediate Legal Assistance
          </motion.div>
          
          {/* Main Heading */}
          <motion.h1 
            className="text-5xl md:text-7xl mb-6 leading-tight"
            style={{ fontFamily: 'Playfair Display, serif' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Navigate Philippine Law
            <br />
            <motion.span 
              className="text-[#8B4564]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              with AI Precision
            </motion.span>
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p 
            className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Your personal legal guide available 24/7. Get instant, cited answers based on the Revised Penal Code, Civil Code, and latest Philippine jurisprudence.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <motion.button 
              onClick={() => navigate('/consultation')}
              className="group relative px-8 py-4 bg-[#8B4564] rounded-md overflow-hidden flex items-center justify-center gap-2 text-[#1a1a1a] font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-[#9D5373] to-[#8B4564]"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative">START QUICK CONSULTATION</span>
            </motion.button>
            <motion.button 
              className="group px-8 py-4 border-2 border-[#8B4564] rounded-md flex items-center justify-center gap-2 text-[#ffffff] relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const aboutSection = document.getElementById('about');
                aboutSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <motion.div 
                className="absolute inset-0 bg-[#8B4564]"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10">LEARN HOW IT WORKS</span>
            </motion.button>
          </motion.div>

          {/* Disclaimer */}
          <motion.div 
            className="mt-12 text-xs text-gray-500 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <em>Disclaimer: ilovelawyer provides legal information for educational purposes, not professional legal advice. It is not a replacement for a certified lawyer.</em>
          </motion.div>

          {/* Floating Elements */}
          
          
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="about" className="py-24 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
              Comprehensive Legal Capabilities
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Empowering you with tools designed for the complexities of the Philippine legal system.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon="description" 
              title="Document Review" 
              description="Draft, analyze, and review simple contracts and legal documents with AI-driven precision to ensure clarity and compliance." 
            />
            <FeatureCard 
              icon="gavel" 
              title="Legal Research" 
              description="Get instant citations from Republic Acts, Batas Pambansa, and various Codes. Save hours of manual research time." 
            />
            <FeatureCard 
              icon="summarize" 
              title="Case Summaries" 
              description="Simplify complex jurisprudence. Receive concise summaries of Supreme Court decisions and landmark cases." 
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Resources Section */}
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

