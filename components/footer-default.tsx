
import { createClient } from '@/lib/supabase/client';
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS, BRAND } from '@/lib/constants';

interface FooterProps {
  isLoggedIn?: boolean
}

export function Footer({ isLoggedIn} : FooterProps){

  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    else console.log('User signed out successfully!');
  }

  return (
    <footer className="relative backdrop-blur-sm border-t py-8 z-10 mt-auto"
      style={{ 
        backgroundColor: `${COLORS.BG_DARK}B3`, 
        borderColor: `${COLORS.PRIMARY}33` 
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-center md:text-left">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-2xl font-semibold mb-4">
              <span className="text-white">{BRAND.NAME_PART1}</span>
              <span style={{ color: COLORS.PRIMARY }}>{BRAND.NAME_PART2}</span>
            </div>
            <p className="text-gray-400 text-sm max-w-xs mx-auto md:mx-0">
              Empowering Filipinos with legal information through artificial intelligence.
            </p>
          </motion.div>

          {/* Product */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="text-white font-bold mb-4">Product</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-white transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>How It Works</a></li>
            </ul>
          </motion.div>

          {/* Company */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-white transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>About</a></li>
              <li><a href="#" className="hover:text-white transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>Terms of Service</a></li>
            </ul>
          </motion.div>

          {/* Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h4 className="text-white font-bold mb-4">Support</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-white transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = COLORS.PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>Contact</a></li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Full-width bottom bar divider */}
      <div className="w-full border-t border-gray-800/50 pt-8 mt-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-xs tracking-wider">
            © 2024 {BRAND.NAME_PART1}{BRAND.NAME_PART2}. Built for the Filipino people. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
