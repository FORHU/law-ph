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

interface StoredDocument {
  id: number;
  name: string;
  timestamp: number;
  caseId?: string;
  caseName?: string;
  content?: string;
  aiSummary?: string;
}

export default function Documents() {
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen, cases } = useConversations();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [recentDocuments, setRecentDocuments] = useState<StoredDocument[]>([]);
  const [rightPanelDoc, setRightPanelDoc] = useState<StoredDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lawph_documents');
    if (saved) {
      try { setRecentDocuments(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsSidebarOpen(false); // Close left sidebar
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/legal/analyze-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.error || 'Failed to analyze document.');
      }

      const attachedCase = cases.find(c => c.id === selectedCaseId);
      const newDoc: StoredDocument = {
        id: Date.now(),
        name: selectedFile.name,
        timestamp: Date.now(),
        caseId: selectedCaseId || undefined,
        caseName: attachedCase?.case_name,
        content: data.text,
        aiSummary: data.ai_summary,
      };

      const updated = [newDoc, ...recentDocuments];
      setRecentDocuments(updated);
      localStorage.setItem('lawph_documents', JSON.stringify(updated));
      setSelectedFile(null);
      setSelectedCaseId('');
      setRightPanelDoc(newDoc);
      setAnalysisComplete(!!data.ai_summary);
      setAnalysisText(data.ai_summary || '');

    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
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
          localStorage.setItem('lawph_documents', JSON.stringify(updated));
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
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
                />
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#8B4564]/20 flex items-center justify-center">
                    <Upload size={28} className="text-[#E0A7C2]" />
                  </div>
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 bg-[#1A1A1A]/60 border border-[#8B4564]/40 px-3 py-1.5 rounded-lg">
                        <FileText size={14} className="text-[#E0A7C2]" />
                        <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                          className="text-gray-500 hover:text-white ml-1"><X size={12} /></button>
                      </div>
                      <p className="text-xs text-[#E0A7C2]">{(selectedFile.size / 1024).toFixed(1)} KB — ready for analysis</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-base text-white">Drop document here or click to browse</p>
                      <p className="text-sm text-gray-500">PDF, DOC, DOCX, TXT (Max 10MB)</p>
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
                disabled={!selectedFile || isUploading}
                className={`w-full mt-5 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedFile && !isUploading
                    ? 'bg-[#8B4564] hover:bg-[#9D5373] text-white'
                    : 'bg-[#8B4564]/20 text-gray-600 cursor-not-allowed'
                }`}
              >
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Scale size={18} />} 
                {isUploading ? 'Uploading & Analyzing...' : 'Analyze Document'}
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
                  <button
                    onClick={() => alert('In production, this would open the original document.')}
                    className="flex items-center gap-1.5 border border-white/10 hover:bg-white/5 text-gray-300 font-medium py-2.5 px-4 rounded-xl text-sm transition-all"
                  >
                    <ExternalLink size={14} /> View Original
                  </button>
                </div>

                {/* Document Preview / Analysis */}
                <div className="flex-1 overflow-y-auto p-4">
                  {analysisComplete || analysisText ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {analysisComplete
                          ? <><CheckCircle size={14} className="text-emerald-400" /><span className="text-xs font-semibold text-emerald-400">Analysis Complete</span></>
                          : <><Loader2 size={14} className="animate-spin text-[#E0A7C2]" /><span className="text-xs text-gray-400">Analyzing document...</span></>
                        }
                      </div>
                      <div className="bg-black/40 rounded-xl p-4 text-sm text-gray-200 leading-relaxed [scrollbar-width:thin] overflow-y-auto max-h-[50vh]">
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
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Document Preview</p>
                      <div className="bg-black/30 rounded-xl p-4 text-sm text-gray-400 leading-relaxed whitespace-pre-wrap font-mono border border-white/5 max-h-[50vh] overflow-y-auto [scrollbar-width:thin]">
                        {rightPanelDoc.content ? rightPanelDoc.content.substring(0, 1500) + (rightPanelDoc.content.length > 1500 ? '\n\n...[truncated for preview]' : '') : 'No preview available.'}
                      </div>
                      {rightPanelDoc.caseName && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-[#8B4564]/10 border border-[#8B4564]/20 px-3 py-2 rounded-lg">
                          <Briefcase size={12} className="text-[#E0A7C2]" />
                          Attached to case: <span className="font-semibold text-[#E0A7C2]">{rightPanelDoc.caseName}</span>
                        </div>
                      )}
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
