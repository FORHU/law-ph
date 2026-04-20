'use client'

import React from 'react';
import TranscribeWorkspace from '@/components/transcribe/transcribe-workspace';
import { PageLayout } from '@/components/ui/page-layout';

export default function TranscribePage() {
  return (
    <PageLayout
      activePage="transcribe"
      title="Transcription Workspace"
      subtitle="Record or upload audio to generate AI transcripts."
      maxWidth="max-w-6xl"
    >
      <div className="flex-1 min-w-0 h-full relative z-10 flex flex-col pb-[env(safe-area-inset-bottom)] px-2 md:px-0 pt-2">
        <TranscribeWorkspace />
      </div>
    </PageLayout>
  );
}
