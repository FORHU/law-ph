'use client';

import React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { usePathname } from 'next/navigation';

export function PersistentSidebar() {
  const { 
    isSidebarOpen, 
    setIsSidebarOpen, 
    recentConsultations, 
    handleNewConsultation 
  } = useConversations();
  
  const pathname = usePathname();
  
  // Hide sidebar on landing page or auth pages
  const isNoSidebarRoute = 
    pathname === '/' || 
    pathname?.startsWith('/auth') || 
    pathname?.startsWith('/onboarding');

  if (isNoSidebarRoute) return null;

  return (
    <AppSidebar
      isOpen={isSidebarOpen}
      onClose={() => setIsSidebarOpen(false)}
      recentItems={recentConsultations as any}
      onNewItem={handleNewConsultation}
      recentLabel="RECENT"
    />
  );
}
