'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Key on the top-level segment only (e.g. "consultation", "sources") so that
  // intra-section URL updates (e.g. /consultation → /consultation/abc123 when a
  // new conversation is created) do NOT trigger the fade-out/fade-in animation.
  // Cross-section navigation still animates as expected.
  const sectionKey = '/' + (pathname.split('/')[1] || '');

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={sectionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="contents"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
