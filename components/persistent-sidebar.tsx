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
    cases,
    handleNewConsultation,
    handleRemoveConsultation,
    handleRenameConsultation,
    currentConsultationId,
    openSourceByItemId,
    addBookmark,
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
  const recentItems = useMemo(() => [
    ...recentConsultations.map(item => ({
      ...item,
      type: 'consultation' as const,
      onClick: () => router.push(`/consultation/${item.id}`),
      onRemove: () => handleRemoveConsultation(item.id),
      onRename: (newTitle: string) => handleRenameConsultation(item.id, newTitle),
    })),
    ...(cases ?? []).map(c => ({
      id: c.id,
      title: c.case_name,
      subtitle: c.party_involved ?? undefined,
      type: 'case' as const,
      onClick: () => router.push(`/cases/${c.id}`),
      onBookmark: () => addBookmark({
        itemId: c.id,
        title: c.case_name,
        reference: c.party_involved ?? null,
        type: 'case',
        url: `/cases/${c.id}`,
        aiSummary: c.notes ?? null,
        doctrine: null,
        facts: null,
      }),
    })),
  ], [recentConsultations, cases, router, handleRemoveConsultation, handleRenameConsultation]);

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
