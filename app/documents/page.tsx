'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, X, Briefcase, Scale, ChevronDown, Loader2,
  MessageSquare, ExternalLink, Clock, FolderOpen, Trash2
} from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';

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
  const { loggedIn, user } = useAuth();
  const userId = user?.id;
  const { cases, sendDocumentToChat, analyzeDocuments } = useConversations();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [recentDocuments, setRecentDocuments] = useState<StoredDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [caseDropdownOpen, setCaseDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      if (loggedIn && userId) {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const json = await res.json();
          setRecentDocuments(json.documents.map((d: any) => ({
            id: d.id,
            name: d.name,
            timestamp: new Date(d.createdAt).getTime(),
            caseId: d.caseId ?? undefined,
            caseName: cases.find((c: any) => c.id === d.caseId)?.case_name,
            aiSummary: d.aiSummary ?? undefined,
            file_url: d.fileUrl ?? undefined,
            s3_key: d.s3Key ?? undefined,
          })));
        }
      } else {
        const saved = localStorage.getItem('lawph_documents');
        if (saved) {
          try { setRecentDocuments(JSON.parse(saved)); } catch { }
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

  const handleSendToChat = async (doc: StoredDocument) => {
    if (!doc.aiSummary) return;
    const resultId = await sendDocumentToChat(doc.name, doc.aiSummary, doc.caseId);
    router.push(resultId ? `/consultation/${resultId}` : '/consultation');
  };

  const handleLinkToChat = async () => {
    if (selectedFiles.length === 0 || !selectedCaseId) return;
    router.push(`/consultation/${selectedCaseId}`);
    analyzeDocuments(selectedFiles, selectedCaseId);
    setSelectedFiles([]);
    setSelectedCaseId('');
  };

  const handleRemoveDocument = async (doc: StoredDocument) => {
    const updated = recentDocuments.filter(d => d.id !== doc.id);
    setRecentDocuments(updated);
    if (!loggedIn || !userId) {
      localStorage.setItem('lawph_documents', JSON.stringify(updated));
    }
  };

  const formatTimeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'm4a'].includes(ext ?? '')) return '🎵';
    if (['png', 'jpg', 'jpeg'].includes(ext ?? '')) return '🖼️';
    if (ext === 'pdf') return '📄';
    return '📝';
  };

  return (
    <PageLayout
      activePage="documents"
      title="Document Analysis"
      subtitle="Upload and review legal documents"
      maxWidth="max-w-7xl"
      backgroundAngle={2}
    >
      <div className="relative z-10 flex-1 flex overflow-hidden h-full">
        <div className="flex-1 overflow-y-auto p-6 w-full">
          <div className="flex flex-col gap-6">

            {/* Upload Panel */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#0B0B0C]/80 backdrop-blur-xl border border-[#722f37]/30 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
                <h2 className="text-xl font-serif text-white tracking-tight">Upload Document</h2>

                {/* Drop zone */}
                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-4 min-h-[220px] ${
                    dragActive
                      ? 'border-[#e9c176] bg-[#722f37]/10'
                      : 'border-[#722f37]/20 hover:border-[#722f37]/40 bg-black/20'
                  }`}
                >
                  <input
                    ref={fileInputRef} type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.mp3,.wav,.m4a,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*,audio/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />

                  {selectedFiles.length > 0 ? (
                    <div className="flex flex-col items-center gap-3 w-full px-6 py-4">
                      <div className="flex flex-wrap gap-2 justify-center max-h-[140px] overflow-y-auto custom-scrollbar w-full">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-black/40 border border-[#722f37]/30 px-3 py-1.5 rounded-lg">
                            <FileText size={13} className="text-[#e9c176] shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 truncate max-w-[160px]">{file.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                              className="text-gray-500 hover:text-white ml-1 shrink-0"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-[#e9c176] uppercase tracking-widest">
                        {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} · {(selectedFiles.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Click to add more</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#722f37]/20 flex items-center justify-center border border-[#722f37]/30">
                        <Upload size={28} className="text-[#e9c176]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/70 mb-1">Drag & drop files here</p>
                        <p className="text-[10px] font-bold text-[#e9c176]/50 uppercase tracking-widest">
                          PDF · DOC(X) · TXT · Image · Audio · Max 20MB
                        </p>
                      </div>
                      <div className="px-4 py-1.5 border border-[#722f37]/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 hover:border-[#722f37]/60 transition-colors">
                        Browse files
                      </div>
                    </div>
                  )}
                </div>

                {/* Case selector */}
                <div>
                  <label className="block text-[10px] font-bold text-[#e9c176]/80 uppercase tracking-[0.2em] mb-2 ml-1">
                    Apply to Case <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div
                      onClick={() => setCaseDropdownOpen(!caseDropdownOpen)}
                      className="w-full flex items-center bg-black/40 border border-[#722f37]/20 rounded-xl pl-4 pr-4 py-3.5 text-sm text-gray-300 outline-none hover:border-[#e9c176]/40 cursor-pointer transition-all shadow-inner"
                    >
                      <Briefcase size={15} className="text-[#e9c176]/50 mr-3 shrink-0" />
                      <span className="flex-1 truncate font-medium text-[13px]">
                        {selectedCaseId ? cases.find((c: any) => c.id === selectedCaseId)?.case_name : 'Select a case...'}
                      </span>
                      <ChevronDown size={13} className={`text-gray-500 transition-transform duration-300 shrink-0 ${caseDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    <AnimatePresence>
                      {caseDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setCaseDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-[#0B0B0C] border border-[#722f37]/30 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                          >
                            <div className="px-4 py-2 text-[10px] font-bold text-[#e9c176]/40 uppercase tracking-[0.2em] border-b border-[#722f37]/10">
                              My Cases
                            </div>
                            {cases.length === 0 ? (
                              <div className="px-4 py-4 text-[11px] font-bold text-gray-600 uppercase tracking-widest text-center">No cases found</div>
                            ) : (
                              cases.map((c: any) => (
                                <div
                                  key={c.id}
                                  onClick={() => { setSelectedCaseId(c.id); setCaseDropdownOpen(false); }}
                                  className={`px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-3 ${
                                    selectedCaseId === c.id ? 'bg-[#722f37]/20 text-[#e9c176]' : 'text-gray-500 hover:bg-white/[0.03] hover:text-white'
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedCaseId === c.id ? 'bg-[#e9c176]' : 'bg-gray-700'}`} />
                                  <span className="truncate">{c.case_name}</span>
                                </div>
                              ))
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleLinkToChat}
                  disabled={selectedFiles.length === 0 || isUploading || !selectedCaseId}
                  className={`w-full px-6 py-4 rounded-xl font-bold uppercase tracking-[0.15em] text-[11px] flex items-center justify-center gap-3 transition-all shadow-xl ${
                    selectedFiles.length > 0 && !isUploading && selectedCaseId
                      ? 'bg-[#722f37] hover:bg-[#8b3a44] text-white shadow-[#722f37]/20'
                      : 'bg-[#722f37]/10 text-gray-600 cursor-not-allowed border border-[#722f37]/10'
                  }`}
                >
                  {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Scale size={15} />}
                  {isUploading
                    ? uploadStatus || 'Processing...'
                    : selectedFiles.length > 1
                      ? `Attach to Case (${selectedFiles.length} files)`
                      : 'Attach to Case'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}
