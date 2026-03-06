'use client';

import React, { useState, useRef, useCallback } from 'react';
import { FileText, Upload, X, CheckCircle, AlertCircle, Loader2, Send, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadAndAnalyzeDocument } from '@/lib/s3-utils';

interface DocumentAnalyzerProps {
  onDocumentAnalyzed: (extractedText: string, filename: string) => void;
  disabled?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.doc', '.txt'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
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
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [filename, setFilename] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [wasTruncated, setWasTruncated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setUploadState('idle');
    setSelectedFile(null);
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
      return `Unsupported file type. Please upload a PDF, DOCX, or TXT file.`;
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
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      );

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
    if (filename) {
      // Use AI summary if available, otherwise fall back to raw extracted text
      const contentToSend = aiSummary || extractedText;
      onDocumentAnalyzed(contentToSend, filename);
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#8B4564]/15 text-[#E0A7C2] rounded-xl flex-shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Analyze Legal Document</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload a PDF, DOCX, or TXT — the AI will review it</p>
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
                className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 select-none
                  ${isDragging
                    ? 'border-[#E0A7C2]/70 bg-[#8B4564]/10 scale-[1.01]'
                    : 'border-white/10 hover:border-[#8B4564]/50 hover:bg-[#8B4564]/5'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 transition-colors ${isDragging ? 'bg-[#8B4564]/30' : 'bg-[#2A2A2A]'}`}>
                  <Upload size={24} className={isDragging ? 'text-[#E0A7C2]' : 'text-gray-400'} />
                </div>
                <p className="text-white font-semibold text-sm mb-1">
                  {isDragging ? 'Drop file here' : 'Drag & drop your document'}
                </p>
                <p className="text-gray-500 text-xs">or click to browse</p>
                <p className="text-gray-600 text-[11px] mt-3">PDF, DOC, DOCX, TXT · Max 20MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
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
                  className="mt-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-sm text-red-400"
                >
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* Accepted formats info */}
              <div className="mt-5 flex flex-wrap gap-2 justify-center">
                {['PDF', 'DOC', 'DOCX', 'TXT'].map(fmt => (
                  <span key={fmt} className="px-3 py-1 text-[11px] font-semibold rounded-full bg-[#2A2A2A] text-gray-400 border border-white/5 uppercase tracking-wider">
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
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-[#8B4564]/10 flex items-center justify-center">
                  <Loader2 size={28} className="text-[#E0A7C2] animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-sm">Extracting &amp; Analyzing...</p>
                {selectedFile && (
                  <p className="text-gray-500 text-xs mt-1 max-w-[200px] truncate">{selectedFile.name}</p>
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
              className="space-y-4"
            >
              {/* File info bar */}
              <div className="flex items-center gap-3 bg-[#1A1A1A] border border-[#8B4564]/20 rounded-xl px-4 py-3">
                <CheckCircle size={18} className="text-[#10B981] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{filename}</p>
                  <p className="text-gray-500 text-[11px]">
                    {charCount.toLocaleString()} characters extracted
                    {wasTruncated && <span className="ml-1 text-amber-400/80">(first 50,000 chars)</span>}
                  </p>
                </div>
                <button
                  onClick={resetState}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                  title="Remove and upload another file"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Truncation warning */}
              {wasTruncated && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2.5 text-xs text-amber-400">
                  <FileWarning size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Document was truncated to 50,000 characters to fit within the AI's context window.</span>
                </div>
              )}

              {/* Text Preview */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                  {aiSummary ? 'AI Legal Analysis' : 'Extracted Text Preview'}
                </label>
                <div className="bg-black/40 border border-white/8 rounded-xl p-4 max-h-44 overflow-y-auto text-xs text-gray-300 leading-relaxed [scrollbar-width:thin] [scrollbar-color:#8B4564_transparent]">
                  {aiSummary ? (
                    // Show AI summary using prose rendering
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-snug prose-p:my-1.5 prose-headings:mb-1.5 prose-headings:mt-3 first:prose-headings:mt-0 prose-headings:text-sm prose-li:my-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiSummary}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    // Fallback: raw text preview
                    <div className="font-mono whitespace-pre-wrap">{extractedText.substring(0, 600)}{extractedText.length > 600 && <span className="text-gray-600"> ... [{(extractedText.length - 600).toLocaleString()} more characters]</span>}</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={resetState}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
                >
                  Upload Another
                </button>
                <button
                  onClick={handleSendToChat}
                  disabled={disabled}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8B4564] to-[#7a3c58] hover:from-[#9D5373] hover:to-[#8B4564] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#8B4564]/20"
                >
                  <Send size={15} />
                  Send to Chat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
