'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react';

function ViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileUrl = searchParams?.get('url');
  const fileName = searchParams?.get('name') || 'Document';
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!fileUrl) router.replace('/documents');
  }, [fileUrl, router]);

  if (!fileUrl) return null;

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#111111] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#E0A7C2]" />
            <span className="text-sm font-semibold text-white truncate max-w-[300px] md:max-w-[600px]">
              {decodeURIComponent(fileName)}
            </span>
          </div>
        </div>
        <button
          onClick={() => window.open(fileUrl, '_blank')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 px-3 py-1.5 rounded-lg transition-all"
        >
          <ExternalLink size={13} /> Open in browser
        </button>
      </div>

      {/* PDF Frame */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500 bg-[#0D0D0D]">
            <Loader2 size={32} className="animate-spin text-[#E0A7C2]" />
            <p className="text-sm">Loading document...</p>
          </div>
        )}
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 57px)' }}
          title={decodeURIComponent(fileName)}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

export default function DocumentViewerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#E0A7C2]" />
      </div>
    }>
      <ViewerContent />
    </Suspense>
  );
}
