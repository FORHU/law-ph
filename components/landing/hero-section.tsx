import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AuthBackground } from '../auth-background';
import { BRAND, COLORS } from '@/lib/constants';

interface HeroSectionProps {
  onStartConsultation: () => void;
}

export function HeroSection({ onStartConsultation }: HeroSectionProps) {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);

  return (
    <section className="relative min-h-[80vh] md:min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-12">
      {/* Background Image with Overlay - Fixed Position */}
      <AuthBackground />
      
      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div 
          className="mb-4 text-xs sm:text-sm uppercase tracking-wider text-white inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm"
          style={{ 
            backgroundColor: `${COLORS.PRIMARY}1A`, 
            borderColor: `${COLORS.PRIMARY}4D` 
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Immediate Legal Assistance
        </motion.div>
        
        {/* Main Heading */}
        <motion.h1 
          className="text-3xl sm:text-5xl md:text-7xl mb-6 leading-tight px-4 sm:px-0"
          style={{ fontFamily: 'Playfair Display, serif' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Navigate Philippine Law
          <br />
          <motion.span 
            style={{ color: COLORS.PRIMARY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            with AI Precision
          </motion.span>
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto px-2"
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
            className="group relative px-8 py-4 rounded-md overflow-hidden flex items-center justify-center gap-2 text-[#1a1a1a] font-medium"
            style={{ backgroundColor: COLORS.PRIMARY }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div 
              className="absolute inset-0"
              style={{ 
                background: `linear-gradient(to right, ${COLORS.PRIMARY_LIGHT}, ${COLORS.PRIMARY})` 
              }}
              initial={{ x: '-100%' }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3 }}
            />
            <span className="relative">START QUICK CONSULTATION</span>
          </motion.button>
          <motion.button 
            className="group px-8 py-4 border-2 rounded-md flex items-center justify-center gap-2 text-white relative overflow-hidden"
            style={{ borderColor: COLORS.PRIMARY }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const aboutSection = document.getElementById('about');
              aboutSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <motion.div 
              className="absolute inset-0"
              style={{ backgroundColor: COLORS.PRIMARY }}
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
          <em>Disclaimer: {BRAND.NAME_PART1}{BRAND.NAME_PART2} provides legal information for educational purposes, not professional legal advice. It is not a replacement for a certified lawyer.</em>
        </motion.div>
      </div>
    </section>
  );
}
