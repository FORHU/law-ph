'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, RotateCw, Mic, Divide, ZoomIn, ZoomOut, Bookmark, Upload,
  Wand2, Scissors, Settings2, Subtitles, Video, FileAudio, Users, Image as ImageIcon,
  CheckCircle, PenTool, Layout, Menu, History, Clock, Trash2, X, Plus, ExternalLink, Loader2
} from 'lucide-react';
import { uploadToS3Direct } from '@/lib/s3-utils';
import {
  startAWSBatchTranscription,
  getTranscriptionJobStatus,
  fetchTranscriptionText
} from '@/lib/aws-transcribe-utils';
import { useAuth } from '@/components/auth/auth-provider';
import {
  getTranscriptions,
  addTranscription,
  updateTranscription,
  deleteTranscription,
  Transcription
} from '@/lib/transcriptions-service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';


const InlineSpeakerLabel = ({ originalName, onUpdate }: { originalName: string, onUpdate: (oldName: string, newName: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(originalName);

  if (isEditing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          if (val.trim() && val !== originalName) onUpdate(originalName, val);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setVal(originalName);
            setIsEditing(false);
          }
        }}
        className="w-[110px] bg-black/40 border border-[#8B4564] rounded px-1.5 py-0.5 text-[10px] font-bold text-white outline-none -ml-1.5 uppercase tracking-widest shadow-lg"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-[#E0A7C2] hover:bg-white/5 cursor-text transition-colors rounded -ml-1.5 px-1.5 py-0.5 inline-flex items-center gap-1 group/label"
      title="Click to rename"
    >
      {originalName} <PenTool size={8} className="opacity-0 group-hover/label:opacity-100 transition-opacity" />
    </div>
  );
};

export default function TranscribeWorkspace({
  onOpenSidebar,
  isSidebarOpen = false
}: {
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
}) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);


  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Timing states
  const [duration, setDuration] = useState(0); // For recording
  const [currentTime, setCurrentTime] = useState(0); // For playback
  const [totalDuration, setTotalDuration] = useState(0); // For total audio length

  const [isDragging, setIsDragging] = useState(false);
  const scrubberContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const [activeDuration, setActiveDuration] = useState(0); // smooth tick for visualizer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Visualizer Live Tracking
  const audioHistoryRef = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  // History state
  const [history, setHistory] = useState<Transcription[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [activeTranscriptionId, setActiveTranscriptionId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId]);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;

  const updateTime = () => {
    let shouldLoop = false;

    if (isPlayingRef.current && audioRef.current && !isDraggingRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      shouldLoop = true;
    }

    if (isRecordingRef.current) {
      setActiveDuration((Date.now() - startTimeRef.current) / 1000);
      shouldLoop = true;
    }

    if (shouldLoop) {
      animationRef.current = requestAnimationFrame(updateTime);
    }
  };

  useEffect(() => {
    if (isPlaying || isRecording) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, isRecording, isDragging]);

  // Clean initialization helper
  const resetWorkspace = () => {
    setAudioUrl(null);
    setTranscript('');
    setDuration(0);
    setCurrentTime(0);
    setTotalDuration(0);
    setActiveDuration(0);
    setUploadStatus(null);
    setIsUploading(false);
    setActiveTranscriptionId(null);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.src = "";
    if (pollingRef.current) clearInterval(pollingRef.current);
    setWaveformPeaks([]);
  };

  const generateWaveform = async (url: string) => {
    if (!url || !url.startsWith('http')) return;
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const samples = 150; // match number of bars
      const blockSize = Math.floor(channelData.length / samples);
      const peaks = [];

      for (let i = 0; i < samples; i++) {
        let max = 0;
        for (let j = 0; j < blockSize; j++) {
          const val = Math.abs(channelData[i * blockSize + j]);
          if (val > max) max = val;
        }
        peaks.push(Math.max(10, max * 100)); // normalize to 0-100 range
      }
      setWaveformPeaks(peaks);
      audioContext.close();
    } catch (err) {
      console.warn("Waveform Generation (CORS/Network): Generating synthetic fallback.", err);
      // Generate a sophisticated synthetic waveform that looks like real speech
      const syntheticPeaks = [];
      const seed = Math.random();
      for (let i = 0; i < 150; i++) {
        const base = Math.abs(Math.sin(i * 0.05 + seed) * 35);
        const detail = Math.abs(Math.cos(i * 0.2 + seed) * 25);
        const jit = Math.random() * 10;
        const edgeDamping = Math.min(i, 150 - i) / 20;
        const damping = Math.min(1, edgeDamping);
        let val = (base + detail + jit) * damping;
        if (Math.sin(i * 0.15 + seed) < -0.6) val *= 0.2;
        syntheticPeaks.push(Math.max(12, val));
      }
      setWaveformPeaks(syntheticPeaks);
    }
  };

  const loadHistory = async () => {
    if (!userId) return;
    const data = await getTranscriptions(userId);
    setHistory(data);
  };

  const startPolling = (dbId: string, jobName: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsPolling(true);

    pollingRef.current = setInterval(async () => {
      const job = await getTranscriptionJobStatus(jobName);
      if (job?.TranscriptionJobStatus === 'COMPLETED') {
        const text = await fetchTranscriptionText(job.Transcript!.TranscriptFileUri!);
        setTranscript(text);
        setIsPolling(false);
        await updateTranscription(dbId, { transcript: text });
        loadHistory();
        stopPolling();
      } else if (job?.TranscriptionJobStatus === 'FAILED') {
        setUploadStatus("Transcription failed.");
        setIsPolling(false);
        stopPolling();
      }
    }, 5000);

    setTimeout(() => {
      setUploadStatus(null);
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  };

  const saveToHistory = async (title: string, url: string, initialTranscript: string, initialDuration: number, jobName?: string) => {
    if (!userId) return;
    const newEntry = await addTranscription(userId, {
      title,
      audio_url: url,
      transcript: initialTranscript,
      duration: initialDuration,
      job_name: jobName
    });
    if (newEntry) {
      setActiveTranscriptionId(newEntry.id);
      loadHistory();
      if (jobName) startPolling(newEntry.id, jobName);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setIsUploading(true);
    setUploadStatus("Uploading to S3...");

    try {
      const audioUrlForDuration = URL.createObjectURL(file);
      const tempAudio = new Audio(audioUrlForDuration);
      const fileDuration = await new Promise<number>((resolve) => {
        tempAudio.onloadedmetadata = () => {
          let dur = tempAudio.duration;
          if (!Number.isFinite(dur)) dur = 0;
          resolve(Math.floor(dur));
          URL.revokeObjectURL(audioUrlForDuration);
        };
        tempAudio.onerror = () => resolve(0);
      });

      const s3Data = await uploadToS3Direct(file, file.name);
      if (s3Data.file_url) {
        setAudioUrl(s3Data.file_url);
        generateWaveform(s3Data.file_url);
      }

      const jobName = `transcribe-${Date.now()}`;
      const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";
      const s3Uri = `s3://${bucket}/${s3Data.s3_key}`;

      await startAWSBatchTranscription(s3Uri, jobName);
      setUploadStatus("Transcription job successfully initiated!");

      saveToHistory(file.name, s3Data.file_url, "Transcription in progress...", fileDuration, jobName);

    } catch (error) {
      console.error("Upload/Transcribe Error:", error);
      setUploadStatus("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const confirmOverwriteAndRecord = () => {
    setShowOverwriteModal(false);
    resetWorkspace();
    setTimeout(() => {
      startMediaRecording();
    }, 50);
  };



  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (analyzerTimerRef.current) clearInterval(analyzerTimerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    } else {
      if (audioUrl || transcript) {
        setShowOverwriteModal(true);
        return;
      }
      startMediaRecording();
    }
  };

  const getParsedTranscript = () => {
    if (!transcript) return [];
    return transcript.split('\n\n').map((paragraph, idx) => {
      const speakerMatch = paragraph.match(/^\[([^\]]+)\]: (.*)/s);
      const speakerName = (speakerMatch ? speakerMatch[1] : "UNKNOWN").toUpperCase();
      const text = speakerMatch ? speakerMatch[2] : paragraph;
      const timestamp = formatTimelineTime((totalDuration / Math.max(1, transcript.split('\n\n').length)) * idx);
      return { speakerName, text, timestamp };
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const data = getParsedTranscript();
    
    // Add Title
    doc.setFontSize(20);
    doc.setTextColor(139, 69, 100); // #8B4564
    doc.text('Transcription Export', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = data.map(item => [
      item.timestamp,
      item.speakerName,
      item.text
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Time', 'Speaker', 'Transcript Text']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [139, 69, 100] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 'auto' }
      }
    });

    doc.save(`transcript-${Date.now()}.pdf`);
    setShowExportMenu(false);
  };

  const exportToWord = async () => {
    const data = getParsedTranscript();
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Transcription Export",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Generated on: ${new Date().toLocaleString()}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }), // spacing
          ...data.flatMap(item => [
            new Paragraph({
              children: [
                new TextRun({ text: `${item.timestamp} - ${item.speakerName}`, bold: true, color: "8B4564" }),
              ],
              spacing: { before: 240 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: item.text }),
              ],
              spacing: { after: 120 },
            })
          ])
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${Date.now()}.docx`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startMediaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      audioHistoryRef.current = [];

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        source.connect(analyzer);
        analyzer.fftSize = 256;
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);

        analyzerTimerRef.current = setInterval(() => {
          analyzer.getByteFrequencyData(dataArray);
          const maxVal = Math.max(...Array.from(dataArray));
          const peak = Math.max(10, Math.min(100, (maxVal / 128) * 100 + 5));
          audioHistoryRef.current.push(peak);
        }, 100);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const file = new File([audioBlob], `recording-${Date.now()}.mp3`, { type: 'audio/mp3' });

        setIsUploading(true);
        setUploadStatus("Saving recording...");
        try {
          const s3Data = await uploadToS3Direct(file, file.name);
          setAudioUrl(s3Data.file_url);

          const jobName = `transcribe-${Date.now()}`;
          const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";
          const s3Uri = `s3://${bucket}/${s3Data.s3_key}`;

          await startAWSBatchTranscription(s3Uri, jobName);
          setUploadStatus("Transcription job successfully initiated!");

          saveToHistory(`Recording ${new Date().toLocaleString()}`, s3Data.file_url, "Transcription in progress...", duration, jobName);
        } catch (error) {
          console.error("Error saving recording:", error);
        } finally {
          setIsUploading(false);
        }
        stream.getTracks().forEach(track => track.stop());
        if (fileInputRef.current) fileInputRef.current.value = "";
      };

      startTimeRef.current = Date.now();
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Could not access microphone.');
    }
  };

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTimelineTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateSeekPosition = (clientX: number) => {
    if (!scrubberContainerRef.current || !audioUrl || !totalDuration || isRecording) return;
    const rect = scrubberContainerRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const percentage = x / rect.width;
    const maxTime = Math.max(totalDuration, activeDuration, 10);
    const newTime = Math.min(percentage * maxTime, totalDuration);

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!audioUrl || !totalDuration || isRecording) return;
    setIsDragging(true);
    updateSeekPosition(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateSeekPosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    updateSeekPosition(e.clientX);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleSkip = (amount: number) => {
    if (!audioRef.current || !audioUrl) return;
    const newTime = Math.max(0, Math.min(totalDuration, audioRef.current.currentTime + amount));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div className="flex w-full h-full glass-panel overflow-hidden">

      {/* Left Main Pane */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Text / Script Editor Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 pr-12 md:pr-24 relative custom-sidebar-scrollbar">
          {!transcript && !isRecording && !isPolling && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-[#8B4564]/20 rounded-3xl flex items-center justify-center mb-8 text-[#E0A7C2] shadow-sm border border-[#8B4564]/30">
                <Mic size={40} strokeWidth={1.5} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Transcribe your voice.</h1>
              <p className="text-gray-400 mb-10 leading-relaxed text-lg">
                Record or upload audio to generate AI transcripts.
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#8B4564] hover:bg-[#8B4564]/80 text-white px-6 py-4 rounded-xl font-semibold shadow-lg shadow-[#8B4564]/10 transition-all active:scale-[0.98]"
                >
                  <Upload size={20} /> Upload File
                </button>
                <button
                  onClick={toggleRecording}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#2A1F1A]/50 hover:bg-[#2A1F1A]/80 text-white px-6 py-4 rounded-xl font-semibold border border-white/10 shadow-sm transition-all active:scale-[0.98]"
                >
                  <Mic size={20} className="text-red-400" /> Start Recording
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="audio/*"
                />
              </div>
            </div>
          )}

          {(isUploading || uploadStatus) && (
            <div className="absolute inset-0 z-50 bg-[#1A1A1A]/90 backdrop-blur-md flex flex-col items-center justify-center text-center px-4 rounded-tl-2xl rounded-bl-2xl">
              <div className="mb-4">
                {isUploading ? <Loader2 size={48} className="animate-spin text-[#E0A7C2]" /> : <CheckCircle size={48} className="text-green-400" />}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{isUploading ? 'Digital Assistant Working...' : 'Done'}</h2>
              <p className="text-gray-400 font-medium text-lg">{uploadStatus || 'Preparing your transcription'}</p>
            </div>
          )}

          {(transcript || isRecording || isPolling) && (
            <div className="max-w-4xl mx-auto py-4">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#8B4564]/20 rounded-2xl text-[#E0A7C2] border border-[#8B4564]/30">
                    <FileAudio size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Transcription Session</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-400 font-medium mt-0.5">
                      <Clock size={14} />
                      {isRecording ? formatTimelineTime(duration) : formatTimelineTime(totalDuration)}
                      <span className="mx-1">•</span>
                      AI Engine: AWS Transcribe
                    </div>
                  </div>
                </div>

                  <div className="flex gap-3 relative">
                    <button
                      onClick={resetWorkspace}
                      className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl font-semibold transition-colors border border-white/10"
                    >
                      <Plus size={18} /> New
                    </button>
                    <div className="relative" ref={exportMenuRef}>
                      <button 
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all border ${showExportMenu ? 'bg-[#8B4564] text-white border-transparent' : 'text-[#E0A7C2] bg-[#8B4564]/20 hover:bg-[#8B4564]/30 border-[#8B4564]/30'}`}
                      >
                        <ExternalLink size={18} /> Export
                      </button>
                      
                      {showExportMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                          <div className="p-2 flex flex-col gap-1">
                            <button 
                              onClick={exportToPDF}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                            >
                              <span>PDF Document</span>
                              <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-1.5 py-0.5 rounded uppercase">.pdf</span>
                            </button>
                            <button 
                              onClick={exportToWord}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                            >
                              <span>Word Document</span>
                              <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-1.5 py-0.5 rounded uppercase">.docx</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
              </div>

              {isPolling && (
                <div className="mb-12 p-8 bg-[#8B4564]/10 rounded-3xl border border-[#8B4564]/20 flex items-center gap-6">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-[#8B4564]/30 border-t-[#E0A7C2] rounded-full animate-spin"></div>
                    <Loader2 className="absolute inset-0 m-auto text-[#E0A7C2]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">AI is transcribing...</h3>
                    <p className="text-[#E0A7C2] text-sm font-medium opacity-80 mt-1">Sit tight! We're processing your audio with high precision speaker diarization.</p>
                  </div>
                </div>
              )}

              <div className="space-y-12">
                {transcript === 'Transcription in progress...' ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    <div className="h-4 bg-white/5 rounded w-1/2"></div>
                    <div className="h-4 bg-white/5 rounded w-5/6"></div>
                  </div>
                ) : transcript.includes('[') ? (
                  // Structured transcript with speaker tags
                  transcript.split('\n\n').map((paragraph, idx) => {
                    const speakerMatch = paragraph.match(/^\[([^\]]+)\]: (.*)/s);
                    const speakerName = speakerMatch ? speakerMatch[1] : "UNKNOWN";
                    const text = speakerMatch ? speakerMatch[2] : paragraph;

                    return (
                      <div key={idx} className="group flex gap-8">
                        <div className="w-32 flex-shrink-0 pt-1 flex flex-col items-start justify-start">
                          <InlineSpeakerLabel
                            originalName={speakerName}
                            onUpdate={(oldName, newName) => {
                              if (!transcript) return;
                              const newTranscript = transcript.split(`[${oldName}]:`).join(`[${newName.trim()}]:`);
                              if (newTranscript !== transcript) {
                                setTranscript(newTranscript);
                                if (activeTranscriptionId) {
                                  updateTranscription(activeTranscriptionId, { transcript: newTranscript });
                                }
                              }
                            }}
                          />
                          <div className="text-xs font-medium text-gray-400 font-mono pl-1.5 mt-1 tracking-tight">
                            {formatTimelineTime((totalDuration / Math.max(1, transcript.split('\n\n').length)) * idx)}
                          </div>
                        </div>
                        <div className="flex-1 prose prose-lg prose-invert max-w-none text-gray-300 leading-relaxed">
                          {text}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Simple text fallback
                  transcript.split('\n\n').map((paragraph, idx) => (
                    <div key={idx} className="group flex gap-8">
                      <div className="w-32 flex-shrink-0 pt-1">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-[#E0A7C2] transition-colors">
                          SPEAKER 1
                        </div>
                        <div className="text-xs font-medium text-gray-400 font-mono">
                          {formatTimelineTime((totalDuration / Math.max(1, transcript.split('\n\n').length)) * idx)}
                        </div>
                      </div>
                      <div className="flex-1 prose prose-lg prose-invert max-w-none text-gray-300 leading-relaxed">
                        {paragraph}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Audio/Video Transport Area */}
        <div className="h-48 border-t border-white/10 flex flex-col bg-[#1A1A1A]/80 backdrop-blur-md rounded-bl-xl">

          {/* Controls Bar */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-white/5 z-10 w-full relative">
            <div className="absolute inset-0 bg-[#2A1F1A]/30 pointer-events-none" />

            {/* Left side timing indicator */}
            <div className="flex-1 flex items-center gap-3 relative z-10">
              <span className="text-xs font-semibold text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 min-w-[100px] text-center">
                {formatTimelineTime(isRecording ? duration : currentTime)} <span className="text-gray-500 font-normal">/ {formatTimelineTime(isRecording ? duration : (totalDuration || duration))}</span>
              </span>
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`p-2 rounded-lg transition-all ${isHistoryOpen ? 'bg-[#8B4564] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                title="History"
              >
                <History size={18} />
              </button>
            </div>

            {/* Central core media controls */}
            <div className="flex items-center justify-center gap-6 flex-[2] relative z-10">
              <button
                onClick={() => handleSkip(-10)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Rewind 10s"
              >
                <div className="relative flex flex-col items-center justify-center">
                  <RotateCcw size={20} />
                  <span className="text-[8px] font-bold mt-[2px] absolute">10</span>
                </div>
              </button>
              <button
                className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-all border border-transparent hover:border-white/20"
                onClick={() => {
                  if (!audioUrl && !isPlaying) {
                    alert("No recording available to play.");
                    return;
                  }
                  if (isPlaying) {
                    audioRef.current?.pause();
                    setIsPlaying(false);
                  } else {
                    audioRef.current?.play();
                    setIsPlaying(true);
                  }
                }}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>

              <button
                onClick={toggleRecording}
                className={`w-14 h-14 rounded-full transition-all flex items-center justify-center shadow-md border-2 ${isRecording ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/10'}`}
              >
                <Mic size={24} />
              </button>

              <button
                onClick={() => handleSkip(10)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Skip forward 10s"
              >
                <div className="relative flex flex-col items-center justify-center">
                  <RotateCw size={20} />
                  <span className="text-[8px] font-bold mt-[2px] absolute">10</span>
                </div>
              </button>
            </div>

            {/* Right side tools */}
            <div className="flex-1 flex items-center justify-end gap-3 relative z-10">
            </div>

          </div>

          {/* Timeline / Waveform */}
          <div
            ref={scrubberContainerRef}
            className={`flex-1 relative overflow-hidden select-none touch-none ${(!audioUrl || isRecording) ? 'cursor-not-allowed bg-black/20' : 'cursor-pointer hover:bg-white/5 transition-colors bg-black/10'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={() => setTotalDuration(audioRef.current?.duration || 0)}
              />
            )}
            {/* Time markings top line */}
            <div className="absolute top-0 w-full h-6 border-b border-white/5 flex justify-between text-[10px] text-gray-500 font-medium pt-1">
              {[0, 1, 2, 3, 4].map(ratio => {
                const maxTime = Math.max(totalDuration, activeDuration, 10);
                return (
                  <span key={ratio} className={ratio === 0 ? "" : "border-l border-white/10 pl-1"}>
                    {formatTimelineTime((maxTime / 4) * ratio)}
                  </span>
                );
              })}
            </div>

            {/* Waveform graphic */}
            <div className="absolute top-8 left-0 w-full flex items-center justify-between h-24 opacity-80">
              {Array.from({ length: 150 }).map((_, i) => {
                const maxTime = Math.max(totalDuration, activeDuration, 10);
                // The actual boundary of the full audio data:
                const boundaryDuration = isRecording ? activeDuration : Math.max(totalDuration, 0.1);
                const timeAtBar = (i / 150) * maxTime;

                // Whether this specific physical bar physically exists inside the recorded/loaded audio timeline:
                const hasAudioData = boundaryDuration > 0 && timeAtBar <= boundaryDuration;

                let barHeight = 10;
                let isPlayed = false;

                if (hasAudioData) {
                  isPlayed = timeAtBar <= (isRecording ? activeDuration : currentTime);

                  if (waveformPeaks.length > 0 && !isRecording) {
                    // Scale waveform representation accurately across how much space the audio physically takes up
                    const peakIndex = Math.floor((timeAtBar / boundaryDuration) * (waveformPeaks.length - 1));
                    barHeight = waveformPeaks[Math.max(0, Math.min(peakIndex, waveformPeaks.length - 1))] || 10;
                  } else if (audioHistoryRef.current.length > 0) {
                    const historyIndex = Math.floor((timeAtBar / boundaryDuration) * (audioHistoryRef.current.length - 1));
                    barHeight = audioHistoryRef.current[Math.max(0, Math.min(historyIndex, audioHistoryRef.current.length - 1))] || 10;
                  } else {
                    barHeight = 50;
                  }
                }

                // Unplayed active portions get dimmed, actual empty bounds get completely flattened:
                const colorClass = hasAudioData
                  ? (isPlayed ? 'bg-[#E0A7C2]/90' : 'bg-[#E0A7C2]/30')
                  : 'bg-white/10 h-[10%]';

                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-100 ${colorClass}`}
                    style={hasAudioData ? { height: `${barHeight}%` } : {}}
                  />
                );
              })}
            </div>

            {/* Progress handle/line */}
            <div
              className="absolute top-6 bottom-0 w-[2px] bg-[#E0A7C2] shadow-[0_0_8px_rgba(224,167,194,0.8)] z-10 pointer-events-none"
              style={{ left: `${((isRecording ? activeDuration : currentTime) / Math.max(totalDuration, activeDuration, 10)) * 100}%` }}
            >
              <div className="w-4 h-4 bg-[#E0A7C2] rounded-full -ml-[7px] -mt-[6px] shadow-[0_0_12px_rgba(224,167,194,1)] scale-y-110" />
            </div>
          </div>
        </div>
      </div>

      {/* History Slide-out Sidebar */}
      {isHistoryOpen && (
        <div className="w-80 bg-[#1A1A1A]/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <History size={18} className="text-[#E0A7C2]" /> History
            </h3>
            <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-sidebar-scrollbar">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <Clock size={32} className="text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">No transcription history yet.</p>
              </div>
            ) : (
              history.map((item) => {
                const isRecorded = item.title.startsWith('Recording');
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setAudioUrl(item.audio_url);
                      setTranscript(item.transcript || '');
                      if (item.duration > 0 || !totalDuration) setTotalDuration(item.duration);
                      setActiveTranscriptionId(item.id);
                      setIsHistoryOpen(false);
                      if (item.audio_url) generateWaveform(item.audio_url);
                      if (item.transcript === "Transcription in progress..." && item.job_name) {
                        startPolling(item.id, item.job_name);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all border outline-none overflow-hidden ${activeTranscriptionId === item.id ? 'bg-[#8B4564] text-white border-[#8B4564] shadow-lg shadow-[#8B4564]/20' : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 min-w-0">
                      <div className="shrink-0 flex items-center justify-center">
                        {isRecorded ? (
                          <Mic size={14} className={activeTranscriptionId === item.id ? 'text-[#E0A7C2]' : 'text-red-400 opacity-80'} />
                        ) : (
                          <Upload size={14} className={activeTranscriptionId === item.id ? 'text-[#E0A7C2]' : 'text-blue-400 opacity-80'} />
                        )}
                      </div>
                      <div className="font-bold text-sm truncate text-white">{item.title}</div>
                    </div>
                    <div className={`text-[10px] font-medium opacity-80 flex items-center gap-2 ${activeTranscriptionId === item.id ? 'text-[#E0A7C2]' : 'text-gray-500'}`}>
                      <Clock size={10} /> {new Date(item.created_at).toLocaleDateString()} • {formatTimelineTime(item.duration)}
                    </div>
                    {item.transcript === "Transcription in progress..." && (
                      <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold ${activeTranscriptionId === item.id ? 'text-white' : 'text-[#E0A7C2]'}`}>
                        <Loader2 size={10} className="animate-spin" /> Processing...
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
          <div className="p-4 bg-black/40 border-t border-white/5">
            <button
              onClick={resetWorkspace}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#8B4564] text-white rounded-xl font-bold hover:bg-[#8B4564]/80 transition-all active:scale-[0.98]"
            >
              <Plus size={18} /> New Session
            </button>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-[90%] max-w-md p-6 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                <Mic className="text-red-400" size={24} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Active session detected</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                You currently have an active transcription session. Starting a new recording will discard your current timeline context. Are you sure you want to proceed?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                onClick={() => setShowOverwriteModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmOverwriteAndRecord}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#8B4564] hover:bg-[#8B4564]/80 text-white shadow-lg shadow-[#8B4564]/20 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <Mic size={16} /> Record Over
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
