'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Mic, Divide, ZoomIn, ZoomOut, Bookmark, Upload,
  Wand2, Scissors, Settings2, Subtitles, Video, FileAudio, Users, Image as ImageIcon, CheckCircle, PenTool, Layout, Menu
} from 'lucide-react';
import { uploadToS3Direct } from '@/lib/s3-utils';
import { startAWSBatchTranscription } from '@/lib/aws-transcribe-utils';

export default function TranscribeWorkspace({ 
  onOpenSidebar,
  isSidebarOpen = false
}: { 
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
}) {
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
  const [duration, setDuration] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0); // smooth tick for visualizer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Visualizer Live Tracking
  const audioHistoryRef = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading to S3...");
    try {
      const s3Data = await uploadToS3Direct(file, `upload-${Date.now()}-${file.name}`);
      console.log("Uploaded to S3", s3Data);
      setUploadStatus("Upload complete. Starting AI Transcription...");
      
      // Rely on CloudFront link for robust playback
      if (s3Data.file_url) setAudioUrl(s3Data.file_url);

      const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";
      const s3Uri = `s3://${bucketName}/${s3Data.s3_key}`;
      
      const transcriptJob = await startAWSBatchTranscription(s3Uri, `upload-${Date.now()}`);
      
      if (transcriptJob) {
        console.log("Batch transcription started:", transcriptJob);
        setUploadStatus("Transcription job successfully initiated!");
      } else {
        setUploadStatus("Failed! AWS Access Denied (Check IAM Permissions).");
      }
    } catch (err) {
      console.error("Failed to upload file", err);
      setUploadStatus("Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      mediaRecorderRef.current?.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log(`[Transcribe] Recording stopped. Duration: ${finalDuration}s, Size: ${blob.size} bytes`);

          if (analyzerTimerRef.current) clearInterval(analyzerTimerRef.current);
          if (audioContextRef.current) audioContextRef.current.close();
          
          if (blob.size === 0) {
            alert('Recording contains no audio data.');
          } else {
            // Upload to S3 as requested
            try {
               const s3Data = await uploadToS3Direct(blob, `transcribe-${Date.now()}.webm`);
               console.log("Uploaded to S3", s3Data);
               
               // Rely on CloudFront link for robust playback
               if (s3Data.file_url) setAudioUrl(s3Data.file_url);

               const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";
               const s3Uri = `s3://${bucketName}/${s3Data.s3_key}`;
               
               const transcriptJob = await startAWSBatchTranscription(s3Uri, `record-${Date.now()}`);
               if (transcriptJob) {
                  console.log("Batch transcription started:", transcriptJob);
               } else {
                  console.warn("AWS Transcribe failed: Check your IAM permissions for nxp-s3");
                  alert("Transcription Failed: Your AWS IAM User is missing 'AmazonTranscribeFullAccess' permissions.");
               }
            } catch (err) {
               console.error("Failed to upload recording or start transcribe", err);
            }
          }
          stream.getTracks().forEach(track => track.stop());
        };

        startTimeRef.current = Date.now();
        setDuration(0);
        setActiveDuration(0);
        audioHistoryRef.current = [];
        
        // Launch live Voice Level Analyzer for wave accuracy
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
           const audioContext = new AudioContextClass();
           const analyser = audioContext.createAnalyser();
           const source = audioContext.createMediaStreamSource(stream);
           source.connect(analyser);
           analyser.fftSize = 256;
           audioContextRef.current = audioContext;
           
           const bufferLength = analyser.frequencyBinCount;
           const dataArray = new Uint8Array(bufferLength);
           
           analyzerTimerRef.current = setInterval(() => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for(let i=0; i<bufferLength; i++) sum += dataArray[i];
              const avg = sum / bufferLength;
              const volume = Math.max(10, Math.min(100, (avg / 64) * 100)); // calculate dynamic sensitivity
              audioHistoryRef.current.push(volume);
              setActiveDuration((Date.now() - startTimeRef.current) / 1000);
           }, 100);
        }

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
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
        
        {/* Text / Script Editor */}
        <div className="flex-1 overflow-y-auto p-12 pr-24 relative">
          {transcript === '' && !isRecording && !isUploading && !uploadStatus && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                 <Mic size={32} className="text-gray-400" />
               </div>
               <h2 className="text-2xl font-bold text-gray-800 mb-2">Start Transcribing</h2>
               <p className="text-gray-500 max-w-sm mb-8">Record live audio or upload an existing file to generate a transcript.</p>
               
               <div className="flex gap-4">
                 <button 
                   onClick={toggleRecording}
                   className="flex items-center gap-2 bg-[#8B4564] hover:bg-[#723852] text-white px-6 py-3 rounded-xl font-medium transition-colors"
                 >
                   <Mic size={18} /> Record Audio
                 </button>
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
                 >
                   <Upload size={18} /> Upload File
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="audio/*,video/*"
                   onChange={handleFileUpload}
                 />
               </div>
            </div>
          )}

          {(isUploading || uploadStatus) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <div className="mb-4 text-gray-500">
                {isUploading ? <Upload size={32} className="animate-bounce" /> : <CheckCircle size={32} className="text-green-500" />}
              </div>
              <h2 className="text-xl font-medium text-gray-800 mb-2">{isUploading ? 'Uploading File...' : 'Done'}</h2>
              <p className="text-gray-500">{uploadStatus}</p>
            </div>
          )}

          {(transcript || isRecording) && (
             <>
               <h1 className="text-4xl font-semibold text-gray-900 mb-8 font-serif">Transcription</h1>
               {transcript && (
                 <div className="text-sm font-semibold text-gray-400 mb-2 hover:text-indigo-600 cursor-pointer w-max uppercase tracking-wider">
                   Add speaker
                 </div>
               )}
               {isRecording && !transcript && (
                 <div className="text-gray-400 italic flex items-center gap-2 mb-4">
                   <span className="relative flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                   </span>
                   Recording...
                 </div>
               )}
               <div className="prose prose-lg max-w-none text-gray-700 leading-loose">
                 {transcript.split('\n\n').map((paragraph, idx) => (
                   <p key={idx} className="mb-6">{paragraph}</p>
                 ))}
               </div>
             </>
          )}
        </div>

        {/* Bottom Audio/Video Transport Area */}
        <div className="h-48 border-t border-gray-200 flex flex-col bg-gray-50">
          
          {/* Controls Bar */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-gray-200 bg-white shadow-sm z-10 w-full">
            
            {/* Left side timing indicator */}
            <div className="flex-1 flex items-center">
               <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 shadow-inner">
                  {formatTimelineTime(duration)} <span className="text-gray-400 font-normal">/ {formatTimelineTime(duration)}</span>
               </span>
            </div>

            {/* Central core media controls */}
            <div className="flex items-center justify-center gap-6 flex-[2]">
              <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><SkipBack size={20} /></button>
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
              
              <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><SkipForward size={20} /></button>
            </div>

            {/* Right side tools */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><Settings2 size={18} /></button>
            </div>

          </div>

          {/* Timeline / Waveform Mock */}
          <div className="flex-1 relative overflow-hidden bg-[#FAFAFA]">
             {/* Time markings top line */}
             <div className="absolute top-0 w-full h-6 border-b border-gray-200 flex justify-between text-[10px] text-gray-400 font-medium px-4 pt-1">
                {[0, 1, 2, 3, 4].map(ratio => (
                  <span key={ratio} className={ratio === 0 ? "" : "border-l border-gray-300 pl-1"}>
                    {formatTimelineTime((Math.max(duration, 10) / 4) * ratio)}
                  </span>
                ))}
             </div>

             {/* Waveform graphic mock */}
             <div className="absolute top-8 left-0 w-full flex items-center justify-between px-4 h-24 opacity-60">
                 {/* Creating dummy vertical bars to simulate a waveform deterministically */}
                 {Array.from({length: 150}).map((_, i) => {
                    const trackingDuration = isRecording ? activeDuration : duration;
                    const timeAtBar = (i / 150) * Math.max(duration, 10);
                    const isRecorded = transcript.length > 0 || (trackingDuration > 0 && timeAtBar <= trackingDuration);
                    
                    let barHeight = 10;
                    if (isRecorded) {
                       if (audioHistoryRef.current.length > 0) {
                          // Tie visual representation back to live collected volume history bucket!
                          const historyIndex = Math.floor(timeAtBar * 10);
                          barHeight = audioHistoryRef.current[Math.min(historyIndex, audioHistoryRef.current.length - 1)] || 10;
                       } else {
                          barHeight = 50; // fallback block height for uploaded files without history
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
          </div>

        </div>

      </div>

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
      
    </div>
  );
}
