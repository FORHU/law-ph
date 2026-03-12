// Message Sending Logic Hook
import { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CHAT_SENDER } from '@/lib/constants';
import { extractLegalSources, extractRelatedCases, extractTimeline } from '@/lib/citation-parser';
import { Message } from './conversation-context';

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
  supabase: ReturnType<typeof createClient>;
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
  supabase
}: UseSendMessageParams) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = useCallback(async (text: string, targetConversationId?: string | number): Promise<string | number | undefined> => {
    if (text.trim() && !isLoading) {
      setIsLoading(true); 
      const currentInput = text.trim();
      const newMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: currentInput,
        sender: CHAT_SENDER.USER,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      
      let sessionId = targetConversationId || syncedConversationId || currentConsultationId;
      setMessages(prev => [...prev, newMessage]);

      // Define internal async function to process the rest of the flow in the background
      const processMessage = async (activeSessionId: string | number) => {
        try {
          // 1. Save user message to cloud
          const { data: savedUserMsg, error: userMsgError } = await supabase
            .from("messages")
            .insert({
              conversation_id: activeSessionId,
              role: 'user',
              content: currentInput
            })
            .select()
            .single();

          if (!userMsgError && savedUserMsg) {
            setMessages(prev => prev.map(m => m.id === newMessage.id ? mapCloudMessage(savedUserMsg) : m));
          }

          // 2. Prepare AI message
          const aiMessageId = `temp-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const initialAiMessage = {
            id: aiMessageId,
            text: "",
            sender: CHAT_SENDER.AI,
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          };

          setMessages(prev => [...prev, initialAiMessage]);

          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          const controller = new AbortController();
          abortControllerRef.current = controller;

          let currentChatSessionId = chatSessionId;
          
          const refreshSession = async (): Promise<string | null> => {
            console.log("[Session] Refreshing chat session...");
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
             const payloadUserInput = `[Legal AI] ${currentInput}\n\n[SYSTEM RULE - CRITICAL]: If your response includes any form of step-by-step legal plan, strategy, or action timeline, you MUST append it EXCLUSIVELY in the following machine-readable format below your prose answer. Do NOT write it as a numbered list, bullet points, or any other Markdown format. The ONLY accepted format is:\n[TIMELINE]\n[{"title":"Created Case","date":"${new Date().toISOString().split('T')[0]}","description":"Case was opened.","status":"completed"}]\n[/TIMELINE]\nThe first item MUST always be {"title":"Created Case","date":"${new Date().toISOString().split('T')[0]}","description":"Case was opened.","status":"completed"}. Do not include any timeline text in the conversation prose itself.`;
             return fetch('/api/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                user_input: payloadUserInput, 
                session_id: sId 
              }),
              signal: controller.signal
            });
          };

          if (!currentChatSessionId) {
            currentChatSessionId = await refreshSession() || "";
          }

          let response = await doFetch(currentChatSessionId);
          if (response.status === 404 || response.status === 400) {
            const newId = await refreshSession();
            if (newId) response = await doFetch(newId);
          }

          if (!response.ok) throw new Error("Failed to connect to AI");
          if (!response.body) throw new Error("No response body");

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulatedText = "";
          let sources: any[] | undefined;
          let relatedCases: any[] | undefined;
          let timeline: any[] | undefined;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            let chunk = decoder.decode(value, { stream: true });
            chunk = chunk.replace(/^(?:\[Tool\][^\n]*\n?)+/, "");

            if (chunk.startsWith("[Error]")) {
              accumulatedText = "Error: " + chunk.replace("[Error]", "");
              break;
            }

            if (chunk.startsWith("[Sources]")) {
              const prefix = "[Sources] ";
              const rest = chunk.slice(prefix.length);
              const firstBrace = rest.indexOf("{");
              if (firstBrace === 0) {
                let depth = 0;
                let end = -1;
                for (let i = 0; i < rest.length; i++) {
                  if (rest[i] === "{") depth++;
                  else if (rest[i] === "}") {
                    depth--;
                    if (depth === 0) {
                      end = i + 1;
                      break;
                    }
                  }
                }
                if (end !== -1) {
                  chunk = rest.slice(end).replace(/^\s*\n?/, "").trimStart();
                }
              }
            }

            accumulatedText += chunk;

            sources = extractLegalSources(accumulatedText);
            relatedCases = extractRelatedCases(accumulatedText);
            timeline = extractTimeline(accumulatedText);
            
            let cleanText = accumulatedText.trim();
            cleanText = cleanText.replace(/\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/i, '').trim();
            cleanText = cleanText.replace(/(?:\n|^)?\s*\*?\*?(?:Proposed |Given |Following )?Timeline[\s\S]{0,200}?:?\*?\*?\s*(?:```(?:json)?)?\s*$/i, '').trim();
            cleanText = cleanText.replace(/(?:\n|^)?\s*\*?\*?Here is[\s\S]*?(?:timeline|plan)[\s\S]*?:?\*?\*?\s*$/i, '').trim();

            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx]?.id === aiMessageId) {
                updated[lastIdx] = { 
                  ...updated[lastIdx], 
                  text: cleanText,
                  sources,
                  relatedCases,
                  timeline
                };
              }
              return updated;
            });
          }

          // 3. Final cleanup and save AI message
          let finalCleanText = accumulatedText.trim();
          finalCleanText = finalCleanText.replace(/\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/i, '').trim();
          finalCleanText = finalCleanText.replace(/(?:\n|^)?\s*\*?\*?(?:Proposed |Given |Following )?Timeline[\s\S]{0,200}?:?\*?\*?\s*(?:```(?:json)?)?\s*$/i, '').trim();
          finalCleanText = finalCleanText.replace(/(?:\n|^)?\s*\*?\*?Here is[\s\S]*?(?:timeline|plan)[\s\S]*?:?\*?\*?\s*$/i, '').trim();

          const { data: savedAiMsg, error: aiMsgError } = await supabase
            .from("messages")
            .insert({
              conversation_id: activeSessionId,
              role: 'assistant',
              content: finalCleanText
            })
            .select()
            .single();

          if (!aiMsgError && savedAiMsg) {
            setMessages(prev => prev.map(m => m.id === aiMessageId ? mapCloudMessage(savedAiMsg) : m));
          }
        } catch (error: any) {
          if (error.name === 'AbortError') return;
          console.error("AI Stream Error:", error);
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]) {
              updated[lastIdx] = { ...updated[lastIdx], text: "I'm sorry, I'm having trouble connecting right now. Please try again later." };
            }
            return updated;
          });
        } finally {
          setIsLoading(false);
          if (abortControllerRef.current?.signal.aborted) {
            abortControllerRef.current = null;
          }
        }
      };

      if (!sessionId || typeof sessionId === 'number') {
        let conversationTitle = currentInput.substring(0, 50);
        try {
          const wizardTitleData = sessionStorage.getItem('wizard_title_data');
          if (wizardTitleData) {
            const data = JSON.parse(wizardTitleData);
            const parts = [data.userType, data.legalArea];
            if (data.specificIssue) parts.push(data.specificIssue);
            conversationTitle = parts.join(' - ');
            sessionStorage.removeItem('wizard_title_data');
          }
        } catch (e) {}
        
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title: conversationTitle })
          .select()
          .single();

        if (convError) {
          console.error("Failed to create conversation:", convError);
          setIsLoading(false);
          return;
        }
        
        sessionId = convData.id;
        setCurrentConsultationId(sessionId);
        await fetchConversations(); 
      }

      // Kick off background task
      if (sessionId) {
        processMessage(sessionId);
      }
      
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
    supabase
  ]);

  const abortMessage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    handleSendMessage,
    abortMessage,
    abortControllerRef
  };
}
