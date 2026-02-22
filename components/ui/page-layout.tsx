'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from '@/components/app-sidebar';
import { ASSETS } from '@/lib/constants';
import { ConsultationHeader } from '@/components/consultation/consultation-header';
import { useConversations } from '@/components/conversation-provider/conversation-context';

interface PageLayoutProps {
  children: React.ReactNode;
  activePage: 'chat' | 'documents' | 'calendar' | 'cases' | 'auth';
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  recentItems?: any[];
  recentLabel?: string;
  onNewItem?: () => void;
  newItemLabel?: string;
  isEditable?: boolean;
  onTitleChange?: (title: string) => void;
  maxWidth?: string;
  showSidebar?: boolean;
}

export function PageLayout({
  children,
  activePage,
  title,
  subtitle,
  headerActions,
  recentItems,
  recentLabel,
  onNewItem,
  newItemLabel,
  isEditable = false,
  onTitleChange,
  maxWidth = "max-w-4xl",
  showSidebar = true
}: PageLayoutProps) {
  const { isSidebarOpen, setIsSidebarOpen } = useConversations();

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white overflow-hidden relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <motion.img 
          src={ASSETS.LADY_JUSTICE_IMAGE}
          alt="Lady Justice"
          className="w-full h-full object-cover opacity-30 grayscale"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/80 via-[#1A1A1A]/70 to-[#1A1A1A]/95"></div>
      </div>

      {showSidebar && (
        <AppSidebar 
          activePage={activePage}
          onNewItem={onNewItem}
          newItemLabel={newItemLabel}
          recentItems={recentItems}
          recentLabel={recentLabel}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        <ConsultationHeader 
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setIsSidebarOpen(true)}
          showMenuButton={!isSidebarOpen && showSidebar}
          isEditable={isEditable}
          onTitleChange={onTitleChange}
          showSubtitle={!!subtitle}
          actions={headerActions}
        />

        <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
          <div className={`${maxWidth} mx-auto h-full w-full flex flex-col`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
