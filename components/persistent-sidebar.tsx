'use client';

import React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { usePathname, useRouter } from 'next/navigation';

export function PersistentSidebar() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    recentConsultations,
    handleNewConsultation,
    handleRemoveConsultation,
    handleRenameConsultation
  } = useConversations();
  
  const pathname = usePathname();
  const router = useRouter();
  
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
      recentItems={recentConsultations.map(item => ({
        ...item,
        onClick: () => router.push(`/consultation/${item.id}`),
        onRemove: () => handleRemoveConsultation(item.id),
        onRename: (newTitle: string) => handleRenameConsultation(item.id, newTitle)
      }))}
      onNewItem={handleNewConsultation}
      recentLabel="RECENT"
    />
  );
}
