'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, X, Briefcase, Scale, ExternalLink,
  Menu, ArrowLeft, ChevronDown, Loader2, CheckCircle, Bot, Search, FileMinus, Download, Printer, Share2, PanelRightClose, AlertCircle
} from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import { ASSETS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const { isSidebarOpen, setIsSidebarOpen, cases } = useConversations();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [recentDocuments, setRecentDocuments] = useState<StoredDocument[]>([]);
  const [rightPanelDoc, setRightPanelDoc] = useState<StoredDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
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
  }, [loggedIn, userId]);

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

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) return;
    
    // Check file sizes
    const overLimit = selectedFiles.find(f => f.size > 20 * 1024 * 1024);
    if (overLimit) {
      alert(`File ${overLimit.name} is too large. Maximum size is 20MB.`);
      return;
    }
    
    setIsSidebarOpen(false); // Close left sidebar
    setIsUploading(true);
    setUploadStatus(`Processing ${selectedFiles.length} document(s)...`);

    try {
      const newDocs: StoredDocument[] = [];
      const summaries: string[] = [];

      // Process all files in parallel
      await Promise.all(selectedFiles.map(async (file) => {
        const data = await uploadAndAnalyzeDocument(
          file, 
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
        );

        const attachedCase = cases.find(c => c.id === selectedCaseId);
        const newDoc: StoredDocument = {
          id: crypto.randomUUID(),
          name: data.filename,
          timestamp: Date.now(),
          caseId: selectedCaseId || undefined,
          caseName: attachedCase?.case_name,
          aiSummary: data.ai_summary,
          file_url: data.file_url,
          s3_key: data.s3_key,
        };
        
        newDocs.push(newDoc);
        if (data.ai_summary) summaries.push(data.ai_summary);
      }));

      // Update recent documents list
      const updated = [...newDocs, ...recentDocuments];
      setRecentDocuments(updated);

      // Persist to Supabase (authenticated) or localStorage (guest)
      if (loggedIn && userId) {
        await supabase.from('documents').insert(
          newDocs.map(doc => ({
            id: doc.id,
            user_id: userId,
            name: doc.name,
            case_id: doc.caseId || null,
            file_url: doc.file_url || null,
            s3_key: doc.s3_key || null,
            ai_summary: doc.aiSummary || null,
          }))
        );
      } else {
        localStorage.setItem('lawph_documents', JSON.stringify(updated));
      }

      // Level 2: Cross-Document Synthesis if multiple files
      if (summaries.length > 1) {
        setUploadStatus('Synthesizing cross-document analysis...');
        const synthesisResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/legal/synthesize-documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summaries }),
        });
        
        const synthesisData = await synthesisResponse.json();
        if (synthesisResponse.ok && synthesisData.success) {
          // Create a synthetic document to hold the combined analysis
          const batchDoc: StoredDocument = {
            id: crypto.randomUUID(),
            name: `Batch Synthesis (${summaries.length} files)`,
            timestamp: Date.now(),
            caseId: selectedCaseId || undefined,
            caseName: cases.find(c => c.id === selectedCaseId)?.case_name,
            aiSummary: synthesisData.synthesis
          };
          setRightPanelDoc(batchDoc);
          setAnalysisComplete(true);
          setAnalysisText(synthesisData.synthesis);
        } else {
           // Fallback to showing the first document if synthesis fails
           setRightPanelDoc(newDocs[0]);
           setAnalysisComplete(!!newDocs[0].aiSummary);
           setAnalysisText(newDocs[0].aiSummary || '');
        }
      } else {
        // Single document flow
        setRightPanelDoc(newDocs[0]);
        setAnalysisComplete(!!newDocs[0].aiSummary);
        setAnalysisText(newDocs[0].aiSummary || '');
      }

      setSelectedFiles([]);
      setSelectedCaseId('');

    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleAiAnalyze = async (doc: StoredDocument) => {
    if (!doc.aiSummary) {
      alert('AI Summary is not available for this document.');
      return;
    }
    setAnalysisText('');
    setAnalysisComplete(false);
    setIsAnalyzing(true);

    // Simulate typed streaming for effect, since we already have the text
    const words = doc.aiSummary.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i += 3) {
      currentText += words.slice(i, i + 3).join(' ') + ' ';
      setAnalysisText(currentText);
      await new Promise(r => setTimeout(r, 10)); // extremely fast pseudo-streaming
    }
    setAnalysisText(doc.aiSummary);
    setIsAnalyzing(false);
    setAnalysisComplete(true);
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
          setRightPanelDoc(doc);
          setAnalysisText('');
          setAnalysisComplete(false);
        },
        onRemove: () => {
          const updated = recentDocuments.filter(d => d.id !== doc.id);
          setRecentDocuments(updated);
          if (loggedIn && userId) {
            supabase.from('documents').delete().eq('id', doc.id);
          } else {
            localStorage.setItem('lawph_documents', JSON.stringify(updated));
          }
          if (rightPanelDoc?.id === doc.id) setRightPanelDoc(null);
        },
      }))}
      maxWidth="max-w-7xl"
    >
      <div className="relative z-10 flex-1 flex overflow-hidden h-full">
        {/* Left: Upload Panel */}
        <div className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${rightPanelDoc ? 'md:w-1/2 md:flex-none md:border-r md:border-white/5' : 'w-full'}`}>
          <div className="max-w-xl mx-auto space-y-6">
            {/* Drop Zone */}
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
                      <div className="flex flex-wrap gap-2 justify-center max-h-[120px] overflow-y-auto [scrollbar-width:thin]">
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

              {/* Attach to Case */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                  Attach to Case (Optional)
                </label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-300 outline-none focus:border-[#E0A7C2]/50 appearance-none cursor-pointer"
                  >
                    <option value="">— No case selected —</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.case_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={selectedFiles.length === 0 || isUploading}
                className={`w-full mt-5 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedFiles.length > 0 && !isUploading
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

        {/* Right: Document Preview & Analysis Panel */}
          <AnimatePresence>
            {rightPanelDoc && (
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full md:w-[480px] flex-shrink-0 bg-[#111111] border-l border-white/10 flex flex-col overflow-hidden absolute md:relative inset-y-0 right-0 z-20"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#E0A7C2]" />
                    <span className="font-semibold text-sm text-white truncate max-w-[200px]">{rightPanelDoc.name}</span>
                  </div>
                  <button onClick={() => setRightPanelDoc(null)} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                    <X size={16} />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-b border-white/5 flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAiAnalyze(rightPanelDoc)}
                    disabled={isAnalyzing}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#8B4564] hover:bg-[#9D5373] text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
                    {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                  {rightPanelDoc.file_url && (
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          url: rightPanelDoc.file_url!,
                          name: rightPanelDoc.name,
                        });
                        window.open(`/documents/viewer?${params.toString()}`, '_blank');
                      }}
                      className="flex items-center gap-1.5 border border-white/10 hover:bg-white/5 text-gray-300 font-medium py-2.5 px-4 rounded-xl text-sm transition-all"
                    >
                      <ExternalLink size={14} /> View Original
                    </button>
                  )}
                </div>

                {/* AI Analysis */}
                <div className="flex-1 overflow-y-auto p-4">
                  {analysisComplete || analysisText ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {analysisComplete
                          ? <><CheckCircle size={14} className="text-emerald-400" /><span className="text-xs font-semibold text-emerald-400">Analysis Complete</span></>
                          : <><Loader2 size={14} className="animate-spin text-[#E0A7C2]" /><span className="text-xs text-gray-400">Analyzing document...</span></>
                        }
                      </div>
                      <div className="bg-black/40 rounded-xl p-4 text-sm text-gray-200 leading-relaxed [scrollbar-width:thin] overflow-y-auto">
                        {analysisComplete ? (
                          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-snug prose-p:my-1.5 prose-headings:mb-1.5 prose-headings:mt-3 first:prose-headings:mt-0 prose-headings:text-sm prose-li:my-0">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {analysisText}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap font-mono">
                            {analysisText}
                            <span className="animate-pulse">▌</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : rightPanelDoc.aiSummary ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">AI Summary</span>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-snug prose-p:my-1.5 prose-headings:mb-1.5 prose-headings:mt-3 first:prose-headings:mt-0 prose-headings:text-sm prose-li:my-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {rightPanelDoc.aiSummary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                      <Bot size={36} className="opacity-30" />
                      <p className="text-sm text-center">No analysis yet.<br /><span className="text-xs text-gray-600">Click "Analyze with AI" to generate one.</span></p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </PageLayout>
  );
}
