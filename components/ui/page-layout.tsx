'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppSidebar } from '@/components/app-sidebar';
import { ASSETS } from '@/lib/constants';
import { ConsultationHeader } from '@/components/consultation/consultation-header';
import { useConversations } from '@/components/conversation-provider/conversation-context';

interface PageLayoutProps {
  children: React.ReactNode;
  activePage: 'chat' | 'documents' | 'calendar' | 'cases' | 'auth' | 'transcribe' | 'library';
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
  backgroundAngle?: number;
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
  onBack,
  backgroundAngle = 1
}: PageLayoutProps) {
  const { isSidebarOpen, setIsSidebarOpen } = useConversations();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backgroundAngleChange', { detail: backgroundAngle }));
    }
  }, [backgroundAngle]);

  return (
    <div className="flex-1 flex flex-col relative w-full overflow-hidden font-body-md bg-transparent text-on-background">
      <div className="flex-1 flex flex-col relative w-full overflow-hidden">
        <ConsultationHeader
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setIsSidebarOpen(true)}
          showMenuButton={!isSidebarOpen}
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
      </div>
    </div>
  );
}
