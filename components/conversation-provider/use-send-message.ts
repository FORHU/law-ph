// Message Sending Logic Hook
import { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CHAT_SENDER } from '@/lib/constants';
import { extractLegalSources, extractRelatedCases } from '@/lib/citation-parser';
import { Message } from './conversation-context';

interface UseSendMessageParams {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentConsultationId: string | number | null;
  setCurrentConsultationId: (id: string | number | null) => void;
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
      const currentInput = text.trim();
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newMessage = {
        id: Date.now(),
        text: currentInput,
        sender: CHAT_SENDER.USER,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      
      let sessionId = currentConsultationId;

      // 1. Create conversation if it doesn't exist
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
          return;
        }
        
        sessionId = convData.id;
        setCurrentConsultationId(sessionId);
        await fetchConversations(); // Refresh sidebar
      }

      // 2. Save user message to cloud
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
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

      setIsLoading(true);
      
      try {
        const aiMessageId = Date.now() + 1;
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

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_input: `[Legal AI] ${currentInput}`,
            session_id: chatSessionId || `session_${Date.now()}`,
          }),
          signal: controller.signal
        });

        if (!response.ok) throw new Error("Failed to connect to AI");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            let chunk = decoder.decode(value, { stream: true });
            if (chunk.includes("__END__")) {
              chunk = chunk.replace("__END__", "");
            }
            
            if (chunk.startsWith("[Error]")) {
              if (chunk.includes("Unknown session")) {
                console.warn("[Session] Unknown session detected in stream. Clearing cache.");
                localStorage.removeItem('chat_session_id');
                setChatSessionId('');
                accumulatedText = "Session expired. Reconnecting...";
                
                // Optional: Attempt to re-fetch session immediately
                fetch('/api/chat/session')
                  .then(res => res.json())
                  .then(data => {
                    if (data.session_id) {
                      localStorage.setItem('chat_session_id', data.session_id);
                      setChatSessionId(data.session_id);
                      console.log("[Session] Session re-initialized automatically.");
                    }
                  })
                  .catch(err => console.error("Failed to re-initialize session:", err));
              } else {
                accumulatedText = "Error: " + chunk.replace("[Error]", "");
              }
              break;
            }

            if (chunk.startsWith("[Tool]")) continue;

            accumulatedText += chunk;

            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx]?.id === aiMessageId) {
                updated[lastIdx] = { ...updated[lastIdx], text: accumulatedText };
              }
              return updated;
            });
          }

          // Parse citations from the completed AI response
          const sources = extractLegalSources(accumulatedText);
          const relatedCases = extractRelatedCases(accumulatedText);
          
          const finalMessages = [...updatedMessages, { 
            ...initialAiMessage, 
            text: accumulatedText,
            sources,
            relatedCases
          }];
          setMessages(finalMessages);

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
            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx]?.sender === CHAT_SENDER.AI) {
                const mappedMsg = mapCloudMessage(savedAiMsg);
                // Re-parse citations for the mapped message
                updated[lastIdx] = {
                  ...mappedMsg,
                  sources,
                  relatedCases
                };
              }
              return updated;
            });
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
