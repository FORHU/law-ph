'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ASSETS } from '@/lib/constants';

export function PersistentBackground() {
  const pathname = usePathname();
  const [targetAngle, setTargetAngle] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset to angle 1 (Annotation #8) when entering landing page or root consultation
    if (pathname === '/' || pathname === '/consultation' || pathname === '') {
      setTargetAngle(1);
    }
  }, [pathname]);

  useEffect(() => {
    // Listen for custom events dispatched by PageLayout or others
    const handleAngleChange = (e: CustomEvent) => {
      setTargetAngle(e.detail);
    };
    window.addEventListener('backgroundAngleChange', handleAngleChange as EventListener);
    return () => window.removeEventListener('backgroundAngleChange', handleAngleChange as EventListener);
  }, []);

  const getImagePath = (angle: number) => {
    switch (angle) {
      case 1: return ASSETS.HALL_ANGLE_2; // Landing/Chat
      case 2: return ASSETS.HALL_ANGLE_4; // Now Documents
      case 3: return ASSETS.HALL_ANGLE_3; // Transcribe
      case 4: return ASSETS.HALL_ANGLE_1; // Now Calendar
      case 5: return ASSETS.HALL_ANGLE_2; // Fallback
      default: return ASSETS.HALL_ANGLE_2;
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#0a0a0c]">
      
      {/* Cinematic "3D Travel" Image Transitions */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={targetAngle}
          initial={{ 
            opacity: 0, 
            scale: 0.95,
            filter: 'blur(15px) brightness(0.4)'
          }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            filter: 'blur(0px) brightness(0.75)'
          }}
          exit={{ 
            opacity: 0, 
            scale: 1.1,
            filter: 'blur(20px) brightness(0.3)'
          }}
          transition={{ 
            duration: 1.8, 
            ease: [0.33, 1, 0.68, 1],
            opacity: { duration: 1.2 },
            filter: { duration: 1.4 }
          }}
          className="absolute inset-0 z-0"
        >
          <div 
            className="absolute inset-0 bg-no-repeat"
            style={{ 
              backgroundImage: `url(${getImagePath(targetAngle)})`,
              backgroundSize: '108%', // Scale up to crop out Sketchfab UI bars
              backgroundPosition: 'center 40%', // Shift up to hide bottom UI
              filter: 'grayscale(100%) brightness(0.55) contrast(0.95) blur(4px)',
              opacity: 1
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Global Cinematic Overlays */}
      <div className="absolute inset-0 bg-[#0a0a0c]/25 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0C]/80 via-transparent to-[#0B0B0C]/60" />
      
      {/* Ambient "Sovereign" Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[rgba(233,193,118,0.03)] blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-[rgba(114,47,55,0.05)] blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
    </div>
  );
}
