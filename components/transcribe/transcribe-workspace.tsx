'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, RotateCw, Mic, Divide, ZoomIn, ZoomOut, Bookmark, Upload,
  Wand2, Scissors, Settings2, Subtitles, Video, FileAudio, Users, Image as ImageIcon,
  CheckCircle, PenTool, Layout, Menu, History, Clock, Trash2, X, Plus, ExternalLink, Loader2, Square,
  Edit2, Check
} from 'lucide-react';
import { uploadToS3Direct, getProxiedUrl } from '@/lib/s3-utils';
import {
  startAWSBatchTranscription,
  getTranscriptionJobStatus,
  fetchTranscriptionText
} from '@/lib/aws-transcribe-utils';
import { useAuth } from '@/components/auth/auth-provider';
import type { Transcription } from '@/lib/transcriptions-service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


const InlineSpeakerLabel = ({ originalName, onUpdate }: { originalName: string; onUpdate: (old: string, newV: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(originalName);

  return (
    <div className="flex flex-col mb-1">
      <div className="text-[10px] font-bold text-[#e9c176]/60 uppercase tracking-[0.2em] mb-1.5 pl-0.5">
        Voice Identity
      </div>
      {isEditing ? (
        <input
          autoFocus
          className="bg-[#1a1a1a]/80 border border-[#722f37]/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold outline-none ring-1 ring-[#722f37]/50 w-full max-w-[130px] shadow-lg"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setIsEditing(false);
            onUpdate(originalName, value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setIsEditing(false);
              onUpdate(originalName, value);
            }
          }}
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="group cursor-pointer flex items-center gap-2 bg-[#722f37]/10 hover:bg-[#722f37]/20 border border-[#722f37]/20 hover:border-[#722f37]/40 px-3 py-1.5 rounded-xl transition-all duration-300"
          title="Click to rename"
        >
          <span className="text-xs font-bold text-[#e9c176] tracking-wide truncate max-w-[120px]">
            {originalName.toUpperCase()}
          </span>
          <PenTool size={10} className="text-[#e9c176]/40 group-hover:text-[#e9c176] transition-colors" />
        </div>
      )}
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
  const { user } = useAuth();
  const userId = user?.id;

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
  const [duration, setDuration] = useState(0); // For recording (integer)
  const [currentTime, setCurrentTime] = useState(0); // For playback
  const [totalDuration, setTotalDuration] = useState(0); // For total audio length (metadata)
  const [activeDuration, setActiveDuration] = useState(0); // high-precision tick for visualizer/recording
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0); // Karaoke active line

  const [isDragging, setIsDragging] = useState(false);
  const scrubberContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  // Memoize parsed transcript segments to avoid re-parsing on every render
  const parsedSegments = React.useMemo(() => {
    if (!transcript || !transcript.includes('[TS:')) return [];
    return transcript.split('\n\n').map((paragraph) => {
      const tsMatch = paragraph.match(/^\[TS:([\d.]+)\]\s+\[([^\]]+)\]: (.*)/s);
      return {
        ts: tsMatch ? parseFloat(tsMatch[1]) : null,
        speaker: tsMatch ? tsMatch[2] : 'UNKNOWN',
        text: tsMatch ? tsMatch[3] : paragraph,
      };
    });
  }, [transcript]);

  // Use a ref so the animation loop can access parsed segments without causing re-renders
  const parsedSegmentsRef = useRef(parsedSegments);
  parsedSegmentsRef.current = parsedSegments;

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

  // Title editing & deleting state and handlers
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const saveTitle = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`/api/transcriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        loadHistory();
        setEditingId(null);
      }
    } catch (err) {
      console.error("Failed to save title:", err);
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm("Are you sure you want to delete this transcription session?")) return;
    
    try {
      const res = await fetch(`/api/transcriptions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (activeTranscriptionId === id) {
          // Clear active workspace
          setTranscript('');
          setAudioUrl(null);
          setTotalDuration(0);
          setActiveTranscriptionId(null);
        }
        loadHistory();
      }
    } catch (err) {
      console.error("Failed to delete transcription:", err);
    }
  };

  // Unified duration for the entire UI
  const displayTotalDuration = isRecording ? activeDuration : (totalDuration > 0 ? totalDuration : (duration > 0 ? duration : 0.1));

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
      const t = audioRef.current.currentTime;
      setCurrentTime(t);

      // Karaoke: find active segment directly in the RAF loop (no useEffect chain)
      const segs = parsedSegmentsRef.current;
      if (segs.length > 0) {
        let newIdx = 0;
        for (let i = 0; i < segs.length; i++) {
          if (segs[i].ts !== null && segs[i].ts! <= t) newIdx = i;
        }
        setActiveSegmentIdx((prev) => (prev !== newIdx ? newIdx : prev));
      }

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

  // Auto-scroll to active segment
  useEffect(() => {
    if (isPlaying && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeSegmentIdx, isPlaying]);

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
      const proxiedUrl = getProxiedUrl(url);
      const response = await fetch(proxiedUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Force totalDuration to match the actual decoded audio length to ensure visual sync
      if (audioBuffer.duration > 0) {
        setTotalDuration(audioBuffer.duration);
      }

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
    const res = await fetch("/api/transcriptions");
    if (res.ok) {
      const { transcriptions } = await res.json();
      setHistory(transcriptions ?? []);
    }
  };

  const startPolling = (dbId: string, jobName: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsPolling(true);

    pollingRef.current = setInterval(async () => {
      try {
        const job = await getTranscriptionJobStatus(jobName);

        // If job is missing or start failed, stop polling immediately
        if (!job) {
          console.warn("Polling stopped: Job not found or failed to initiate.");
          stopPolling();
          return;
        }

        if (job.TranscriptionJobStatus === 'COMPLETED') {
          const text = await fetchTranscriptionText(job.Transcript!.TranscriptFileUri!);
          setTranscript(text);
          setIsPolling(false);
          await fetch(`/api/transcriptions/${dbId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: text }),
          });
          loadHistory();
          stopPolling();
        } else if (job.TranscriptionJobStatus === 'FAILED') {
          setUploadStatus("Transcription failed.");
          setIsPolling(false);
          stopPolling();
        }
      } catch (err) {
        console.error("Critical polling error, stopping interval:", err);
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
    const res = await fetch("/api/transcriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, audioUrl: url, transcript: initialTranscript, duration: initialDuration, jobName }),
    });
    if (res.ok) {
      const { transcription: newEntry } = await res.json();
      if (newEntry) {
        setActiveTranscriptionId(newEntry.id);
        loadHistory();
        if (jobName) startPolling(newEntry.id, jobName);
      }
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
      const timestamp = formatTimelineTime((displayTotalDuration / Math.max(1, transcript.split('\n\n').length)) * idx);
      return { speakerName, text, timestamp };
    });
  };

  const exportToPDF = async () => {
    // Parse transcript segments from the [TS:X.XX] [Speaker]: text format
    const data = transcript.split('\n\n').map((paragraph) => {
      const tsMatch = paragraph.match(/^\[TS:([\d.]+)\]\s+\[([^\]]+)\]: (.*)/s);
      if (tsMatch) {
        return {
          timestamp: formatTimelineTime(parseFloat(tsMatch[1])),
          speakerName: tsMatch[2],
          text: tsMatch[3].trim(),
        };
      }
      // Fallback: older format [Speaker]: text
      const legacyMatch = paragraph.match(/^\[([^\]]+)\]: (.*)/s);
      if (legacyMatch) {
        return { timestamp: '', speakerName: legacyMatch[1], text: legacyMatch[2].trim() };
      }
      return { timestamp: '', speakerName: 'SPEAKER', text: paragraph.trim() };
    }).filter(item => item.text.length > 0);

    const doc = new jsPDF('p', 'mm', 'a4');

    // Technical Constants (Official TSN Format)
    const PAGE_WM = 210; const PAGE_HM = 297;
    const CW = 2480; const CH = 3508;
    const MX = 250; // Restore Wide Margin as per screenshot
    const LNW = 100; // Line number column width
    const INDENT_S = 80; // Indent for speaker name from margin line
    const INDENT_T = 160; // Extra indent for dialogue text
    const CWID = CW - MX - LNW - INDENT_T - 150; // Text column width
    const L_HEIGHT = 45;
    const S_GAP = 20;
    const B_GAP = 70; // Professional gap between speakers
    const BOTTOM_LIMIT = CH - 150;

    let pageNum = 1;

    // Helper to render high-res court page
    const renderPage = (drawActions: (ctx: CanvasRenderingContext2D) => void, isFirst: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = CW; canvas.height = CH;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CW, CH);

      // --- VERTICAL REFERENCE LINE ---
      ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(MX + LNW - 20, 100); ctx.lineTo(MX + LNW - 20, CH - 150); ctx.stroke();

      if (isFirst) {
        ctx.textAlign = 'center'; ctx.fillStyle = '#111';
        ctx.font = '32px serif'; ctx.fillText('REPUBLIC OF THE PHILIPPINES', CW / 2, 100);
        ctx.font = 'bold 44px serif'; ctx.fillText('INSTITUTIONAL CASE INTELLIGENCE SYSTEM', CW / 2, 160);
        ctx.font = '36px serif'; ctx.fillText('SOVEREIGN LEGAL HUB', CW / 2, 210);

        ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(300, 250); ctx.lineTo(CW - 300, 250); ctx.stroke();

        ctx.font = 'bold 50px serif';
        ctx.fillText('TRANSCRIPTION OF STENOGRAPHIC NOTES', CW / 2, 340);

        ctx.textAlign = 'left'; ctx.font = '34px serif';
        ctx.fillText(`DATE OF SESSION: ${new Date().toLocaleDateString()}`, MX + LNW, 420);
        ctx.fillText(`TIME GENERATED: ${new Date().toLocaleTimeString()}`, MX + LNW, 470);
        ctx.fillText(`ENGINE: AWS TRANSCRIBE (MULITLINGUAL)`, MX + LNW, 520);
      } else {
        ctx.font = 'italic 28px serif'; ctx.fillStyle = '#666';
        ctx.fillText(`TRANSCRIPTION OF STENOGRAPHIC NOTES - Page ${pageNum} (Continued)`, MX + LNW, 100);
      }

      drawActions(ctx);

      // Page Number Footer (Subtle)
      ctx.font = 'italic 24px serif'; ctx.fillStyle = '#888'; ctx.textAlign = 'right';
      ctx.fillText(`Page ${pageNum} • LAW-PH Official Export`, CW - 150, CH - 80);

      return canvas.toDataURL('image/jpeg', 0.90);
    };

    const tempCanvas = document.createElement('canvas');
    const tctx = tempCanvas.getContext('2d')!;
    tctx.font = '36px serif';

    let currentY = 650; // Starting Y for page 1
    let actions: ((ctx: CanvasRenderingContext2D) => void)[] = [];
    let lineIncr = 1;

    const flushPage = () => {
      const pageActions = [...actions];
      const img = renderPage((ctx) => {
        pageActions.forEach(a => a(ctx));
      }, pageNum === 1);
      doc.addImage(img, 'JPEG', 0, 0, PAGE_WM, PAGE_HM);
      doc.addPage();
      pageNum++;
      currentY = 200; // Starting Y for subsequent pages
      actions = [];
    };

    data.forEach((item) => {
      if (currentY + 100 > BOTTOM_LIMIT) flushPage();

      const sY = currentY;
      const currentLineNo = lineIncr++;

      actions.push((ctx) => {
        // Line Number
        ctx.fillStyle = '#999'; ctx.font = '28px serif'; ctx.fillText(`${currentLineNo}`, MX, sY);
        // Speaker Indented
        ctx.fillStyle = '#111'; ctx.font = 'bold 36px serif';
        ctx.fillText(`${item.timestamp}  ${item.speakerName.toUpperCase()}:`, MX + LNW + INDENT_S, sY);
      });
      currentY += S_GAP + 50;

      // Wrap Dialogue Text (Further Indented)
      const words = item.text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (tctx.measureText(testLine).width > CWID && n > 0) {
          if (currentY + L_HEIGHT > BOTTOM_LIMIT) flushPage();

          const drawY = currentY;
          const drawLine = line;
          actions.push((ctx) => {
            ctx.fillStyle = '#333'; ctx.font = '36px serif';
            ctx.fillText(drawLine, MX + LNW + INDENT_T, drawY);
          });
          line = words[n] + ' ';
          currentY += L_HEIGHT;
        } else {
          line = testLine;
        }
      }

      // Last Line
      if (currentY + L_HEIGHT > BOTTOM_LIMIT) flushPage();
      const lastLY = currentY; const lastLS = line;
      actions.push((ctx) => {
        ctx.fillStyle = '#333'; ctx.font = '36px serif';
        ctx.fillText(lastLS, MX + LNW + INDENT_T, lastLY);
      });
      currentY += B_GAP;
    });

    // Signature Block at the end
    if (currentY + 150 > BOTTOM_LIMIT) flushPage();
    const finalY = currentY + 50;
    actions.push((ctx) => {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(CW - 800, finalY); ctx.lineTo(CW - 200, finalY); ctx.stroke();
      ctx.font = 'italic 30px serif'; ctx.fillStyle = '#444'; ctx.textAlign = 'center';
      ctx.fillText('Certified Correct By: Law-PH AI', CW - 500, finalY + 50);
    });

    // Final Flush
    const pageActions = [...actions];
    const img = renderPage((ctx) => {
      pageActions.forEach(a => a(ctx));
    }, pageNum === 1);
    doc.addImage(img, 'JPEG', 0, 0, PAGE_WM, PAGE_HM);

    doc.save(`transcript-tsn-${Date.now()}.pdf`);
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
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const ext = mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('ogg') ? 'ogg' : 'webm');
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([audioBlob], `recording-${Date.now()}.${ext}`, { type: mimeType });

        setIsUploading(true);
        setUploadStatus("Saving recording...");
        try {
          const s3Data = await uploadToS3Direct(file, file.name);
          setAudioUrl(s3Data.file_url);

          const jobName = `transcribe-${Date.now()}`;
          const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";
          const s3Uri = `s3://${bucket}/${s3Data.s3_key}`;

          const result = await startAWSBatchTranscription(s3Uri, jobName);
          if (!result) {
            setUploadStatus("Failed to initiate transcription job. Please check AWS configuration.");
            return;
          }
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
    if (!Number.isFinite(secs) || isNaN(secs)) return "--:--";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateSeekPosition = (clientX: number) => {
    if (!scrubberContainerRef.current || !audioUrl || displayTotalDuration <= 0.1 || isRecording) return;
    const rect = scrubberContainerRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const percentage = x / rect.width;
    const newTime = Math.min(percentage * displayTotalDuration, (totalDuration > 0 ? totalDuration : displayTotalDuration));

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!audioUrl || displayTotalDuration <= 0.1 || isRecording) return;
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
    const newTime = Math.max(0, Math.min(displayTotalDuration, audioRef.current.currentTime + amount));
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
              <div className="w-20 h-20 bg-[#722f37]/20 rounded-3xl flex items-center justify-center mb-8 text-[#e9c176] shadow-sm border border-[#722f37]/30">
                <Mic size={40} strokeWidth={1.5} />
              </div>
              <h1 className="text-4xl font-serif text-white mb-4 tracking-tight antialiased">Transcribe your voice.</h1>
              <p className="text-gray-400 mb-10 leading-relaxed text-lg font-medium">
                Record or upload audio to generate high-fidelity legal transcripts.
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#722f37] hover:bg-[#8b3a44] text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-black/40 transition-all active:scale-[0.98]"
                >
                  <Upload size={20} /> Upload File
                </button>
                <button
                  onClick={toggleRecording}
                  className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98] border shadow-lg ${isRecording
                    ? 'bg-[#722f37] border-[#722f37]/50 text-white shadow-black/40'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                    }`}
                >
                  {isRecording ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <Square size={18} fill="white" strokeWidth={0} />
                      </div>
                      <span className="tracking-wide">Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic size={20} className="text-red-400" />
                      <span>Start Recording</span>
                    </>
                  )}
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
                {isUploading ? <Loader2 size={48} className="animate-spin text-[#e9c176]" /> : <CheckCircle size={48} className="text-emerald-400" />}
              </div>
              <h2 className="text-2xl font-serif text-white mb-2">{isUploading ? 'Digital Assistant Working...' : 'Success'}</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{uploadStatus || 'Preparing your transcription'}</p>
            </div>
          )}

          {(transcript || isRecording || isPolling) && (
            <div className="max-w-4xl mx-auto py-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-12 gap-6 md:gap-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#722f37]/20 rounded-2xl text-[#e9c176] border border-[#722f37]/30">
                    <FileAudio size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-white tracking-tight">Transcription Workspace</h2>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-[10px] font-bold text-[#e9c176]/60 uppercase tracking-[0.2em] mt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {isRecording ? formatTimelineTime(duration) : formatTimelineTime(totalDuration)}
                      </div>
                      <span className="hidden sm:inline mx-1 opacity-40">•</span>
                      <span className="opacity-80">AI Engine: AWS Transcribe</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={resetWorkspace}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-colors border border-white/10"
                  >
                    <Plus size={16} /> <span className="text-sm">New</span>
                  </button>
                  {transcript && transcript !== 'Transcription in progress...' && !isPolling && !isUploading && (
                    <button
                      onClick={exportToPDF}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all border text-[#e9c176] bg-[#722f37]/20 hover:bg-[#722f37]/30 border-[#722f37]/30 whitespace-nowrap shadow-lg shadow-black/20 animate-in fade-in zoom-in duration-300"
                    >
                      <ExternalLink size={16} /> <span className="text-sm">Download PDF</span>
                    </button>
                  )}
                </div>
              </div>

              {isPolling && (
                <div className="mb-12 p-8 bg-[#722f37]/10 rounded-3xl border border-[#722f37]/20 flex items-center gap-6 shadow-2xl">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-[#722f37]/30 border-t-[#e9c176] rounded-full animate-spin"></div>
                    <Loader2 className="absolute inset-0 m-auto text-[#e9c176]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-white mb-1">AI Intelligence at work...</h3>
                    <p className="text-[#e9c176]/80 text-[11px] font-bold uppercase tracking-[0.1em] mt-1">Sit tight! We're processing your audio with high precision speaker diarization.</p>
                  </div>
                </div>
              )}

              <div className="space-y-10">
                {transcript === 'Transcription in progress...' ? (
                  <div className="animate-pulse space-y-6">
                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    <div className="h-5 bg-white/5 rounded w-1/2"></div>
                    <div className="h-4 bg-white/5 rounded w-5/6"></div>
                  </div>
                ) : transcript.includes('[TS:') ? (
                  // Karaoke-style: active line glows, speaker column is independent
                  parsedSegments.map((seg, idx) => {
                    const isActive = idx === activeSegmentIdx && isPlaying;
                    return (
                      <div
                        key={idx}
                        ref={isActive ? activeSegmentRef : null}
                        className="flex flex-col md:flex-row gap-4 md:gap-10 items-start py-2"
                      >
                        {/* Speaker Identity — fully independent, no seek logic */}
                        <div className="w-full md:w-36 flex-shrink-0 flex flex-col items-start justify-start pt-1">
                          <InlineSpeakerLabel
                            originalName={seg.speaker}
                            onUpdate={(oldName, newName) => {
                              if (!transcript) return;
                              const newTranscript = transcript.split(`] [${oldName}]:`).join(`] [${newName.trim()}]:`);
                              if (newTranscript !== transcript) {
                                setTranscript(newTranscript);
                                if (activeTranscriptionId) {
                                  fetch(`/api/transcriptions/${activeTranscriptionId}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ transcript: newTranscript }),
                                  });
                                }
                              }
                            }}
                          />
                          <div className="text-[10px] font-medium text-gray-500 font-mono pl-1 mt-0.5 tracking-wider opacity-60">
                            {formatTimelineTime(seg.ts || 0)}
                          </div>
                        </div>

                        {/* Transcript Text — click to seek, karaoke glow when active */}
                        <div
                          onClick={() => {
                            if (seg.ts !== null && audioRef.current) {
                              audioRef.current.currentTime = seg.ts;
                              setCurrentTime(seg.ts);
                              if (!isPlaying) {
                                audioRef.current.play();
                                setIsPlaying(true);
                              }
                            }
                          }}
                          className={`flex-1 leading-[1.8] tracking-normal cursor-pointer transition-all duration-200 ${isActive
                            ? 'text-white font-medium drop-shadow-[0_0_8px_rgba(224,167,194,0.5)]'
                            : 'text-gray-500 font-light hover:text-gray-300'
                            }`}
                        >
                          {seg.text}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Simple text fallback
                  transcript.split('\n\n').map((paragraph, idx) => (
                    <div key={idx} className="group flex flex-col md:flex-row gap-4 md:gap-10 items-start hover:bg-white/[0.02] p-4 md:-mx-4 rounded-2xl transition-colors">
                      <div className="w-full md:w-36 flex-shrink-0 flex flex-col items-start pt-1">
                        <div className="text-[10px] font-bold text-[#e9c176]/50 uppercase tracking-[0.2em] mb-1.5 pl-0.5">
                          Voice Identity
                        </div>
                        <div className="bg-[#722f37]/10 border border-[#722f37]/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[#e9c176] uppercase tracking-widest">
                          Primary Voice
                        </div>
                        <div className="text-[10px] font-medium text-gray-500 font-mono pl-1 mt-1 tracking-wider opacity-60">
                          {formatTimelineTime((displayTotalDuration / Math.max(1, transcript.split('\n\n').length)) * idx)}
                        </div>
                      </div>
                      <div className="flex-1 prose prose-lg prose-invert max-w-none text-gray-300 leading-[1.8] font-light">
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
        <div className="h-auto md:h-48 border-t border-white/10 flex flex-col bg-[#111111] backdrop-blur-xl rounded-bl-xl z-20">

          {/* Top Info Bar (Mobile Only - Spacing/Time) */}
          <div className="flex md:hidden items-center justify-between px-6 pt-5 pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {isRecording ? 'Live Recording' : 'Playback Mode'}
              </span>
            </div>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`p-2 rounded-lg transition-all ${isHistoryOpen ? 'bg-[#722f37] text-white' : 'bg-white/5 border border-white/10 text-gray-400'}`}
            >
              <History size={16} />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-4 md:h-20 border-b border-white/5 relative gap-6 md:gap-0">
            {/* Desktop-only backdrop */}
            <div className="absolute inset-0 bg-[#722f37]/5 pointer-events-none hidden md:block" />

            {/* Time Display */}
            <div className="flex items-center gap-3 z-10 w-full md:w-auto justify-between md:justify-start">
              <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-3">
                <span className="text-xl md:text-2xl font-bold text-white tabular-nums tracking-tighter">
                  {formatTimelineTime(isRecording ? duration : currentTime)}
                </span>
                <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                  / {formatTimelineTime(displayTotalDuration)}
                </span>
              </div>

              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isHistoryOpen ? 'bg-[#722f37] text-white border-[#722f37]' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400'}`}
              >
                <History size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
              </button>
            </div>

            {/* Central Controls */}
            <div className="flex items-center gap-4 md:gap-8 z-10">
              <button
                onClick={() => handleSkip(-10)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Back 10s"
              >
                <RotateCcw size={20} />
              </button>

              <button
                className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full transition-all border-2 ${isPlaying ? 'bg-white text-black border-white shadow-lg' : 'bg-transparent text-white border-white/20 hover:border-white/40'}`}
                onClick={() => {
                  if (!audioUrl) {
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
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
              </button>

              {/* Record Button (Prominent) */}
              <button
                onClick={toggleRecording}
                className={`group relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full transition-all ${isRecording
                  ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                  : 'bg-[#722f37]/20 text-[#e9c176] border border-[#722f37]/30 hover:bg-[#722f37]/30'
                  }`}
              >
                {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                {isRecording && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSkip(10)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Forward 10s"
              >
                <RotateCw size={20} />
              </button>
            </div>

            {/* Right side spacers (Desktop Only) */}
            <div className="hidden md:flex items-center gap-4 z-10 w-48 justify-end">
            </div>
          </div>

          {/* Timeline / Waveform Area */}
          <div
            ref={scrubberContainerRef}
            className={`flex-1 min-h-[100px] md:min-h-0 relative overflow-hidden select-none touch-none ${(!audioUrl || isRecording) ? 'cursor-not-allowed bg-black/40' : 'cursor-pointer hover:bg-white/5 transition-colors bg-black/20'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {audioUrl && (
              <audio
                key={audioUrl}
                ref={audioRef}
                src={getProxiedUrl(audioUrl)}
                crossOrigin="anonymous"
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentTime(displayTotalDuration);
                }}
                onLoadedMetadata={() => {
                  const dur = audioRef.current?.duration;
                  if (dur && Number.isFinite(dur) && dur > 0) {
                    setTotalDuration(dur);
                  }
                }}
              />
            )}

            {/* Waveform Visualization */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-[2px] md:gap-1 w-full h-24 md:h-32 opacity-60">
                {(() => {
                  return Array.from({ length: 150 }).map((_, i) => {
                    const hasAudioData = waveformPeaks.length > 0;
                    // Use a deterministic pattern (sine wave) for placeholder if no data, to avoid hydration mismatch
                    const placeholderHeight = 10 + (Math.sin(i * 0.5) * 5 + 5);
                    const peakHeight = hasAudioData ? waveformPeaks[i] : placeholderHeight;

                    const timeAtBar = (i / 150) * displayTotalDuration;
                    const isPlayed = !isRecording && timeAtBar <= currentTime;
                    const isRecordingProgress = isRecording && timeAtBar <= activeDuration;

                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-full ${isPlayed || isRecordingProgress
                            ? 'bg-[#e9c176] shadow-[0_0_8px_rgba(233,193,118,0.3)]'
                            : 'bg-white/10'
                            }`}
                          style={{
                            height: `${Math.max(4, peakHeight).toFixed(2)}%`,
                            opacity: isPlayed || isRecordingProgress ? '1' : '0.3'
                          }}
                        />
                      );
                  });
                })()}
              </div>
            </div>

            {/* Scrubber Line */}
            {!isRecording && audioUrl && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-[#e9c176] shadow-[0_0_15px_rgba(233,193,118,0.5)] z-30 pointer-events-none"
                style={{
                  left: `${(currentTime / displayTotalDuration) * 100}%`
                }}
              >
                <div className="w-4 h-4 rounded-full bg-[#e9c176] absolute top-0 -left-[7px] shadow-lg border-4 border-[#0B0B0C]" />
              </div>
            )}

            {/* Time Markings */}
            <div className="absolute bottom-1 left-0 right-0 flex justify-between pointer-events-none">
              {Array.from({ length: 5 }).map((_, i) => {
                const time = (i / 4) * displayTotalDuration;
                return (
                  <span key={i} className="text-[9px] md:text-[10px] font-bold text-gray-600 font-mono tracking-tighter">
                    {formatTimelineTime(time)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* History Slide-out Sidebar */}
      {isHistoryOpen && (
        <div className="fixed md:relative inset-0 md:inset-auto z-[60] flex justify-end md:flex-none overflow-hidden">
          {/* Backdrop (Mobile Only) */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md md:hidden animate-in fade-in duration-300"
            onClick={() => setIsHistoryOpen(false)}
          />

          <div className="w-[85%] md:w-80 h-full bg-[#0B0B0C]/95 backdrop-blur-2xl border-l border-[#722f37]/30 flex flex-col relative z-10 animate-in slide-in-from-right duration-500 shadow-2xl">
            <div className="p-6 border-b border-[#722f37]/20 flex items-center justify-between bg-white/[0.02]">
              <div className="flex flex-col">
                <h3 className="font-serif text-lg text-white flex items-center gap-2 tracking-tight">
                  <History size={18} className="text-[#e9c176]" /> History
                </h3>
                <p className="text-[10px] font-bold text-[#e9c176]/50 uppercase tracking-[0.2em] mt-1">Session Archives</p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-sidebar-scrollbar">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-center px-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Clock size={32} className="text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No transcription history yet.</p>
                  <p className="text-xs text-gray-600 mt-1">Your recorded sessions will appear here.</p>
                </div>
              ) : (
                history.map((item) => {
                  const isRecorded = (item.title ?? '').startsWith('Recording');
                  const isActive = activeTranscriptionId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (editingId === item.id) return;
                        setAudioUrl(item.audioUrl);
                        setTranscript(item.transcript || '');
                        if ((item.duration ?? 0) > 0 || !totalDuration) setTotalDuration(item.duration ?? 0);
                        setActiveTranscriptionId(item.id);
                        if (window.innerWidth < 768) setIsHistoryOpen(false);
                        if (item.audioUrl) generateWaveform(item.audioUrl);
                        if (item.transcript === "Transcription in progress..." && item.jobName) {
                          startPolling(item.id, item.jobName);
                        }
                      }}
                      className={`w-full text-left p-4 rounded-2xl transition-all border outline-none cursor-pointer relative group/item flex flex-col ${isActive ? 'bg-[#722f37] text-white border-[#722f37] shadow-lg shadow-[#722f37]/20' : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5 text-gray-300'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isRecorded ? (
                            <Mic size={14} className={isActive ? 'text-white flex-shrink-0' : 'text-red-400 flex-shrink-0'} />
                          ) : (
                            <Upload size={14} className={isActive ? 'text-white flex-shrink-0' : 'text-blue-400 flex-shrink-0'} />
                          )}
                          
                          {editingId === item.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/50 border border-white/10 text-white text-xs px-2 py-1 rounded-lg w-full focus:outline-none focus:border-[#e9c176]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.stopPropagation();
                                    saveTitle(item.id, editingTitle);
                                  } else if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    setEditingId(null);
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveTitle(item.id, editingTitle);
                                }}
                                className="p-1 hover:bg-white/10 text-green-400 rounded-lg flex-shrink-0"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(null);
                                }}
                                className="p-1 hover:bg-white/10 text-red-400 rounded-lg flex-shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="font-bold text-sm truncate flex-1">{item.title}</div>
                          )}
                        </div>
                        
                        {editingId !== item.id && (
                          <div className="relative flex-shrink-0 w-16 h-6 flex items-center justify-end">
                            {/* Duration Tag (Default state) */}
                            <div className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full transition-all duration-200 group-hover/item:opacity-0 group-hover/item:pointer-events-none ${isActive ? 'bg-white/20' : 'bg-black/20'}`}>
                              {formatTimelineTime(item.duration ?? 0)}
                            </div>

                            {/* Action Buttons (Fades in on hover) */}
                            <div className="absolute inset-0 flex items-center justify-end gap-1.5 opacity-0 group-hover/item:opacity-100 transition-all duration-200 pointer-events-none group-hover/item:pointer-events-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(item.id);
                                  setEditingTitle(item.title || '');
                                }}
                                className={`p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                                title="Rename Session"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(item.id, e)}
                                className={`p-1 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0 ${isActive ? 'text-white hover:text-red-300' : 'text-gray-400 hover:text-red-400'}`}
                                title="Delete Session"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`text-[10px] font-medium flex items-center gap-2 opacity-60 mt-1.5 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                        <Clock size={10} /> {new Date(item.createdAt).toLocaleDateString()}
                      </div>

                      {item.transcript === "Transcription in progress..." && (
                        <div className={`mt-3 flex items-center gap-2 text-[10px] font-bold ${isActive ? 'text-white' : 'text-[#e9c176]'}`}>
                          <Loader2 size={10} className="animate-spin" />
                          <span className="uppercase tracking-[0.2em]">Ratifying Record...</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-6 bg-[#111111] border-t border-white/5">
              <button
                onClick={resetWorkspace}
                className="w-full flex items-center justify-center gap-3 py-4 bg-[#722f37] hover:bg-[#8b3a44] text-white rounded-2xl font-bold transition-all active:scale-[0.98] shadow-xl shadow-[#722f37]/10 uppercase tracking-[0.2em] text-[11px]"
              >
                <Plus size={20} /> <span className="tracking-tight text-sm">Start New Session</span>
              </button>
            </div>
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
                className="px-5 py-2.5 rounded-xl text-[10px] font-bold bg-[#722f37] hover:bg-[#8b3a44] text-white shadow-lg shadow-[#722f37]/20 transition-all active:scale-[0.98] flex items-center gap-2 uppercase tracking-widest"
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
