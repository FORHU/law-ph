'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

interface ScrollToTopProps {
  isVisible: boolean;
  onClick: () => void;
}

export function ScrollToTop({ isVisible, onClick }: ScrollToTopProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          onClick={onClick}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 p-2 bg-[#8B4564] text-white rounded-full shadow-lg hover:bg-[#7a3c58] transition-colors"
          title="Scroll to Top"
        >
          <ChevronUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
