import React, { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CHAT_SENDER } from '@/lib/constants';
import { extractLegalSources, extractRelatedCases, extractTimeline, extractMindMap, cleanAiText } from '@/lib/citation-parser';
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
  supabase: ReturnType<typeof createClient> | null;
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
  supabase,
  documentContext
}: UseSendMessageParams) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = useCallback(async (text: string, targetConversationId?: string | number, explicitDocumentContext?: string | null): Promise<string | number | undefined> => {
    if (text.trim() && !isLoading && supabase) {
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
      const processMessage = async (activeSessionId: string | number, userMsgSaved: boolean) => {
        try {
          // 1. Save user message to cloud if not already saved
          if (!userMsgSaved && supabase) {
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
            const payloadUserInput = `[Legal AI] ${currentInput}\n\n[SYSTEM RULE - CRITICAL]: If your response includes any form of step-by-step legal plan, strategy, or action timeline, you MUST append it EXCLUSIVELY in the following machine-readable format below your prose answer. 
             Do NOT write it as a numbered list, bullet points, or any other Markdown format.

---
[SYSTEM INSTRUCTION - RESPONSE FORMAT]:
Current System Date: ${new Date().toISOString().split('T')[0]}

4. IMPORTANT: Always include these 4 specific main branches in the mind map if the information is available:
   - "Key Parties": Separate Names and Roles into distinct nodes (e.g., "Plaintiff" -> "[Name]"). Include Attorneys and Witnesses.
   - "Legal Strategy": Provide specific legal theories, defense strategies, or claim preparations.
   - "Evidence & Facts": Extract key facts and pieces of evidence.
   - "Laws & Jurisprudence": List relevant Articles, Sections, or Case Laws mentioned.
5. If the user's inquiry relates to filing a case, you MUST add a "Filing Requirements" branch including: (a) Jurisdiction and Venue, (b) Verification and Certification Against Forum Shopping, and (c) Reliefs Demanded.

The tags MUST be at the very bottom and look like this:

[MINDMAP]
{
  "id": "root",
  "label": "Case Analysis",
  "description": "Comprehensive mapping of legal elements for the specific dispute regarding [Case Subject].",
  "children": [
    {
      "id": "c1",
      "label": "Key Parties",
      "description": "Inventory of case-specific stakeholders, featuring their unique identifiers and precise legal standing.",
      "children": [
        { "id": "p1_role", "label": "Plaintiff", "description": "The primary initiator [Name] who is seeking recovery of [Specific Property/Amount].", "children": [{ "id": "p1_name", "label": "Sofia Santos", "description": " Sofia Santos, owner of OCT No. 12345, claiming a 50sqm encroachment in Brgy. San Jose.", "children": [] }] },
        { "id": "atty_root", "label": "Legal Team", "description": "The specific attorneys managing the procedural strategy for this case.", "children": [{ "id": "a1", "label": "Counsel", "description": "Lead legal representation focused on the Accion Reivindicatoria strategy.", "children": [{"id": "a1_name", "label": "Atty. Gabriel Cruz", "description": "Atty. Cruz, specializing in land disputes, currently preparing the complaint for the Pasig RTC.", "children": []}] }] }
      ]
    }
  ]
}
[/MINDMAP]

7. CRITICAL: Every node in the [MINDMAP] MUST have a unique "description" and you MUST deconstruct technical details into subnodes. 
   - DESCRIPTION FORMATTING: If the information is a narrative role or strategy, use a concise sentence. If the information is a short technical fact (e.g., license, measurements, serial numbers, specific dates), use bulleted form (e.g. "- License: 008922").
   - QUANTITIES & IDENTIFIERS: If a measurement (e.g., "38.5sqm"), license number, or serial number is mentioned, it MUST be its own distinct node.
   - For example: "Evidence" -> "Relocation Survey" -> "38.5sqm Encroachment (North-West)".

8. You MUST provide a comprehensive, chronological [TIMELINE] array of the case. It MUST include past completed steps and future pending steps. Only use these exact statuses: "completed", "pending". 
CRITICAL RULE 1: Break down simultaneous or independent tasks into separate, granular micro-steps. Do NOT group them into broad categories.
CRITICAL RULE 2: Calculate past dates mathematically using the Current System Date provided above. NEVER copy the example dates or tasks verbatim. Generate original tasks and mathematically accurate dates based entirely on the user's transcript.

[TIMELINE]
[
  {"title":"Case Assessment","date":"[YYYY-MM-DD]","description":"- Initial review of [Party's Name] documentation.\n- Document inventory.","status":"completed", "requires_previous": false},
  {"title":"Technical Survey Verification","date":"","description":"- Conduct on-site boundary verification.\n- Confirm 50sqm encroachment.","status":"pending", "requires_previous": false}
]
[/TIMELINE]
CRITICAL: The mind map JSON MUST use "label" for the display text. Ensure Names are nested under their Positions as separate nodes. (e.g. "Geodetic Engineer" -> "Engr. Miguel Gomez" -> "License No. 008922"). Do not include these tags in the prose.`;

            return fetch('/api/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_input: payloadUserInput,
                session_id: sId,
                document_context: explicitDocumentContext !== undefined ? explicitDocumentContext : documentContext
              }),
              signal: controller.signal
            });
          };

          let accumulatedText = "";
          let sources: any[] | undefined;
          let relatedCases: any[] | undefined;
          let timeline: any[] | undefined;
          let mindMap: any | undefined;
          let aiResponseSuccessful = false;

          let retryCount = 0;
          const MAX_RETRIES = 3;

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

              // Reset accumulated text for each retry
              accumulatedText = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                let chunk = decoder.decode(value, { stream: true });
                chunk = chunk.replace(/^(?:\[Tool\][^\n]*\n?)+/, "");

                if (chunk.includes("Unknown session")) {
                  throw new Error("UNKNOWN_SESSION");
                }

                if (chunk.startsWith("[Error]")) {
                  accumulatedText = "Error: " + chunk.replace("[Error]", "");
                  aiResponseSuccessful = true; // Not an unknown session, a deliberate backend error to display
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
                mindMap = extractMindMap(accumulatedText);

                let cleanText = accumulatedText.trim();
                cleanText = cleanText.replace(/\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/i, '').trim();
                cleanText = cleanText.replace(/\[MINDMAP\][\s\S]*?(?:\[\/MINDMAP\]|$)/i, '').trim();
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
                      timeline,
                      mindMap
                    };
                  }
                  return updated;
                });
              }

              aiResponseSuccessful = true; // Stream finished successfully

            } catch (err: any) {
              if (err.message === "UNKNOWN_SESSION") {
                console.log(`[Retry ${retryCount + 1}/${MAX_RETRIES}] Backend reported 'Unknown session', fetching a new one...`);
                retryCount++;
                currentChatSessionId = await refreshSession() || "";
                if (retryCount >= MAX_RETRIES) {
                  throw new Error("Max retries exceeded for Unknown session");
                }
              } else {
                throw err; // Not an unknown session, abort retries
              }
            }
          }

          // 3. Final cleanup and save AI message
          const rawAiText = accumulatedText.trim();

          if (!supabase) return;

          const { data: savedAiMsg, error: aiMsgError } = await supabase
            .from("messages")
            .insert({
              conversation_id: activeSessionId,
              role: 'assistant',
              content: rawAiText
            })
            .select()
            .single();

          if (!aiMsgError && savedAiMsg) {
            setMessages(prev => prev.map(m => m.id === aiMessageId ? mapCloudMessage(savedAiMsg) : m));
          }
        } catch (error: any) {
          if (error.name === 'AbortError') return;
          console.error("AI Stream Error:", error);

          // Fallback UI message so the chat isn't stuck empty
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
        } catch (e) { }

        if (!supabase) {
          setIsLoading(false);
          return;
        }

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

      // Step 2: Save the USER message to the database immediately (Awaited)
      // This ensures that even if we redirect, the message is persisted.
      let userMsgSaved = false;
      try {
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
          userMsgSaved = true;
        }
      } catch (err) {
        console.error("Failed to persist user message before redirect:", err);
      }

      // Step 3: Trigger the AI stream (Concurrent - do NOT await if we are redirecting)
      // Actually, if we ARE redirecting, the AI stream on this client will die.
      // But that's okay because the new page will load the consultation and see the user message.
      if (sessionId) {
        processMessage(sessionId, userMsgSaved);
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
    supabase,
    documentContext
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
