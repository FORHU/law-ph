'use client';

import React, { useState, useRef, useCallback } from 'react';
import { FileText, Upload, X, CheckCircle, AlertCircle, Loader2, Send, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadAndAnalyzeDocument, UploadedDocumentData } from '@/lib/s3-utils';

interface DocumentAnalyzerProps {
  onDocumentAnalyzed: (data: UploadedDocumentData) => void;
  disabled?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg', '.mp3', '.wav', '.m4a'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'image/png',
  'image/jpeg',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/x-m4a',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentAnalyzer({ onDocumentAnalyzed, disabled = false }: DocumentAnalyzerProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [uploadData, setUploadData] = useState<UploadedDocumentData | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [filename, setFilename] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [wasTruncated, setWasTruncated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setUploadState('idle');
    setSelectedFile(null);
    setUploadData(null);
    setExtractedText('');
    setAiSummary(null);
    setFilename('');
    setCharCount(0);
    setWasTruncated(false);
    setErrorMessage('');
  };

  const validateFile = (file: File): string | null => {
    if (file.size > 20 * 1024 * 1024) {
      return 'File is too large. Maximum size is 20MB.';
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      return `Unsupported file type. Please upload a PDF, DOCX, TXT, Image, or Audio file.`;
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    setUploadState('uploading');
    setErrorMessage('');

    try {
      const data = await uploadAndAnalyzeDocument(
        file,
        process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      );

      setUploadData(data);
      setAiSummary(data.ai_summary ?? null);
      setFilename(data.filename);
      setCharCount(data.char_count ?? 0);
      setWasTruncated(data.truncated ?? false);
      setUploadState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setUploadState('error');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleSendToChat = () => {
    if (uploadData) {
      onDocumentAnalyzed(uploadData);
    }
  };

  return (
    <motion.div
      className="animate-in fade-in slide-in-from-bottom-4 duration-300 w-full max-w-2xl mx-auto py-6 px-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-[#722f37]/15 text-[#e9c176] rounded-xl flex-shrink-0 border border-[#722f37]/30">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-serif text-white tracking-tight">Institutional <span className="text-[#e9c176] italic">Analysis</span></h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Submit PDF, DOCX, or Audio evidence for ratification</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* === IDLE / ERROR: Drop Zone === */}
          {(uploadState === 'idle' || uploadState === 'error') && (
            <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 select-none
                  ${isDragging
                    ? 'border-[#e9c176]/70 bg-[#722f37]/10 scale-[1.01] shadow-2xl shadow-[#722f37]/10'
                    : 'border-white/5 bg-[#0B0B0C]/40 hover:border-[#722f37]/50 hover:bg-[#722f37]/5'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 transition-colors ${isDragging ? 'bg-[#722f37]/30' : 'bg-[#111111] border border-white/5'}`}>
                  <Upload size={28} className={isDragging ? 'text-[#e9c176]' : 'text-gray-500'} />
                </div>
                <p className="text-white font-bold text-sm mb-1 uppercase tracking-widest">
                  {isDragging ? 'Release Transmission' : 'Initiate File Upload'}
                </p>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest">or click to browse filesystem</p>
                <p className="text-gray-600 text-[10px] mt-4 font-mono">SUPPORTED: PDF, DOCX, TXT, IMAGES, AUDIO · LIMIT 20MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp3,.wav,.m4a,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*,audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={disabled}
                />
              </div>

              {/* Error Message */}
              {uploadState === 'error' && errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-[10px] text-red-400 font-bold uppercase tracking-widest"
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>Protocol Failure: {errorMessage}</span>
                </motion.div>
              )}

              {/* Accepted formats info */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {['PDF', 'DOC(X)', 'TXT', 'IMAGE', 'AUDIO'].map(fmt => (
                  <span key={fmt} className="px-4 py-1.5 text-[10px] font-bold rounded-lg bg-[#0B0B0C] text-gray-500 border border-white/5 uppercase tracking-[0.2em]">
                    {fmt}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* === UPLOADING === */}
          {uploadState === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
                  <Loader2 size={32} className="text-[#e9c176] animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm uppercase tracking-widest">Ratifying Submission...</p>
                {selectedFile && (
                  <p className="text-[#e9c176] text-[10px] mt-2 font-mono uppercase tracking-wider max-w-[240px] truncate">{selectedFile.name}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* === SUCCESS: Preview & Send === */}
          {uploadState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* File info bar */}
              <div className="flex items-center gap-4 bg-[#0B0B0C] border border-[#722f37]/20 rounded-2xl p-5 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{filename}</p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mt-1">
                    {charCount.toLocaleString()} Characters Verified
                    {wasTruncated && <span className="ml-2 text-amber-500">(Truncated Transmission)</span>}
                  </p>
                </div>
                <button
                  onClick={resetState}
                  className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all flex-shrink-0"
                  title="Remove and upload another file"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Truncation warning */}
              {wasTruncated && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                  <FileWarning size={16} className="flex-shrink-0" />
                  <span>Submission exceeded protocol limits. First 50,000 characters were ratified.</span>
                </div>
              )}

              {/* Text Preview */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1">
                  {aiSummary ? 'Institutional Synthesis' : 'Extracted Data Stream'}
                </label>
                <div className="bg-[#0B0B0C] border border-white/5 rounded-2xl p-6 max-h-52 overflow-y-auto text-[13px] text-gray-400 leading-relaxed [scrollbar-width:thin] [scrollbar-color:#722f37_transparent] custom-sidebar-scrollbar">
                  {aiSummary ? (
                    // Show AI summary using prose rendering
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-2.5 prose-headings:mb-3 prose-headings:mt-6 first:prose-headings:mt-0 prose-headings:text-[#e9c176] prose-headings:font-serif prose-li:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiSummary}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    // Fallback: raw text preview
                    <div className="font-mono whitespace-pre-wrap">{extractedText.substring(0, 600)}{extractedText.length > 600 && <span className="text-gray-600"> ... [{(extractedText.length - 600).toLocaleString()} additional characters]</span>}</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={resetState}
                  className="flex-1 py-4 rounded-xl border border-white/10 text-gray-500 hover:text-white hover:bg-white/5 text-[11px] font-bold uppercase tracking-widest transition-all"
                >
                  Discard & Retry
                </button>
                <button
                  onClick={handleSendToChat}
                  disabled={disabled}
                  className="flex-2 px-12 py-4 rounded-xl bg-[#722f37] hover:bg-[#8b3a44] text-white text-[11px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-[#722f37]/20 active:scale-95"
                >
                  <Send size={16} className="stroke-[2.5]" />
                  Ratify to Chat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
