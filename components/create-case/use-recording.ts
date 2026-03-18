'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface RecordingResult {
  id: string;
  url: string;
  blob: Blob;
}

export function useCaseRecording() {
  const [isRecording, setIsRecording] = useState(false); // Speech-to-text
  const [isAudioRecording, setIsAudioRecording] = useState(false); // Raw audio
  const [recordings, setRecordings] = useState<RecordingResult[]>([]);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
            alert('Microphone access is denied.');
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
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
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
      if (isAudioRecording) return alert('Stop audio recording first.');
      if (!recognitionRef.current) return alert('Speech recognition not supported.');
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
      if (isRecording) return alert('Stop transcription first.');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setRecordings(prev => [...prev, { id: crypto.randomUUID(), url, blob }]);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsAudioRecording(true);
      } catch (err) {
        alert('Could not access microphone.');
      }
    }
  }, [isRecording, isAudioRecording]);

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
