// components/app-sidebar.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, Briefcase, X, ChevronDown, ChevronUp, Binoculars, PanelLeftClose, Bookmark, Mic, Library } from 'lucide-react';
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
  activePage?: SidebarPage;
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
  const pathname = usePathname();
  const router = useRouter();

  // Determine active page from pathname if not explicitly provided
  const resolvedActivePage = activePage || (
    pathname?.startsWith('/consultation') ? 'chat' :
      pathname?.startsWith('/documents') ? 'documents' :
        pathname?.startsWith('/transcribe') ? 'transcribe' :
          pathname?.startsWith('/calendar') ? 'calendar' :
            pathname?.startsWith('/cases') ? 'cases' :
              pathname?.startsWith('/legal-library') ? 'library' :
                'chat'
  );

  const [activeMenuId, setActiveMenuId] = React.useState<string | number | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isViewCasesModalOpen, setIsViewCasesModalOpen] = useState(false);
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const isDocumentsOrCalendarOrTranscribe = resolvedActivePage === 'documents' || resolvedActivePage === 'calendar' || resolvedActivePage === 'transcribe' || resolvedActivePage === 'library';
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
      <div className="p-6 border-b border-primary/20 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="hover:opacity-80 transition-opacity flex items-center"
        >
          <span className="font-serif italic lowercase text-2xl" style={{ color: '#e9c176' }}>{BRAND.NAME_PART1}</span>
          <span className="font-serif text-white font-medium lowercase text-2xl">{BRAND.NAME_PART2}</span>
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
        <div className="p-4 space-y-2 border-b border-[rgba(255,255,255,0.05)] flex-shrink-0">
          {isDocumentsOrCalendarOrTranscribe ? (
            <>
              {/* Chat button (moves to top when in non-chat views) */}
              <button
                onClick={() => router.push('/consultation')}
                className="w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent"
              >
                <MessageSquare size={18} className="transition-colors" />
                <span className="text-sm font-medium">Chat</span>
              </button>

              <button
                onClick={() => router.push('/documents')}
                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 ${resolvedActivePage === 'documents' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
                  }`}
              >
                <FileText size={18} className={resolvedActivePage === 'documents' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-sm font-medium">Documents</span>
              </button>

              <button
                onClick={() => router.push('/transcribe')}
                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 ${resolvedActivePage === 'transcribe' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
                  }`}
              >
                <Mic size={18} className={resolvedActivePage === 'transcribe' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-sm font-medium">Transcribe</span>
              </button>

              <button
                onClick={() => router.push('/calendar')}
                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 ${resolvedActivePage === 'calendar' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
                  }`}
              >
                <CalendarIcon size={18} className={resolvedActivePage === 'calendar' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-sm font-medium">Calendar</span>
              </button>

              <button
                onClick={() => router.push('/legal-library')}
                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 ${resolvedActivePage === 'library' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
                  }`}
              >
                <Library size={18} className={resolvedActivePage === 'library' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-sm font-medium">Library</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onNewItem?.()}
                className="w-full px-4 py-3 bg-[rgba(114,47,55,0.15)] border border-[rgba(114,47,55,0.4)] rounded-xl hover:bg-[rgba(114,47,55,0.25)] hover:shadow-[0_0_15px_rgba(114,47,55,0.3)] transition-all duration-300 flex items-center gap-3 text-white group"
              >
                <MessageSquare size={18} className="text-[rgba(233,193,118,1)] transition-colors" />
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium">Consultation</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/documents')}
                className="w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent"
              >
                <FileText size={18} className="transition-colors" />
                <span className="text-sm font-medium">Documents</span>
              </button>

              <button
                onClick={() => router.push('/transcribe')}
                className="w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent"
              >
                <Mic size={18} className="transition-colors" />
                <span className="text-sm font-medium">Transcribe</span>
              </button>

              <button
                onClick={() => router.push('/calendar')}
                className="w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent"
              >
                <CalendarIcon size={18} className="transition-colors" />
                <span className="text-sm font-medium">Calendar</span>
              </button>

              <button
                onClick={() => setIsCaseModalOpen(true)}
                className="w-full px-4 py-3 bg-transparent border border-transparent rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-all duration-300 flex items-center gap-3 text-gray-400 hover:text-white group"
              >
                <Briefcase size={18} className="transition-colors" />
                <span className="text-sm font-medium">Create Case</span>
              </button>

              <button
                onClick={() => setIsViewCasesModalOpen(true)}
                className="w-full px-4 py-3 bg-transparent border border-transparent rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-all duration-300 flex items-center gap-3 text-gray-400 hover:text-white group"
              >
                <Binoculars size={18} className="transition-colors" />
                <span className="text-sm font-medium">View Cases</span>
              </button>

              <button
                onClick={() => setIsBookmarksModalOpen(true)}
                className="w-full px-4 py-3 bg-transparent border border-transparent rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-all duration-300 flex items-center gap-3 text-gray-400 hover:text-white group"
              >
                <Bookmark size={18} className="transition-colors" />
                <span className="text-sm font-medium">Bookmarks</span>
              </button>

              <button
                onClick={() => router.push('/legal-library')}
                className={`w-full px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 ${resolvedActivePage === 'library' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Library size={18} className={resolvedActivePage === 'library' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-sm font-medium">Library</span>
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
        {!isDocumentsOrCalendarOrTranscribe && (
          <div className="flex-shrink-0">
            <SidebarNav activePage={resolvedActivePage} />
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
              transition={{ type: 'spring', damping: 30, stiffness: 180 }}
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
            transition={{ type: 'spring', damping: 30, stiffness: 180 }}
            className="hidden md:flex relative z-10 flex-col border-r border-primary/30 bg-[#0B0B0C]/80 backdrop-blur-sm h-full min-h-screen overflow-hidden"
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
