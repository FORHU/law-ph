import React, { useCallback, useRef } from 'react';
import { CHAT_SENDER, S3_CONFIG } from '@/lib/constants';
import { extractTimeline, extractMindMap, cleanMessageText } from '@/lib/citation-parser';
import { processChunk, cleanAccumulatedText } from '@/lib/stream-response-processor';
import { Message } from './conversation-context';
import { uploadAndAnalyzeDocument, formatS3Url } from '@/lib/s3-utils';

interface UseSendMessageParams {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentConsultationId: string | number | null;
  setCurrentConsultationId: (id: string | number | null) => void;
  syncedConversationId?: string;
  chatSessionId: string;
  setChatSessionId: (id: string) => void;
  userId: string | undefined;
  fetchConversations: () => Promise<void>;
  mapCloudMessage: (msg: any) => Message;
  documentContext: string | null;
}

export function useSendMessage({
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  currentConsultationId,
  setCurrentConsultationId,
  syncedConversationId,
  chatSessionId,
  setChatSessionId,
  userId,
  fetchConversations,
  mapCloudMessage,
  documentContext
}: UseSendMessageParams) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = useCallback(async (
    text: string,
    targetConversationId?: string | number,
    explicitDocumentContext?: string | null,
    file?: File | null,
    skipAIResponse?: boolean,
    isAnalysisTrigger?: boolean
  ): Promise<string | number | undefined> => {
    if ((text.trim() || file) && !isLoading) {
      setIsLoading(true);
      const currentInput = text.trim();
      const newMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newMessage: Message = {
        id: newMessageId,
        text: isAnalysisTrigger ? "" : currentInput,
        sender: CHAT_SENDER.USER,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        fileAttachment: file ? { name: file.name, type: file.type, size: file.size } : undefined,
        status: skipAIResponse ? 'done' : undefined,
        isAnalysis: isAnalysisTrigger,
        hidden: false
      };

      let displayInput = currentInput;
      const metaMatch = currentInput.match(/\[ILM_META\]([\s\S]*?)\[\/ILM_META\]/);
      if (metaMatch) {
        try {
          const meta = JSON.parse(metaMatch[1]);
          newMessage.isAnalysis = meta.isAnalysis;
          newMessage.fileAttachments = meta.fileAttachments;
          newMessage.hidden = !!meta.hidden;
          if (meta.fileAttachment) newMessage.fileAttachment = meta.fileAttachment;
          displayInput = cleanMessageText(currentInput);
          newMessage.text = displayInput;
        } catch (e) {
          console.error("Failed to parse ILM_META in outgoing message", e);
        }
      }

      let sessionId = targetConversationId || syncedConversationId || currentConsultationId;
      setMessages(prev => [...prev, newMessage]);

      const processMessage = async (activeSessionId: string | number) => {
        let aiMessageId = isAnalysisTrigger ? `analysis-ai-${Date.now()}` : `temp-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
          let currentFileAttachment = newMessage.fileAttachment;
          let currentDocumentContext = explicitDocumentContext !== undefined ? explicitDocumentContext : documentContext;
          let finalPromptToAI = currentInput;
          const initialAiMessage = {
            id: aiMessageId,
            text: "",
            sender: CHAT_SENDER.AI,
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          };

          setMessages(prev => [...prev, initialAiMessage]);

          if (file) {
            try {
              const uploadData = await uploadAndAnalyzeDocument(
                file,
                process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
                !skipAIResponse
              );

              const s3BaseUrl = uploadData.url ? uploadData.url.split('?')[0] : null;
              const resolvedUrl = formatS3Url(uploadData.file_url || s3BaseUrl || `https://s3.amazonaws.com/${uploadData.s3_key}`);
              currentFileAttachment = {
                ...currentFileAttachment!,
                url: resolvedUrl,
                s3_key: uploadData.s3_key,
                ai_summary: uploadData.ai_summary || ""
              };

              currentDocumentContext = uploadData.ai_summary || "";

              if (isAnalysisTrigger) {
                const ai_summary = uploadData.ai_summary || "";
                const filename = file.name;
                const file_url = uploadData.file_url;
                const s3_key = uploadData.s3_key;

                const metaStr = JSON.stringify({
                  isAnalysis: true,
                  hidden: false,
                  fileAttachments: [{ name: filename, url: file_url, type: filename.split('.').pop() || 'file', s3_key, ai_summary }]
                });

                const isPreAnalyzed = ai_summary.includes('## ');
                finalPromptToAI = isPreAnalyzed
                  ? `[ILM_META]${metaStr}[/ILM_META][HIDDEN_INSTRUCTION]Analyze the document "${filename}". Based on the content:\n\n${ai_summary}\n\nProvide a comprehensive legal report.[/HIDDEN_INSTRUCTION]`
                  : `[ILM_META]${metaStr}[/ILM_META][HIDDEN_INSTRUCTION][Document Analysis Request] Analyze "${filename}". Provide a comprehensive summary.[/HIDDEN_INSTRUCTION]`;
              }

              setMessages(prev => prev.map(m => m.id === newMessageId ? { ...m, fileAttachment: currentFileAttachment, text: isAnalysisTrigger ? "" : m.text } : m));
            } catch (uploadErr) {
              console.error("File upload/analysis failed:", file.name, uploadErr);
            }
          }

          // Save user message via API
          const meta = { fileAttachment: currentFileAttachment, isAnalysis: isAnalysisTrigger, hidden: false };
          const contentWithMeta = isAnalysisTrigger
            ? finalPromptToAI
            : currentInput + (Object.values(meta).some(v => v !== undefined) ? `\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]` : "");

          const userMsgRes = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: activeSessionId, role: 'user', content: contentWithMeta })
          });

          let savedUserMessageId: string | null = null;
          if (userMsgRes.ok) {
            const savedUserMsg = await userMsgRes.json();
            if (savedUserMsg?.message) {
              savedUserMessageId = savedUserMsg.message.id ?? null;
              setMessages(prev => prev.map(m => m.id === newMessageId ? mapCloudMessage(savedUserMsg.message) : m));
            }
          }

          if (skipAIResponse) {
            const receiptText = `I've received your file "${currentFileAttachment?.name || 'document'}." What would you like me to do with it?\n\nHere are a few things I can help you with:\n\n- **Comprehensive Document Analysis**: Perform a deep-dive analysis.\n- **Key Data Extraction**: Identify critical dates, parties, and obligations.\n- **Generate Professional Brief**: Produce a structured case brief.\n\nJust tell me 👍`;

            const aiMsgRes = await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversation_id: activeSessionId, role: 'assistant', content: receiptText })
            });

            if (aiMsgRes.ok) {
              const savedAiMsg = await aiMsgRes.json();
              if (savedAiMsg?.message) {
                setMessages(prev => prev.map(m => m.id === aiMessageId ? mapCloudMessage(savedAiMsg.message) : m));
              }
            }

            return;
          }

          if (abortControllerRef.current) abortControllerRef.current.abort();
          const controller = new AbortController();
          abortControllerRef.current = controller;

          let currentChatSessionId = chatSessionId;

          const refreshSession = async (): Promise<string | null> => {
            try {
              const res = await fetch('/api/chat/session');
              if (res.ok) {
                const data = await res.json();
                if (data.session_id) {
                  const newId = data.session_id;
                  setChatSessionId(newId);
                  localStorage.setItem('chat_session_id', newId);
                  return newId;
                }
              }
            } catch (err) {
              console.error("[Session] Refresh failed:", err);
            }
            return null;
          };

          const doFetch = async (sId: string): Promise<Response> => {
            const baseInput = finalPromptToAI || (file ? `Analyze the attached document: ${file.name}` : "");

            return fetch('/api/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_input: baseInput,
                session_id: sId,
                document_context: currentDocumentContext
              }),
              signal: controller.signal
            });
          };

          let accumulatedText = "";
          let relatedCases: any[] | undefined;
          let timeline: any[] | undefined;
          let mindMap: any | undefined;
          let aiResponseSuccessful = false;
          let retryCount = 0;
          const MAX_RETRIES = 3;

          // Throttle UI updates to ~20/sec. Running extractTimeline, extractMindMap,
          // cleanAccumulatedText, and setMessages on every single chunk causes O(n²)
          // work and hundreds of React re-renders for a long response.
          const RENDER_INTERVAL_MS = 50;
          let lastRenderTime = 0;

          const flushToUI = (isFinal: boolean) => {
            const now = Date.now();
            if (!isFinal && now - lastRenderTime < RENDER_INTERVAL_MS) return;
            lastRenderTime = now;
            timeline = extractTimeline(accumulatedText);
            mindMap = extractMindMap(accumulatedText);
            const cleanText = cleanAccumulatedText(accumulatedText);
            setMessages(prev => prev.map(m =>
              m.id === aiMessageId
                ? { ...m, text: cleanText, rawContent: accumulatedText, relatedCases, timeline, mindMap }
                : m
            ));
          };

          while (retryCount < MAX_RETRIES && !aiResponseSuccessful) {
            try {
              if (!currentChatSessionId) {
                currentChatSessionId = await refreshSession() || "";
              }

              let response = await doFetch(currentChatSessionId || "");
              if (response.status === 404 || response.status === 400 || response.status === 403) {
                currentChatSessionId = await refreshSession() || "";
                if (currentChatSessionId) response = await doFetch(currentChatSessionId);
              }

              if (!response.ok) throw new Error("Failed to connect to AI");
              if (!response.body) throw new Error("No response body");

              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              accumulatedText = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const raw = decoder.decode(value, { stream: true });

                if (raw.includes("Unknown session")) throw new Error("UNKNOWN_SESSION");
                if (raw.startsWith("[Error]") || raw.startsWith("Error:")) {
                  accumulatedText = raw.startsWith("[Error]")
                    ? "Error: " + raw.replace("[Error]", "")
                    : raw;
                  aiResponseSuccessful = true;
                  break;
                }

                const processed = processChunk(raw);
                accumulatedText += processed.text;

                flushToUI(false);
              }
              flushToUI(true); // always render the complete final text
              aiResponseSuccessful = true;
              setIsLoading(false); // unlock input now; DB save below is a side-effect
            } catch (err: any) {
              if (err.message === "UNKNOWN_SESSION") {
                retryCount++;
                currentChatSessionId = await refreshSession() || "";
                if (retryCount >= MAX_RETRIES) throw new Error("Max retries exceeded");
              } else {
                throw err;
              }
            }
          }

          // Related Cases search is now handled exclusively by message-list/index.tsx
          // via a single fetchRelatedCases path with in-flight deduplication.
          // This avoids a race condition where two simultaneous Postgres queries fired
          // (one here, one from the tab click) with no coordination.

          // Save AI response via API
          const rawAiText = accumulatedText.trim();
          const aiSaveRes = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: activeSessionId, role: 'assistant', content: rawAiText, parent_message_id: savedUserMessageId })
          });

          if (aiSaveRes.ok) {
            const savedAiMsg = await aiSaveRes.json();
            if (savedAiMsg?.message?.id) {
              // Only update the temp ID to the persisted DB ID.
              // All content (text, timeline, relatedCases, mindMap) was already set
              // correctly during streaming — re-running mapCloudMessage here would
              // re-execute all parsing functions on the full response text synchronously,
              // freezing the main thread.
              setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, id: savedAiMsg.message.id } : m));
            }
          }
        } catch (error: any) {
          if (error.name === 'AbortError') return;
          console.error("AI Stream Error:", error);
          setMessages(prev => prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: "I'm sorry, I'm having trouble connecting right now." }
              : m
          ));
        } finally {
          setIsLoading(false);
          if (abortControllerRef.current?.signal.aborted) abortControllerRef.current = null;
        }
      };

      if (!sessionId || typeof sessionId === 'number') {
        const conversationTitle = currentInput.substring(0, 50) || (file ? `Document: ${file.name}` : "New Consultation");
        const convRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: conversationTitle })
        });

        if (!convRes.ok) {
          setIsLoading(false);
          return;
        }

        const { conversation } = await convRes.json();
        sessionId = conversation.id;
        setCurrentConsultationId(sessionId);
        await fetchConversations();
      }

      if (sessionId) processMessage(sessionId);

      return sessionId ?? undefined;
    }
  }, [
    isLoading,
    currentConsultationId,
    messages,
    setMessages,
    setIsLoading,
    setCurrentConsultationId,
    syncedConversationId,
    chatSessionId,
    setChatSessionId,
    userId,
    fetchConversations,
    mapCloudMessage,
    documentContext
  ]);

  const abortMessage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { handleSendMessage, abortMessage, abortControllerRef };
}
