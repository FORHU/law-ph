import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AuthBackground } from '../auth-background';

interface HeroSectionProps {
  onStartConsultation: () => void;
}

export function HeroSection({ onStartConsultation }: HeroSectionProps) {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image with Overlay - Fixed Position */}
      <AuthBackground />
      
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
      </div>
    </section>
  );
}
