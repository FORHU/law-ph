// components/app-sidebar.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, Briefcase, X, PanelLeftClose, Bookmark, Mic, Library, Search } from 'lucide-react';
import { BRAND } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarItem } from './sidebar/sidebar-item';
import { SidebarNav } from './sidebar/sidebar-nav';
import { RecentItem, SidebarPage, SIDEBAR_STYLES } from './sidebar/sidebar-constants';
import { BookmarksModal } from './bookmarks-modal';
import { SidebarProfile } from './sidebar/sidebar-profile';
import { FileText, Calendar as CalendarIcon } from 'lucide-react';
import { useConversations } from '@/components/conversation-provider/conversation-context';
interface AppSidebarProps {
  activePage?: SidebarPage;
  recentItems?: RecentItem[];
  onNewItem?: () => void;
  newItemLabel?: string;
  recentLabel?: string;
  isOpen?: boolean;
  onClose?: () => void;
  currentConsultationId?: string | number | null;
  openSourceByItemId?: (itemId: string, title?: string, context?: string) => void;
}

export const AppSidebar = React.memo(function AppSidebar({
  activePage,
  recentItems = [],
  onNewItem,
  recentLabel = 'RECENT',
  isOpen = false,
  onClose,
  currentConsultationId,
  openSourceByItemId,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active page from pathname if not explicitly provided
  const resolvedActivePage: SidebarPage = activePage || (
    pathname?.startsWith('/consultation') ? 'chat' :
      pathname?.startsWith('/documents') ? 'documents' :
        pathname?.startsWith('/transcribe') ? 'transcribe' :
          pathname?.startsWith('/calendar') ? 'calendar' :
            pathname?.startsWith('/cases') ? 'cases' :
              pathname?.startsWith('/legal-library') ? 'library' :
                pathname?.startsWith('/bookmarks') ? 'bookmarks' :
                  pathname?.startsWith('/search') ? 'search' :
                  'chat'
  );

  const [activeMenuId, setActiveMenuId] = React.useState<string | number | null>(null);
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [recentTab, setRecentTab] = useState<'consultation' | 'case'>(
    resolvedActivePage === 'cases' ? 'case' : 'consultation'
  );


  React.useEffect(() => {
    if (resolvedActivePage === 'cases' || resolvedActivePage === 'documents') setRecentTab('case');
    else setRecentTab('consultation');
  }, [resolvedActivePage]);
  const isDocumentsOrCalendarOrTranscribe = (['documents', 'calendar', 'transcribe', 'library', 'cases'] as const).includes(resolvedActivePage as any);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (id: string | number) => {
    setActiveMenuId(prev => prev === id ? null : id);
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
        className="flex flex-col flex-1 overflow-y-auto scroll-smooth custom-sidebar-scrollbar relative"
      >
        {/* Action Buttons & Primary Nav (NOW IN SCROLLABLE AREA) */}
        <div className="p-3 space-y-0.5 border-b border-[rgba(255,255,255,0.05)] flex-shrink-0">
          {isDocumentsOrCalendarOrTranscribe ? (
            <>
              <button
                onClick={() => {
                  onNewItem?.();
                  router.push('/consultation');
                }}
                className="w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent"
              >
                <MessageSquare size={16} className="transition-colors" />
                <span className="text-xs font-medium">Chat</span>
              </button>

              <button
                onClick={() => router.push('/search')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${(resolvedActivePage as string) === 'search' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Search size={16} className={(resolvedActivePage as string) === 'search' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Search</span>
              </button>

              <button
                onClick={() => router.push('/cases')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'cases' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Briefcase size={16} className={resolvedActivePage === 'cases' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Cases</span>
              </button>

              <button
                onClick={() => router.push('/documents')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'documents' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <FileText size={16} className={resolvedActivePage === 'documents' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Documents</span>
              </button>

              <button
                onClick={() => router.push('/transcribe')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'transcribe' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Mic size={16} className={resolvedActivePage === 'transcribe' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Transcribe</span>
              </button>

              <button
                onClick={() => router.push('/calendar')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'calendar' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <CalendarIcon size={16} className={resolvedActivePage === 'calendar' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Calendar</span>
              </button>

              <button
                onClick={() => router.push('/legal-library')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'library' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Library size={16} className={resolvedActivePage === 'library' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Library</span>
              </button>

              <button
                onClick={() => router.push('/bookmarks')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'bookmarks' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Bookmark size={16} className={resolvedActivePage === 'bookmarks' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Bookmarks</span>
              </button>
            </>
          ) : (
            <>
              {/* Main nav */}
              <button
                onClick={() => {
                  onNewItem?.();
                  if (pathname !== '/consultation') {
                    router.push('/consultation');
                  }
                }}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'chat' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <MessageSquare size={16} className={resolvedActivePage === 'chat' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Chat</span>
              </button>

              <button
                onClick={() => router.push('/search')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'search' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Search size={16} className={resolvedActivePage === 'search' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Search</span>
              </button>

              <button
                onClick={() => router.push('/cases')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'cases' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Briefcase size={16} className={resolvedActivePage === 'cases' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Cases</span>
              </button>

              <button
                onClick={() => router.push('/documents')}
                className="w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent"
              >
                <FileText size={16} className="transition-colors" />
                <span className="text-xs font-medium">Documents</span>
              </button>

              <button
                onClick={() => router.push('/transcribe')}
                className="w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent"
              >
                <Mic size={16} className="transition-colors" />
                <span className="text-xs font-medium">Transcribe</span>
              </button>

              <button
                onClick={() => router.push('/calendar')}
                className="w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent"
              >
                <CalendarIcon size={16} className="transition-colors" />
                <span className="text-xs font-medium">Calendar</span>
              </button>

              <button
                onClick={() => router.push('/legal-library')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'library' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Library size={16} className={resolvedActivePage === 'library' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Library</span>
              </button>

              <button
                onClick={() => router.push('/bookmarks')}
                className={`w-full px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2.5 ${resolvedActivePage === 'bookmarks' ? 'bg-[rgba(114,47,55,0.15)] text-white border border-[rgba(114,47,55,0.4)] shadow-[0_0_15px_rgba(114,47,55,0.2)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'}`}
              >
                <Bookmark size={16} className={resolvedActivePage === 'bookmarks' ? 'text-[rgba(233,193,118,1)]' : 'transition-colors'} />
                <span className="text-xs font-medium">Bookmarks</span>
              </button>

            </>
          )}
        </div>

        {/* Content Area (Recent) */}
        <div className={`${SIDEBAR_STYLES.contentArea} flex-shrink-0`}>
          <div className="mt-1 text-white">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-2 px-2">{recentLabel}</h3>

            {/* Tabs */}
            <div className="flex gap-1 mb-2 px-1">
              {(['consultation', 'case'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRecentTab(tab)}
                  className={`flex-1 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${
                    recentTab === tab
                      ? 'bg-[rgba(114,47,55,0.25)] border border-[rgba(114,47,55,0.4)] text-white'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {tab === 'consultation' ? 'Consultations' : 'Cases'}
                </button>
              ))}
            </div>

            {/* Filtered list */}
            {(() => {
              const filtered = recentItems.filter(i => (i.type ?? 'consultation') === recentTab);
              if (filtered.length === 0) return (
                <p className="text-[10px] text-gray-600 px-2 py-2">No recent {recentTab === 'consultation' ? 'consultations' : 'cases'}.</p>
              );
              return (
                <div className="space-y-0.5">
                  {filtered.map((item) => (
                    <SidebarItem
                      key={item.id}
                      item={item}
                      isOpen={activeMenuId === item.id}
                      onToggle={() => toggleMenu(item.id)}
                      currentConsultationId={currentConsultationId}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
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
});
