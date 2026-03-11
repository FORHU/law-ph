// components/app-sidebar.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Briefcase, X, ChevronDown, ChevronUp, Binoculars, PanelLeftClose, Bookmark } from 'lucide-react';
import { BRAND } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarItem } from './sidebar/sidebar-item';
import { SidebarNav } from './sidebar/sidebar-nav';
import { RecentItem, SidebarPage, SIDEBAR_STYLES, SCROLL_THRESHOLD } from './sidebar/sidebar-constants';
import { CreateCaseModal } from './create-case-modal';
import { ViewCasesModal } from './view-cases-modal';
import { BookmarksModal } from './bookmarks-modal';
import { SidebarProfile } from './sidebar/sidebar-profile';
import { ScrollToTop } from './sidebar/scroll-to-top';
import { FileText, Calendar as CalendarIcon } from 'lucide-react';
import { useConversations } from './conversation-provider/conversation-context';

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
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const isDocumentsOrCalendar = activePage === 'documents' || activePage === 'calendar';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { openSourceByItemId } = useConversations() || {};

  const toggleMenu = (id: string | number) => {
    setActiveMenuId(prev => prev === id ? null : id);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollToTop(scrollTop > SCROLL_THRESHOLD);
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sidebarContent = (
    <div className={SIDEBAR_STYLES.container}>
      {/* Logo */}
      <div className="p-6 border-b border-[#8B4564]/20 flex items-center justify-between flex-shrink-0">
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
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Unified Scrollable Container for List and Nav */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex flex-col flex-1 overflow-y-auto scroll-smooth custom-sidebar-scrollbar relative"
      >
        <ScrollToTop isVisible={showScrollToTop} onClick={scrollToTop} />

        {/* Action Buttons & Primary Nav (NOW IN SCROLLABLE AREA) */}
        <div className="p-4 space-y-2 border-b border-[#8B4564]/10 flex-shrink-0">
          {isDocumentsOrCalendar ? (
            <>
              {/* Chat button (moves to top when in Documents/Calendar) */}
              <button 
                onClick={() => router.push('/consultation')}
                className="w-full px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-gray-200 hover:text-white hover:bg-white/5"
              >
                <MessageSquare size={16} className="text-gray-300" />
                <span className="text-sm font-medium text-white">Chat</span>
              </button>

              <button 
                onClick={() => router.push('/documents')}
                className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                  activePage === 'documents' ? 'bg-[#8B4564]/20 text-white border border-[#8B4564]/30' : 'text-gray-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText size={16} className={activePage === 'documents' ? 'text-white' : 'text-gray-300'} />
                <span className="text-sm font-medium text-white">Documents</span>
              </button>

              <button 
                onClick={() => router.push('/calendar')}
                className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                  activePage === 'calendar' ? 'bg-[#8B4564]/20 text-white border border-[#8B4564]/30' : 'text-gray-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <CalendarIcon size={16} className={activePage === 'calendar' ? 'text-white' : 'text-gray-300'} />
                <span className="text-sm font-medium text-white">Calendar</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => onNewItem?.()}
                className="w-full px-3 py-2.5 bg-transparent border border-transparent rounded-xl hover:bg-white/5 transition-all flex items-center gap-2.5 text-white group"
              >
                <MessageSquare size={16} className="text-white transition-colors" />
                <span className="text-sm font-medium text-white">New Consultation</span>
              </button>

              <button 
                onClick={() => router.push('/documents')}
                className="w-full px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-gray-400 hover:text-white hover:bg-white/5"
              >
                <FileText size={16} className="text-gray-300" />
                <span className="text-sm font-medium text-white">Documents</span>
              </button>

              <button 
                onClick={() => router.push('/calendar')}
                className="w-full px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-gray-400 hover:text-white hover:bg-white/5"
              >
                <CalendarIcon size={16} className="text-gray-300" />
                <span className="text-sm font-medium text-white">Calendar</span>
              </button>

              <button 
                onClick={() => setIsCaseModalOpen(true)}
                className="w-full px-3 py-2.5 bg-transparent border border-transparent rounded-xl hover:bg-white/5 transition-all flex items-center gap-2.5 text-white group"
              >
                <Briefcase size={16} className="text-white transition-colors" />
                <span className="text-sm font-medium text-white">Create Case</span>
              </button>

              <button 
                onClick={() => setIsViewCasesModalOpen(true)}
                className="w-full px-3 py-2.5 bg-transparent border border-transparent rounded-xl hover:bg-white/5 transition-all flex items-center gap-2.5 text-white group"
              >
                <Binoculars size={16} className="text-white transition-colors" />
                <span className="text-sm font-medium text-white">View Cases</span>
              </button>

              <button 
                onClick={() => setIsBookmarksModalOpen(true)}
                className="w-full px-3 py-2.5 bg-transparent border border-transparent rounded-xl hover:bg-white/5 transition-all flex items-center gap-2.5 text-white group"
              >
                <Bookmark size={16} className="text-white transition-colors" />
                <span className="text-sm font-medium text-white">Bookmarks</span>
              </button>
            </>
          )}
        </div>
        
        {/* Content Area (Recent) */}
        <div className={`${SIDEBAR_STYLES.contentArea} flex-shrink-0`}>
          {/* Recent Section */}
          {recentItems.length > 0 && (
            <div className="mt-2 text-white">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 px-2">{recentLabel}</h3>
              <div className="space-y-2">
                {(showAllRecent ? recentItems : recentItems.slice(0, 5)).map((item) => (
                  <SidebarItem 
                    key={item.id} 
                    item={item} 
                    isOpen={activeMenuId === item.id}
                    onToggle={() => toggleMenu(item.id)}
                  />
                ))}
              </div>
              {recentItems.length > 5 && (
                <button 
                  onClick={() => setShowAllRecent(!showAllRecent)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all active:scale-[0.98]"
                >
                  {showAllRecent ? (
                    <>Show Less <ChevronUp size={14} /></>
                  ) : (
                    <>Show {recentItems.length - 5} More <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation (Conditional Chat tab) */}
        {!isDocumentsOrCalendar && (
          <div className="flex-shrink-0">
            <SidebarNav activePage={activePage} />
          </div>
        )}
      </div>

      {/* Sticky Profile Section */}
      <SidebarProfile />

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

      {/* Bookmarks Modal */}
      <BookmarksModal
        isOpen={isBookmarksModalOpen}
        onClose={() => setIsBookmarksModalOpen(false)}
        onOpenSource={openSourceByItemId}
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
      <AnimatePresence>
        {isOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="hidden md:flex relative z-10 flex-col border-r border-[#8B4564]/30 bg-[#2A1F1A]/80 backdrop-blur-sm h-full min-h-screen overflow-hidden"
          >
            <div className="w-60 h-full flex flex-col">
              {sidebarContent}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
