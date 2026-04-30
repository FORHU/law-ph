'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from '@/components/app-sidebar';
import { ASSETS } from '@/lib/constants';
import { ConsultationHeader } from '@/components/consultation/consultation-header';
import { useConversations } from '@/components/conversation-provider/conversation-context';

interface PageLayoutProps {
  children: React.ReactNode;
  activePage: 'chat' | 'documents' | 'calendar' | 'cases' | 'auth' | 'transcribe';
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
  onBack?: () => void;
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
  showSidebar = true,
  onBack
}: PageLayoutProps) {
  const { isSidebarOpen, setIsSidebarOpen } = useConversations();

  return (
    <div className="flex h-screen bg-[#131314] text-on-background overflow-hidden relative font-body-md">
      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 1.05, filter: 'grayscale(80%) blur(10px)' }}
          animate={{ opacity: 0.15, scale: 1, filter: 'grayscale(80%) blur(0px)' }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat brightness-[0.4] contrast-125"
          style={{ backgroundImage: `url(${ASSETS.HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131314]/95 via-[#131314]/70 to-[#131314]" />
        
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[rgba(233,193,118,0.03)] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[rgba(114,47,55,0.04)] blur-[120px] rounded-full pointer-events-none" />
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
          onBack={onBack}
        />

        <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={`${maxWidth} mx-auto h-full w-full flex flex-col`}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
