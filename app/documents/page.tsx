'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Upload,
  Scale,
  HelpCircle,
  FileText,
  Menu
} from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { STORAGE_KEYS, ASSETS } from '@/lib/constants';

interface StoredDocument {
  id: number;
  name: string;
  timestamp: number;
}

export default function Documents() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<StoredDocument[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load documents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (saved) {
      try {
        setRecentDocuments(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load documents', e);
      }
    }
  }, []);

  // Save documents to localStorage
  useEffect(() => {
    if (recentDocuments.length > 0) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(recentDocuments));
    }
  }, [recentDocuments]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = () => {
    if (!selectedFile) return;

    const newDoc: StoredDocument = {
      id: Date.now(),
      name: selectedFile.name,
      timestamp: Date.now()
    };

    const updated = [newDoc, ...recentDocuments];
    setRecentDocuments(updated);
    setSelectedFile(null); // Clear after "analysis"
    
    // Also update localStorage immediately
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
    
    // In a real app, you'd trigger actual processing here
    alert(`Analyzing ${newDoc.name}...`);
  };

  const handleRemoveDocument = (id: number) => {
    const updated = recentDocuments.filter(doc => doc.id !== id);
    setRecentDocuments(updated);
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const sidebarRecentItems = recentDocuments.map(doc => ({
    id: doc.id,
    title: doc.name,
    subtitle: formatTimeAgo(doc.timestamp),
    onClick: () => alert(`Opening analysis for ${doc.name}`),
    onRemove: () => handleRemoveDocument(doc.id)
  }));

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white overflow-hidden relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Background Image with Overlay - Fixed Position */}
      <div className="fixed inset-0 z-0">
        <motion.img 
          src={ASSETS.LADY_JUSTICE_IMAGE}
          alt="Lady Justice"
          className="w-full h-full object-cover opacity-30 grayscale"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/80 via-[#1A1A1A]/70 to-[#1A1A1A]/95"></div>
      </div>

      <AppSidebar 
        activePage="documents"
        recentLabel="RECENT DOCUMENTS"
        recentItems={sidebarRecentItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Header */}
        <header className="relative z-10 border-b border-[#8B4564]/20 bg-[#1A1A1A]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-[#8B4564]/20 rounded-lg transition-colors"
              >
                <Menu size={20} className="text-gray-300" />
              </button>
              <button 
                onClick={() => router.back()}
                className="hidden md:block p-2 hover:bg-[#8B4564]/20 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-300" />
              </button>
              <div>
                <h1 className="text-base md:text-lg font-semibold">Document Analysis</h1>
                <p className="hidden md:block text-xs text-gray-400">Upload and review legal documents</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Upload Card */}
            <div className="bg-[#2A2A2A]/70 backdrop-blur border border-[#8B4564]/30 rounded-xl p-8">
              <h2 className="text-2xl mb-6">Upload Document for Analysis</h2>
              
              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 transition-all ${
                  dragActive 
                    ? 'border-[#8B4564] bg-[#8B4564]/10' 
                    : 'border-[#8B4564]/30 bg-[#3A2F2A]/30'
                }`}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#8B4564]/20 flex items-center justify-center mb-4">
                    <Upload size={32} className="text-[#8B4564]" />
                  </div>
                  
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <div className="bg-[#1A1A1A]/60 border border-[#8B4564]/40 px-4 py-2 rounded flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-[#8B4564]" />
                        <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                      </div>
                      <p className="text-xs text-[#8B4564]">File ready for analysis</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg text-white mb-2">
                        Drop your document here or click to browse
                      </p>
                      <p className="text-sm text-gray-400">
                        Supports PDF, DOC, DOCX (Max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Analyze Button */}
              <button 
                onClick={handleAnalyze}
                disabled={!selectedFile}
                className={`w-full mt-6 px-6 py-4 bg-[#8B4564] text-white rounded-lg transition-all flex items-center justify-center gap-2 ${
                  !selectedFile ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#9D5373]'
                }`}
              >
                <Scale size={20} />
                Analyze Document
              </button>
            </div>

            {/* Help Section */}
            <div className="mt-6 bg-[#2A2A2A]/50 backdrop-blur border border-[#8B4564]/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HelpCircle size={20} className="text-[#8B4564] mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium mb-1">What can I analyze?</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Upload contracts, agreements, legal forms, or any legal document. Our AI will analyze the content, 
                    identify key clauses, flag potential issues, and provide recommendations based on Philippine law.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
