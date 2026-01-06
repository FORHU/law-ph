
import React from 'react';
import FAQSection from './faq-section';
import ResourcesSection from './resources-section';

interface LandingPageProps {
  onStartConsultation: () => void;
}

export function LandingPage({ onStartConsultation } : LandingPageProps ) {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative py-12 lg:py-24 overflow-hidden border-b border-border-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="flex flex-col gap-8 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 self-center lg:self-start px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span>Immediate Legal Assistance</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
                Navigate Philippine Law with <span className="text-primary">AI Precision</span>
              </h1>
              
              <p className="text-xl text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Your personal legal guide available 24/7. Get instant, cited answers based on the Revised Penal Code, Civil Code, and latest Philippine jurisprudence.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={onStartConsultation}
                    className="flex items-center justify-center rounded-xl h-14 px-10 bg-primary hover:bg-primary/90 text-white text-lg font-bold shadow-2xl shadow-primary/25 transition-transform active:scale-95"
                  >
                    Start Quick Consultation
                  </button>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center">No Sign-In Required</span>
                </div>
                <button className="flex items-center justify-center rounded-xl h-14 px-10 bg-slate-800 hover:bg-slate-700 text-white text-lg font-bold transition-colors">
                  Learn How It Works
                </button>
              </div>

              <p className="text-xs text-slate-500 italic max-w-lg mx-auto lg:mx-0">
                Disclaimer: LexPH provides legal information for educational purposes, not professional legal advice. It is not a replacement for a certified lawyer.
              </p>
            </div>

            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-border-dark group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent mix-blend-overlay z-10"></div>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdmbN_buINknXgQYEC1dZJ9HxFN78UgC-NpzeD3PHdABmNAsW4OBOs0l4YmYwFl8tcprirVddg6mnYqpzpj6qss8xiFxzBTxy2u3VuH5Aft7HqHkmf0Rm34hSZr1VD6ICWz6uUmtmiupWmn6ppY8qCQflAAgFHNu3Nwx1CmA10ZeYq6YzUPH_iQ4ne9bkM6LeXEWP74z_ZoCdtQBY56vWSQeCDCUg8_nLgVnhFlVyXfdS4OZBBYxvuEHfwWviaXFaistaEmrsvRTg"
                alt="Scales of Justice"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-6 left-6 right-6 p-6 bg-card-dark/95 backdrop-blur-md rounded-2xl border border-border-dark shadow-2xl z-20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white">
                    <span className="material-symbols-outlined text-lg">smart_toy</span>
                  </div>
                  <div className="space-y-3 w-full">
                    <div className="h-2 w-1/4 bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-2 w-3/4 bg-slate-700 rounded animate-pulse delay-75"></div>
                    <div className="h-2 w-1/2 bg-slate-700 rounded animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-24 bg-slate-900/40">
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

