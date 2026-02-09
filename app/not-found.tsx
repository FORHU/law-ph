'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ASSETS, BRAND, COLORS } from '@/lib/constants';
import { Home, Scale, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1A1A1A] relative overflow-hidden text-white font-sans">
      {/* Background with Lady Justice */}
      <div className="absolute inset-0 z-0">
        <motion.img 
          src={ASSETS.LADY_JUSTICE_IMAGE}
          alt="Lady Justice"
          className="w-full h-full object-cover opacity-20 grayscale"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/90 via-[#1A1A1A]/80 to-[#1A1A1A]/95"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-2xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Heading */}
          <h1 
            className="text-6xl md:text-8xl font-bold mb-4 tracking-tighter"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            404
          </h1>
          
          <div className={`h-1 w-24 bg-[${COLORS.PRIMARY}] mx-auto mb-8 rounded-full`}></div>

          <h2 className="text-2xl md:text-3xl font-medium mb-6 text-white/90">
            Page Not Found
          </h2>
          
          <p className="text-lg text-white/60 mb-12 max-w-md mx-auto leading-relaxed">
            The page you're looking for isn't here. 
            The page may have been moved, deleted, or never existed in the first place.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-8 py-4 bg-[${COLORS.PRIMARY}] hover:bg-[${COLORS.PRIMARY_LIGHT}] text-white rounded-xl transition-all shadow-lg shadow-[${COLORS.PRIMARY}]/20 font-medium`}
              >
                <Home size={20} />
                Return to the Homepage
              </motion.button>
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-xl transition-all font-medium"
            >
              <AlertCircle size={20} />
              Back
            </button>
          </div>
        </motion.div>

        {/* Branding Footer */}
        <motion.div 
          className="mt-20 opacity-40 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1 }}
        >
          <span className="text-sm tracking-widest uppercase">
            {BRAND.NAME_PART1}
            <span className={`text-[${COLORS.PRIMARY}] font-bold`}>{BRAND.NAME_PART2}</span>
          </span>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#8B4564]/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#8B4564]/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
}
