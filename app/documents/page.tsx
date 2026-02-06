'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Upload,
  Scale,
  HelpCircle,
  FileText
} from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';

interface StoredDocument {
  id: number;
  name: string;
  time: string;
  timestamp: number;
}

export default function Documents() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<StoredDocument[]>([]);

  // Load documents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ilovelawyer_documents');
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
      localStorage.setItem('ilovelawyer_documents', JSON.stringify(recentDocuments));
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
      time: 'Analyzed just now',
      timestamp: Date.now()
    };

    setRecentDocuments([newDoc, ...recentDocuments]);
    setSelectedFile(null); // Clear after "analysis"
    
    // In a real app, you'd trigger actual processing here
    alert(`Analyzing ${newDoc.name}...`);
  };

  const sidebarRecentItems = recentDocuments.map(doc => ({
    id: doc.id,
    title: doc.name,
    subtitle: doc.time,
    onClick: () => alert(`Opening analysis for ${doc.name}`)
  }));

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white overflow-hidden relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Background Image with Overlay - Fixed Position */}
      <div className="fixed inset-0 z-0">
        <motion.img 
          src="https://images.unsplash.com/photo-1701267148058-9159d6642f79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYWR5JTIwanVzdGljZSUyMHN0YXR1ZSUyMGRyYW1hdGljJTIwbGlnaHRpbmd8ZW58MXx8fHwxNzcwMTcyODAxfDA&ixlib=rb-4.1.0&q=80&w=1080"
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
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="relative z-10 border-b border-[#8B4564]/20 bg-[#1A1A1A]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-[#8B4564]/20 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-300" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Document Analysis</h1>
                <p className="text-xs text-gray-400">Upload and review legal documents</p>
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
