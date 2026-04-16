'use client'

import React from 'react';
import TranscribeWorkspace from '@/components/transcribe/transcribe-workspace';
import { AppSidebar } from '@/components/app-sidebar';
import { useConversations } from '@/components/conversation-provider/conversation-context';

export default function TranscribePage() {
  const { isSidebarOpen, setIsSidebarOpen } = useConversations();

  return (
    <div className="flex h-[100dvh] w-full bg-[#1A1A1A] overflow-hidden text-gray-200 antialiased selection:bg-[#8B4564]/30 selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#8B4564]/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#E0A7C2]/5 blur-[100px]" />
      </div>

      <AppSidebar 
        activePage="transcribe"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 h-full relative z-10 flex flex-col pt-16 md:pt-0 pb-[env(safe-area-inset-bottom)]">
        <TranscribeWorkspace 
          onOpenSidebar={() => setIsSidebarOpen(true)} 
          isSidebarOpen={isSidebarOpen} 
        />
      </main>
    </div>
  );
}
