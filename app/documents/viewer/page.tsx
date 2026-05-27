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
    <div className="min-h-screen bg-[#0B0B0C] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#722f37]/20 bg-[#0B0B0C]/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white border border-transparent hover:border-white/10"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
              <FileText size={16} className="text-[#e9c176]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Case Document</span>
              <span className="text-sm font-bold text-white truncate max-w-[300px] md:max-w-[600px] tracking-tight">
                {decodeURIComponent(fileName)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.open(fileUrl, '_blank')}
          className="flex items-center gap-2 text-[10px] font-bold text-[#e9c176] hover:text-white border border-[#722f37]/30 hover:border-[#e9c176]/50 bg-[#722f37]/10 px-4 py-2 rounded-xl transition-all uppercase tracking-widest"
        >
          <ExternalLink size={14} /> Open Original Source
        </button>
      </div>

      {/* PDF Frame */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500 bg-[#0B0B0C]">
            <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
              <Loader2 size={32} className="animate-spin text-[#e9c176]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Initializing Secure Stream...</p>
          </div>
        )}
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 73px)' }}
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
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#e9c176]" />
      </div>
    }>
      <ViewerContent />
    </Suspense>
  );
}
