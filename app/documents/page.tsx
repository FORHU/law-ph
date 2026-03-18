'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, FileText, X, Briefcase, Scale, ChevronDown, Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { ASSETS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { uploadAndAnalyzeDocument } from '@/lib/s3-utils';
import { useAuth } from '@/components/auth/auth-provider';
import { createClient } from '@/lib/supabase/client';

interface StoredDocument {
  id: string;
  name: string;
  timestamp: number;
  caseId?: string;
  caseName?: string;
  content?: string;
  aiSummary?: string;
  file_url?: string;
  s3_key?: string;
}

export default function Documents() {
  const router = useRouter();
  const { loggedIn, session } = useAuth();
  const userId = session?.user?.id;
  const supabase = createClient();
  const { isSidebarOpen, setIsSidebarOpen, cases, sendDocumentToChat, recentConsultations, analyzeDocuments } = useConversations();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [recentDocuments, setRecentDocuments] = useState<StoredDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents from Supabase (authenticated) or localStorage (guest)
  useEffect(() => {
    const loadDocuments = async () => {
      if (loggedIn && userId) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setRecentDocuments(data.map(d => ({
            id: d.id,
            name: d.name,
            timestamp: new Date(d.created_at).getTime(),
            caseId: d.case_id ?? undefined,
            caseName: cases.find(c => c.id === d.case_id)?.case_name,
            aiSummary: d.ai_summary ?? undefined,
            file_url: d.file_url ?? undefined,
            s3_key: d.s3_key ?? undefined,
          })));
        }
      } else {
        // Guest fallback
        const saved = localStorage.getItem('lawph_documents');
        if (saved) {
          try { setRecentDocuments(JSON.parse(saved)); } catch {}
        }
      }
    };
    loadDocuments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, userId, cases]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleSendToChat = async (doc: StoredDocument, conversationId?: string | number) => {
    if (!doc.aiSummary) return;
    const resultId = await sendDocumentToChat(doc.name, doc.aiSummary, conversationId);
    if (resultId) {
      router.push(`/consultation/${resultId}`);
    } else {
      router.push('/consultation');
    }
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0 || !selectedCaseId) return;

    // Redirect immediately to the consultation
    router.push(`/consultation/${selectedCaseId}`);
    
    // Trigger background analysis via global context
    analyzeDocuments(selectedFiles, selectedCaseId);
    
    // Clear local selection
    setSelectedFiles([]);
    setSelectedCaseId('');
  };

  

  const formatTimeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <PageLayout
      activePage="documents"
      title="Document Analysis"
      subtitle="Upload and review legal documents"
      recentLabel="RECENT DOCUMENTS"
      recentItems={recentDocuments.map(doc => ({
        id: doc.id,
        title: doc.name,
        subtitle: `${doc.caseName ? `📁 ${doc.caseName} · ` : ''}${formatTimeAgo(doc.timestamp)}`,
        onClick: () => {
          if (doc.caseId) {
            router.push(`/consultation/${doc.caseId}`);
          } else {
            handleSendToChat(doc, doc.caseId);
          }
        },
        onRemove: () => {
          const updated = recentDocuments.filter(d => d.id !== doc.id);
          setRecentDocuments(updated);
          if (loggedIn && userId) {
            supabase.from('documents').delete().eq('id', doc.id);
          } else {
            localStorage.setItem('lawph_documents', JSON.stringify(updated));
          }
        },
      }))}
      maxWidth="max-w-7xl"
    >
      <div className="relative z-10 flex-1 flex overflow-hidden h-full">
        <div className="flex-1 overflow-y-auto p-6 transition-all duration-300 w-full">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Upload Document</h2>
              <div
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer ${
                  dragActive ? 'border-[#E0A7C2] bg-[#8B4564]/10' : 'border-[#8B4564]/30 hover:border-[#8B4564]/60 bg-[#3A2F2A]/20'
                }`}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" multiple
                  onChange={(e) => { 
                    if (e.target.files?.length) {
                      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]); 
                    }
                  }}
                />
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#8B4564]/20 flex items-center justify-center">
                    <Upload size={28} className="text-[#E0A7C2]" />
                  </div>
                  {selectedFiles.length > 0 ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="flex flex-wrap gap-2 justify-center max-h-[120px] overflow-y-auto">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-[#1A1A1A]/60 border border-[#8B4564]/40 px-3 py-1.5 rounded-lg">
                            <FileText size={14} className="text-[#E0A7C2]" />
                            <span className="text-sm font-medium truncate max-w-[150px]">{file.name}</span>
                            <button onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); 
                              }}
                              className="text-gray-500 hover:text-white ml-1">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#E0A7C2] mt-2">
                        {selectedFiles.length} file(s) selected ({(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB total)
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-base text-white">Drop documents here or click to browse</p>
                      <p className="text-sm text-gray-500">PDF, DOC, DOCX, TXT (Max 20MB per file). Select multiple to synthesize.</p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                  Attach to Case <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-300 outline-none focus:border-[#E0A7C2]/50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a case...</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.case_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={selectedFiles.length === 0 || isUploading || !selectedCaseId}
                className={`w-full mt-5 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedFiles.length > 0 && !isUploading && selectedCaseId
                    ? 'bg-[#8B4564] hover:bg-[#9D5373] text-white'
                    : 'bg-[#8B4564]/20 text-gray-600 cursor-not-allowed'
                }`}
              >
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Scale size={18} />} 
                {isUploading ? uploadStatus || 'Processing...' : selectedFiles.length > 1 ? `Analyze & Synthesize Batch (${selectedFiles.length})` : 'Analyze Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
);
}
