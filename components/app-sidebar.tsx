// components/app-sidebar.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Briefcase, X } from 'lucide-react';
import { BRAND } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarItem } from './sidebar/sidebar-item';
import { SidebarNav } from './sidebar/sidebar-nav';
import { RecentItem, SidebarPage, SIDEBAR_STYLES } from './sidebar/sidebar-constants';
import { CreateCaseModal } from './create-case-modal';
import { ViewCasesModal } from './view-cases-modal';

interface AppSidebarProps {
  activePage: SidebarPage;
  recentItems?: RecentItem[];
  onNewItem?: () => void;
  newItemLabel?: string;
  recentLabel?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({
  activePage,
  recentItems = [],
  onNewItem,
  recentLabel = 'RECENT',
  isOpen = false,
  onClose,
}: AppSidebarProps) {
  const router = useRouter();
  const [activeMenuId, setActiveMenuId] = React.useState<string | number | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isViewCasesModalOpen, setIsViewCasesModalOpen] = useState(false);

  const toggleMenu = (id: string | number) => {
    setActiveMenuId(prev => prev === id ? null : id);
  };

  const sidebarContent = (
    <div className={SIDEBAR_STYLES.container}>
      {/* Logo */}
      <div className="p-6 border-b border-[#8B4564]/20 flex items-center justify-between">
        <button 
          onClick={() => router.push('/')}
          className="text-2xl font-semibold hover:opacity-80 transition-opacity"
        >
          <span className="text-white">{BRAND.NAME_PART1}</span>
          <span className="text-[#8B4564]">{BRAND.NAME_PART2}</span>
        </button>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Close Sidebar"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-2 border-b border-[#8B4564]/10">
        <button 
          onClick={() => onNewItem?.()}
          className="w-full px-3 py-2.5 bg-transparent border border-transparent rounded-xl hover:bg-white/5 transition-all flex items-center gap-2.5 text-white group"
        >
          <MessageSquare size={16} className="text-gray-400 group-hover:text-white transition-colors" />
          <span className="text-sm font-medium">New Consultation</span>
        </button>

        <button 
          onClick={() => setIsCaseModalOpen(true)}
          className="w-full px-3 py-2.5 bg-transparent border border-transparent rounded-xl hover:bg-white/5 transition-all flex items-center gap-2.5 text-white group"
        >
          <Briefcase size={16} className="text-gray-400 group-hover:text-white transition-colors" />
          <span className="text-sm font-medium">Create Case</span>
        </button>

        <button 
          onClick={() => setIsViewCasesModalOpen(true)}
          className="w-full px-3 py-2.5 bg-transparent border border-transparent rounded-xl hover:bg-white/5 transition-all flex items-center gap-2.5 text-white group"
        >
          <Briefcase size={16} className="text-gray-400 group-hover:text-white transition-colors" />
          <span className="text-sm font-medium">View Cases</span>
        </button>
      </div>

      {/* Content Area (Recent) */}
      <div className={SIDEBAR_STYLES.contentArea}>

        {/* Recent Section */}
        {recentItems.length > 0 && (
          <div className="mt-2 text-white">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 px-2">{recentLabel}</h3>
            <div className="space-y-2">
              {recentItems.map((item) => (
                <SidebarItem 
                  key={item.id} 
                  item={item} 
                  isOpen={activeMenuId === item.id}
                  onToggle={() => toggleMenu(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <SidebarNav activePage={activePage} />

      {/* Create Case Modal */}
      <CreateCaseModal 
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
      />

      {/* View Cases Modal */}
      <ViewCasesModal
        isOpen={isViewCasesModalOpen}
        onClose={() => setIsViewCasesModalOpen(false)}
      />
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-60 md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex relative z-10 w-60 flex-col border-r border-[#8B4564]/30 bg-[#2A1F1A]/80 backdrop-blur-sm h-full min-h-screen">
        {sidebarContent}
      </aside>
    </>
  );
}
