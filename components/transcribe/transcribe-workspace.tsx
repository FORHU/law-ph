'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Mic, Divide, ZoomIn, ZoomOut, Bookmark, Upload,
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
  const [activeTranscriptionId, setActiveTranscriptionId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId]);

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

  const saveToHistory = async (url: string, initialTranscript: string, initialDuration: number, jobName?: string) => {
    if (!userId) return;
    const newEntry = await addTranscription(userId, {
      title: `Recording ${new Date().toLocaleString()}`,
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
      const s3Data = await uploadToS3Direct(file);
      if (s3Data.file_url) {
        setAudioUrl(s3Data.file_url);
        generateWaveform(s3Data.file_url);
      }

      const jobName = `transcribe-${Date.now()}`;
      await startAWSBatchTranscription(s3Data.s3_uri, jobName);
      setUploadStatus("Transcription job successfully initiated!");
      
      saveToHistory(s3Data.file_url, "Transcription in progress...", 0, jobName);
      
    } catch (error) {
      console.error("Upload/Transcribe Error:", error);
      setUploadStatus("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (analyzerTimerRef.current) clearInterval(analyzerTimerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    } else {
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
             setActiveDuration((Date.now() - startTimeRef.current) / 1000);
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
            const s3Data = await uploadToS3Direct(file);
            setAudioUrl(s3Data.file_url);
            
            const jobName = `transcribe-${Date.now()}`;
            await startAWSBatchTranscription(s3Data.s3_uri, jobName);
            setUploadStatus("Transcription job successfully initiated!");
            
            saveToHistory(s3Data.file_url, "Transcription in progress...", duration, jobName);
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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioUrl || !totalDuration || isRecording) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * totalDuration;
    if (audioRef.current) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }
  };

  const handleSkip = (amount: number) => {
    if (!audioRef.current || !audioUrl) return;
    const newTime = Math.max(0, Math.min(totalDuration, audioRef.current.currentTime + amount));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div className="flex w-full h-[calc(100vh-1rem)] m-2 bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
      
      {/* Left Main Pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-50">
            <button 
               onClick={onOpenSidebar}
               className="p-2 text-gray-500 hover:text-gray-800 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-gray-100 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
               title="Open Sidebar"
            >
               <Menu size={20} />
            </button>
          </div>
        )}

        {/* Text / Script Editor Area */}
        <div className="flex-1 overflow-y-auto p-12 pr-24 relative">
           {!transcript && !isRecording && !isPolling && (
             <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
               <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 text-indigo-500 shadow-sm border border-indigo-100">
                  <Mic size={40} strokeWidth={1.5} />
               </div>
               <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Transcribe your voice.</h1>
               <p className="text-gray-500 mb-10 leading-relaxed text-lg">
                  Record locally or upload an audio file to generate professional, synchronized transcripts using AI.
               </p>
               <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-semibold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                  >
                    <Upload size={20} /> Upload File
                  </button>
                  <button 
                    onClick={toggleRecording}
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 px-6 py-4 rounded-2xl font-semibold border-2 border-gray-100 shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Mic size={20} className="text-red-500" /> Start Recording
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
            <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center px-4">
              <div className="mb-4 text-gray-500">
                {isUploading ? <Loader2 size={48} className="animate-spin text-indigo-500" /> : <CheckCircle size={48} className="text-green-500" />}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{isUploading ? 'Digital Assistant Working...' : 'Done'}</h2>
              <p className="text-gray-500 font-medium text-lg">{uploadStatus || 'Preparing your transcription'}</p>
            </div>
          )}

           {(transcript || isRecording || isPolling) && (
              <div className="max-w-4xl mx-auto py-8">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
                      <FileAudio size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Transcription Session</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mt-0.5">
                        <Clock size={14} /> 
                        {isRecording ? formatTimelineTime(duration) : formatTimelineTime(totalDuration)}
                        <span className="mx-1">•</span>
                        AI Engine: AWS Transcribe
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={resetWorkspace}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors border border-gray-200"
                    >
                      <Plus size={18} /> New
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-semibold transition-colors border border-indigo-100">
                      <ExternalLink size={18} /> Export
                    </button>
                  </div>
                </div>

                {isPolling && (
                  <div className="mb-12 p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center gap-6">
                    <div className="relative">
                       <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                       <Loader2 className="absolute inset-0 m-auto text-indigo-600" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">AI is transcribing...</h3>
                      <p className="text-indigo-600 text-sm font-medium">Sit tight! We're processing your audio with high precision speaker diarization.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-12">
                  {transcript === 'Transcription in progress...' ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                    </div>
                  ) : transcript.includes('[Speaker') ? (
                    // Structured transcript with speaker tags
                    transcript.split('\n\n').map((paragraph, idx) => {
                       const speakerMatch = paragraph.match(/^\[(Speaker [^\]]+)\]: (.*)/s);
                       const speakerName = speakerMatch ? speakerMatch[1] : "UNKNOWN";
                       const text = speakerMatch ? speakerMatch[2] : paragraph;
                       
                       return (
                         <div key={idx} className="group flex gap-8">
                           <div className="w-32 flex-shrink-0 pt-1">
                             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">
                               {speakerName}
                             </div>
                             <div className="text-xs font-medium text-gray-300 font-mono">
                                {formatTimelineTime((totalDuration / Math.max(1, transcript.split('\n\n').length)) * idx)}
                             </div>
                           </div>
                           <div className="flex-1 prose prose-lg max-w-none text-gray-700 leading-relaxed">
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
                           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">
                             SPEAKER 1
                           </div>
                           <div className="text-xs font-medium text-gray-300 font-mono">
                             {formatTimelineTime((totalDuration / Math.max(1, transcript.split('\n\n').length)) * idx)}
                           </div>
                         </div>
                         <div className="flex-1 prose prose-lg max-w-none text-gray-700 leading-relaxed">
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
        <div className="h-48 border-t border-gray-200 flex flex-col bg-gray-50">
          
          {/* Controls Bar */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-gray-200 bg-white shadow-sm z-10 w-full">
            
            {/* Left side timing indicator */}
            <div className="flex-1 flex items-center gap-3">
               <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 shadow-inner min-w-[100px] text-center">
                  {formatTimelineTime(isRecording ? duration : currentTime)} <span className="text-gray-400 font-normal">/ {formatTimelineTime(isRecording ? duration : (totalDuration || duration))}</span>
               </span>
               <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`p-2 rounded-lg transition-all ${isHistoryOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                title="History"
               >
                 <History size={18} />
               </button>
            </div>

            {/* Central core media controls */}
            <div className="flex items-center justify-center gap-6 flex-[2]">
              <button 
                onClick={() => handleSkip(-10)}
                className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <SkipBack size={20} />
              </button>
              <button 
                className="w-12 h-12 flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all border border-transparent hover:border-gray-200 shadow-sm" 
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
                className={`w-14 h-14 rounded-full transition-all flex items-center justify-center shadow-md border-2 ${isRecording ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}`}
              >
                <Mic size={24} />
              </button>
              
              <button 
                onClick={() => handleSkip(10)}
                className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <SkipForward size={20} />
              </button>
            </div>

            {/* Right side tools */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><Settings2 size={18} /></button>
            </div>

          </div>

          {/* Timeline / Waveform */}
          <div 
            className={`flex-1 relative overflow-hidden bg-[#FAFAFA] ${(!audioUrl || isRecording) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100 transition-colors'}`}
            onClick={handleSeek}
          >
             {audioUrl && (
               <audio 
                 ref={audioRef}
                 src={audioUrl} 
                 onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                 onEnded={() => setIsPlaying(false)}
                 onLoadedMetadata={() => setTotalDuration(audioRef.current?.duration || 0)}
               />
             )}
             {/* Time markings top line */}
             <div className="absolute top-0 w-full h-6 border-b border-gray-200 flex justify-between text-[10px] text-gray-400 font-medium px-4 pt-1">
                {[0, 1, 2, 3, 4].map(ratio => {
                  const maxTime = Math.max(totalDuration, duration, 10);
                  return (
                    <span key={ratio} className={ratio === 0 ? "" : "border-l border-gray-300 pl-1"}>
                      {formatTimelineTime((maxTime / 4) * ratio)}
                    </span>
                  );
                })}
             </div>

             {/* Waveform graphic */}
             <div className="absolute top-8 left-0 w-full flex items-center justify-between px-4 h-24 opacity-60">
                  {Array.from({length: 150}).map((_, i) => {
                    const maxTime = Math.max(totalDuration, duration, 10);
                    const trackingDuration = isRecording ? activeDuration : (isPlaying ? currentTime : totalDuration);
                    const timeAtBar = (i / 150) * maxTime;
                    const isRecorded = (transcript && transcript !== "Transcription in progress...") || (trackingDuration > 0 && timeAtBar <= trackingDuration);
                    
                    let barHeight = 10;
                    if (isRecorded) {
                       if (waveformPeaks.length > 0) {
                          barHeight = waveformPeaks[i] || 10;
                       } else if (audioHistoryRef.current.length > 0) {
                          const historyIndex = Math.floor((timeAtBar / Math.max(duration, 1)) * (audioHistoryRef.current.length - 1));
                          barHeight = audioHistoryRef.current[Math.max(0, Math.min(historyIndex, audioHistoryRef.current.length - 1))] || 10;
                       } else {
                          barHeight = 50; 
                       }
                    }
                       
                    return (
                      <div 
                        key={i} 
                        className={`w-1 rounded-full transition-all duration-100 ${isRecorded ? 'bg-indigo-400' : 'bg-gray-300 h-[10%]'}`} 
                        style={isRecorded ? { height: `${barHeight}%` } : {}}
                      />
                    );
                  })}
             </div>
             
             {/* Progress handle/line */}
             <div 
                className="absolute top-6 bottom-0 w-0.5 bg-indigo-600 shadow-sm z-10 transition-all duration-100 ease-linear pointer-events-none"
                style={{ left: `${(currentTime / (totalDuration || 1)) * 100}%` }}
             >
                <div className="w-3 h-3 bg-indigo-600 rounded-full -ml-[5px] -mt-[6px] shadow-lg border-2 border-white" />
             </div>
          </div>
        </div>
      </div>

      {/* History Slide-out Sidebar */}
      {isHistoryOpen && (
        <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
           <div className="p-6 border-b border-gray-200 bg-white flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                 <History size={18} className="text-indigo-600" /> History
              </h3>
              <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                 <X size={20} />
              </button>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <Clock size={32} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No transcription history yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setAudioUrl(item.audio_url);
                      setTranscript(item.transcript || '');
                      setTotalDuration(item.duration);
                      setActiveTranscriptionId(item.id);
                      setIsHistoryOpen(false);
                      if (item.audio_url) generateWaveform(item.audio_url);
                      if (item.transcript === "Transcription in progress..." && item.job_name) {
                        startPolling(item.id, item.job_name);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${activeTranscriptionId === item.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'}`}
                  >
                    <div className="font-bold text-sm truncate mb-1">{item.title}</div>
                    <div className={`text-[10px] font-medium opacity-70 flex items-center gap-2 ${activeTranscriptionId === item.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                      <Clock size={10} /> {new Date(item.created_at).toLocaleDateString()} • {formatTimelineTime(item.duration)}
                    </div>
                    {item.transcript === "Transcription in progress..." && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-indigo-200">
                        <Loader2 size={10} className="animate-spin" /> Processing...
                      </div>
                    )}
                  </button>
                ))
              )}
           </div>
           <div className="p-4 bg-white border-t border-gray-200">
              <button 
                onClick={resetWorkspace}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
              >
                <Plus size={18} /> New Session
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
