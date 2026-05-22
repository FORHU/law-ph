'use client';

import React, { useMemo, useCallback } from 'react';
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
    handleRenameConsultation,
    currentConsultationId,
    openSourceByItemId,
  } = useConversations();

  const pathname = usePathname();
  const router = useRouter();

  const isNoSidebarRoute =
    pathname === '/' ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/onboarding');

  const handleClose = useCallback(() => setIsSidebarOpen(false), [setIsSidebarOpen]);

  // Stable reference — only recomputes when the conversations list actually changes,
  // not on every streaming messages update. This prevents AppSidebar (and all its
  // children) from re-rendering on every streaming tick.
  const recentItems = useMemo(() => recentConsultations.map(item => ({
    ...item,
    onClick: () => router.push(`/consultation/${item.id}`),
    onRemove: () => handleRemoveConsultation(item.id),
    onRename: (newTitle: string) => handleRenameConsultation(item.id, newTitle)
  })), [recentConsultations, router, handleRemoveConsultation, handleRenameConsultation]);

  if (isNoSidebarRoute) return null;

  return (
    <AppSidebar
      isOpen={isSidebarOpen}
      onClose={handleClose}
      recentItems={recentItems}
      onNewItem={handleNewConsultation}
      recentLabel="RECENT"
      currentConsultationId={currentConsultationId}
      openSourceByItemId={openSourceByItemId}
    />
  );
}
