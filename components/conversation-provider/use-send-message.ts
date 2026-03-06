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

  const handleSendMessage = useCallback(async (text: string) => {
    if (text.trim() && !isLoading) {
      setIsLoading(true); 
      const currentInput = text.trim();
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: currentInput,
        sender: CHAT_SENDER.USER,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      
      let sessionId = syncedConversationId || currentConsultationId;

      setMessages(prev => [...prev, newMessage]);

      if (!sessionId || typeof sessionId === 'number') {
        // Check if this is from the wizard and create a smart title
        let conversationTitle = currentInput.substring(0, 50);
        
        try {
          const wizardTitleData = sessionStorage.getItem('wizard_title_data');
          if (wizardTitleData) {
            const data = JSON.parse(wizardTitleData);
            // Create a concise title: "UserType - Legal Area - Issue"
            const parts = [data.userType, data.legalArea];
            if (data.specificIssue) {
              parts.push(data.specificIssue);
            }
            conversationTitle = parts.join(' - ');
            // Clean up after use
            sessionStorage.removeItem('wizard_title_data');
          }
        } catch (e) {
          console.error("Failed to parse wizard title data", e);
          // Fall back to truncation if parsing fails
        }
        
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            title: conversationTitle
          })
          .select()
          .single();

        if (convError) {
          console.error("Failed to create conversation:", convError);
          setIsLoading(false);
          return;
        }
        
        sessionId = convData.id;
        setCurrentConsultationId(sessionId);
        await fetchConversations(); // Refresh sidebar
      }

      // 2. Save user message to cloud
      
      const { data: savedUserMsg, error: userMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: sessionId,
          role: 'user',
          content: currentInput
        })
        .select()
        .single();

      if (!userMsgError && savedUserMsg) {
        setMessages(prev => prev.map(m => m.id === newMessage.id ? mapCloudMessage(savedUserMsg) : m));
      }

      try {
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
        
        // Helper to refresh session silently
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

        // 1. Initial check: If no session ID, try to get one.
        if (!currentChatSessionId) {
          currentChatSessionId = await refreshSession() || "";
        }

        let accumulatedText = "";
        let retryCount = 0;
        const maxRetries = 2; // Allow up to 2 retries for session issues

        const executeStream = async (session: string): Promise<boolean> => {
          try {
            // Prepend [Legal AI] so the backend activates Legal AI persona (legal prompt + search_legal, formatted citations)
            const payloadUserInput = `[Legal AI] ${currentInput}\n\n[SYSTEM RULE - CRITICAL]: If your response includes any form of step-by-step legal plan, strategy, or action timeline, you MUST append it EXCLUSIVELY in the following machine-readable format below your prose answer. Do NOT write it as a numbered list, bullet points, or any other Markdown format. The ONLY accepted format is:\n[TIMELINE]\n[{"title":"Created Case","date":"${new Date().toISOString().split('T')[0]}","description":"Case was opened.","status":"completed"}]\n[/TIMELINE]\nThe first item MUST always be {"title":"Created Case","date":"${new Date().toISOString().split('T')[0]}","description":"Case was opened.","status":"completed"}. Do not include any timeline text in the conversation prose itself.`;
            const response = await fetch('/api/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_input: payloadUserInput,
                session_id: session || `session_${Date.now()}`,
              }),
              signal: controller.signal
            });

            // Handle non-OK responses (like 401/403 session errors)
            if (!response.ok) {
              if ((response.status === 401 || response.status === 403 || response.status === 500) && retryCount < maxRetries) {
                retryCount++;
                console.warn(`[Session] POST failed with ${response.status}. Refreshing and retrying... (${retryCount})`);
                const nextSession = await refreshSession();
                if (nextSession) return await executeStream(nextSession);
              }
              throw new Error(`Failed to connect to AI: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            accumulatedText = "";

            if (!reader) return false;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              let chunk = decoder.decode(value, { stream: true });
              if (chunk.includes("__END__")) {
                chunk = chunk.replace("__END__", "");
              }
              
              if (chunk.startsWith("[Error]")) {
                if (chunk.includes("Unknown session") || chunk.includes("expired") || chunk.includes("invalid")) {
                  console.warn("[Session] Session error detected in stream chunk.");
                  if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`[Session] Retrying stream... Attempt ${retryCount}`);
                    const newSessionId = await refreshSession();
                    if (newSessionId) {
                      // Recursive retry
                      return await executeStream(newSessionId);
                    }
                  }
                  accumulatedText = "Session issue encountered. Please refresh the page.";
                } else {
                  accumulatedText = "Error: " + chunk.replace("[Error]", "");
                }
                return false;
              }

              if (chunk.startsWith("[Tool]")) continue;

              accumulatedText += chunk;

              // Strip timeline JSON/Markdown in real-time so it never shows in the chat bubble
              const strippedForDisplay = (() => {
                let t = accumulatedText;
                // Cut at [TIMELINE] tag
                const tagIdx = t.search(/\[TIMELINE\]/i);
                // Cut at JSON array start
                const arrM = t.match(/\[\s*\{\s*["']title["']/i);
                const arrIdx = arrM?.index ?? -1;
                // Cut at markdown timeline heading (e.g. "Timeline of Actionable Steps\n1.")
                const mdM = t.match(/(?:\n|^)[^\n]{0,60}(?:timeline|actionable steps)[^\n]{0,60}\n\s*(?:1\.|\*)[\s\S]*/i);
                const mdIdx = mdM?.index ?? -1;
                let cutIdx = t.length;
                if (tagIdx !== -1) cutIdx = Math.min(cutIdx, tagIdx);
                if (arrIdx !== -1) cutIdx = Math.min(cutIdx, arrIdx);
                if (mdIdx !== -1) cutIdx = Math.min(cutIdx, mdIdx);
                if (cutIdx !== t.length) {
                  t = t.substring(0, cutIdx).trim();
                  t = t.replace(/(?:\n|^)?\s*\*?\*?(?:Proposed |Given |Following )?Timeline[\s\S]{0,200}?:?\*?\*?\s*(?:```(?:json)?)?\s*$/i, '').trim();
                  t = t.replace(/\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/i, '').trim();
                }
                return t;
              })();

              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                // Add debug logging
                console.log(`[Stream Debug] prev length: ${prev.length}, lastId: ${updated[lastIdx]?.id}, targetId: ${aiMessageId}`);
                if (updated[lastIdx]?.id === aiMessageId) {
                  updated[lastIdx] = { ...updated[lastIdx], text: strippedForDisplay };
                }
                return updated;
              });
            }
            return true;
          } catch (err: any) {
             if (err.name === 'AbortError') throw err;
             console.error("[Stream] Execution error:", err);
             throw err;
          }
        };

        const success = await executeStream(currentChatSessionId);
        
        if (success) {

          // Parse citations from the completed AI response
          const sources = extractLegalSources(accumulatedText);
          const relatedCases = extractRelatedCases(accumulatedText);
          const timeline = extractTimeline(accumulatedText);
          
          let cleanText = accumulatedText.trim();
          
          // Cut off the timeline portion brutally to guarantee it doesn't show in chat
          const cutIdxTimelineTag = cleanText.search(/\[TIMELINE\]/i);
          const arrayMatch = cleanText.match(/\[\s*\{\s*["']title["']/i);
          const cutIdxJsonStart = arrayMatch?.index ?? -1;
          const mdMatchFinal = cleanText.match(/(?:\n|^)[^\n]{0,60}(?:timeline|actionable steps)[^\n]{0,60}\n\s*(?:1\.|\*)[\s\S]*/i);
          const cutIdxMd = mdMatchFinal?.index ?? -1;
          
          let finalIdx = cleanText.length;
          if (cutIdxTimelineTag !== -1) finalIdx = Math.min(finalIdx, cutIdxTimelineTag);
          if (cutIdxJsonStart !== -1) finalIdx = Math.min(finalIdx, cutIdxJsonStart);
          if (cutIdxMd !== -1) finalIdx = Math.min(finalIdx, cutIdxMd);
          
          if (finalIdx !== cleanText.length) {
            cleanText = cleanText.substring(0, finalIdx).trim();
            
            // Also chop off any dangling "Proposed Timeline:" labels right before the cut
            cleanText = cleanText.replace(/(?:\n|^)?\s*\*?\*?(?:Proposed )?Timeline[\s\S]*?:?\*?\*?\s*(?:```(?:json)?)?\s*$/i, '').trim();
            cleanText = cleanText.replace(/(?:\n|^)?\s*\*?\*?Here is[\s\S]*?(?:timeline|plan)[\s\S]*?:?\*?\*?\s*$/i, '').trim();
            cleanText = cleanText.replace(/\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/i, '').trim();
          }

          setMessages(prev => prev.map(m => m.id === aiMessageId ? { 
            ...m, 
            text: cleanText,
            sources,
            relatedCases,
            timeline
          } : m));

          // 3. Save AI message to cloud
          const { data: savedAiMsg, error: aiMsgError } = await supabase
            .from("messages")
            .insert({
              conversation_id: sessionId,
              role: 'assistant',
              content: accumulatedText
            })
            .select()
            .single();

          if (!aiMsgError && savedAiMsg) {
            setMessages(prev => prev.map(m => m.id === aiMessageId ? mapCloudMessage(savedAiMsg) : m));
          }
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
