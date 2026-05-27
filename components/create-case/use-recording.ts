'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlert } from '@/components/alert-provider';

interface RecordingResult {
  id: string;
  url: string;
  blob: Blob;
  duration: number;
}

export function useCaseRecording() {
  const { showAlert } = useAlert();
  const [isRecording, setIsRecording] = useState(false); // Speech-to-text
  const [isAudioRecording, setIsAudioRecording] = useState(false); // Raw audio
  const [recordings, setRecordings] = useState<RecordingResult[]>([]);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + text;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            showAlert('Microphone access is denied.', 'Permission Denied');
          }
        }
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => setIsRecording(false);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording || isAudioRecording) {
      setDuration(0);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, isAudioRecording]);

  const toggleTranscription = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      try { recognitionRef.current?.stop(); } catch (e) {}
    } else {
      if (isAudioRecording) { showAlert('Stop audio recording first.', 'Recording Active'); return; }
      if (!recognitionRef.current) { showAlert('Speech recognition is not supported in this browser.', 'Not Supported'); return; }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        setIsRecording(false);
      }
    }
  }, [isRecording, isAudioRecording]);

  const toggleAudioRecording = useCallback(async () => {
    if (isAudioRecording) {
      setIsAudioRecording(false);
      mediaRecorderRef.current?.stop();
    } else {
      if (isRecording) { showAlert('Stop transcription first.', 'Recording Active'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          
          console.log(`[Use-Recording] Recording stopped. Duration: ${finalDuration}s, Size: ${blob.size} bytes`);

          if (blob.size === 0) {
            console.error('[Use-Recording] Recorded blob is empty. Check microphone permissions or input.');
            showAlert('Recording contains no audio data. Please ensure your microphone is working and try again.', 'Recording Error');
          } else {
            setRecordings(prev => [...prev, { 
              id: crypto.randomUUID(), 
              url, 
              blob, 
              duration: finalDuration 
            }]);
          }
          
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsAudioRecording(true);
      } catch (err) {
        showAlert('Could not access microphone. Please check your browser permissions.', 'Microphone Error');
      }
    }
  }, [isRecording, isAudioRecording, showAlert]);

  const removeRecording = useCallback((id: string) => {
    setRecordings(prev => {
      const rec = prev.find(r => r.id === id);
      if (rec) URL.revokeObjectURL(rec.url);
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const clearRecordings = useCallback(() => {
    recordings.forEach(r => URL.revokeObjectURL(r.url));
    setRecordings([]);
  }, [recordings]);

  return {
    isRecording,
    isAudioRecording,
    recordings,
    duration,
    transcript,
    toggleTranscription,
    toggleAudioRecording,
    removeRecording,
    clearRecordings,
    setTranscript // To allow clearing it after handling
  };
}
