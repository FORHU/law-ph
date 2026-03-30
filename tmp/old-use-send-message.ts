import React, { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CHAT_SENDER } from '@/lib/constants';
import { extractLegalSources, extractRelatedCases, extractTimeline, extractMindMap, cleanAiText } from '@/lib/citation-parser';
import { Message } from './conversation-context';
import { uploadAndAnalyzeDocument } from '@/lib/s3-utils';

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

  const handleSendMessage = useCallback(async (
    text: string, 
    targetConversationId?: string | number, 
    explicitDocumentContext?: string | null,
    file?: File | null,
    skipAIResponse?: boolean
  ): Promise<string | number | undefined> => {
    if ((text.trim() || file) && !isLoading && supabase) {
      setIsLoading(true);
      const currentInput = text.trim();
      const newMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newMessage: Message = {
        id: newMessageId,
        text: currentInput,
        sender: CHAT_SENDER.USER,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        fileAttachment: file ? {
          name: file.name,
          type: file.type,
          size: file.size
        } : undefined,
        status: skipAIResponse ? 'done' : undefined
      };

      // Extract ILM_META if present in the text (e.g. from Document Analysis)
      let displayInput = currentInput;
      const metaMatch = currentInput.match(/\[ILM_META\]([\s\S]*?)\[\/ILM_META\]/);
      if (metaMatch) {
        try {
          const meta = JSON.parse(metaMatch[1]);
          newMessage.isAnalysis = meta.isAnalysis;
          newMessage.fileAttachments = meta.fileAttachments;
          if (meta.fileAttachment) newMessage.fileAttachment = meta.fileAttachment;
          displayInput = currentInput.replace(/\[ILM_META\][\s\S]*?\[\/ILM_META\]/, '').trim();
          // Also strip hidden instructions for local display
          displayInput = displayInput.replace(/\[HIDDEN_INSTRUCTION\][\s\S]*?\[\/HIDDEN_INSTRUCTION\]/, '').trim();
          newMessage.text = displayInput;
        } catch (e) {
          console.error("Failed to parse ILM_META in outgoing message", e);
        }
      }

      let sessionId = targetConversationId || syncedConversationId || currentConsultationId;
      setMessages(prev => [...prev, newMessage]);

      // Define internal async function to process the rest of the flow in the background
      const processMessage = async (activeSessionId: string | number) => {
        try {
          let currentFileAttachment = newMessage.fileAttachment;
          let currentDocumentContext = explicitDocumentContext !== undefined ? explicitDocumentContext : documentContext;

          // 1. If there's a file, upload and analyze it first
          if (file) {
            try {
              const uploadData = await uploadAndAnalyzeDocument(
                file,
                process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
                !skipAIResponse
              );
              
              currentFileAttachment = {
                ...currentFileAttachment!,
                url: uploadData.file_url,
                s3_key: uploadData.s3_key,
                ai_summary: uploadData.ai_summary
              };
              
              currentDocumentContext = uploadData.ai_summary;

              // Update the local message with the final file data
              setMessages(prev => prev.map(m => m.id === newMessageId ? { ...m, fileAttachment: currentFileAttachment } : m));
            } catch (uploadErr) {
              console.error("File upload/analysis failed:", uploadErr);
              // We'll continue without the file context if it failed
            }
          }

          // 2. Save user message to cloud
          const meta = {
            fileAttachment: currentFileAttachment
          };
          const contentWithMeta = currentInput + (Object.values(meta).some(v => v !== undefined) ? `\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]` : "");

          const { data: savedUserMsg, error: userMsgError } = await supabase
            .from("messages")
            .insert({
              conversation_id: activeSessionId,
              role: 'user',
              content: contentWithMeta
            })
            .select()
            .single();

          if (!userMsgError && savedUserMsg) {
            setMessages(prev => prev.map(m => m.id === newMessageId ? mapCloudMessage(savedUserMsg) : m));
          }

          if (skipAIResponse) {
            // Send the "receipt" response with more professional phrases
            const receiptText = `IΓÇÖve received your file ΓÇ£${currentFileAttachment?.name || 'document'}.ΓÇ¥ What would you like me to do with it?

Here are a few things I can help you with:

- **Comprehensive Document Analysis**: Perform a deep-dive analysis of the file's legal implications and core findings.
- **Key Data Extraction**: Identify and extract critical dates, parties, and legal obligations from the document.
- **Synthesize Case Facts**: Extract a clear, plain-language summary of the core facts and legal issues.
- **Generate Professional Brief**: Produce a structured case brief including the issue, ruling, and legal reasoning.
- **Deconstruct Legal Reasoning**: Provide a step-by-step breakdown of the court's logic and the specific laws applied.

Just tell me ≡ƒæì`;

            const aiMessageId = `receipt-${Date.now()}`;
            const receiptMsg: Message = {
              id: aiMessageId,
              text: receiptText,
              sender: CHAT_SENDER.AI,
              time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            };

            setMessages(prev => [...prev, receiptMsg]);
            setIsLoading(false);

            // Save the receipt response to Supabase
            try {
              const { data: savedAiMsg } = await supabase.from("messages").insert({
                conversation_id: activeSessionId,
                role: 'assistant',
                content: receiptText
              }).select().single();
              
              if (savedAiMsg) {
                setMessages(prev => prev.map(m => m.id === aiMessageId ? mapCloudMessage(savedAiMsg) : m));
              }
            } catch (saveErr) {
              console.error("Failed to save receipt message:", saveErr);
            }

            return;
          }

          // 3. Prepare AI message
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
            const payloadUserInput = `[Legal AI] ${currentInput || (file ? `Analyze the attached document: ${file.name}` : "")}\n\n[SYSTEM RULE - CRITICAL]: If your response includes any form of step-by-step legal plan, strategy, or action timeline, you MUST append it EXCLUSIVELY in the following machine-readable format below your prose answer. 
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
  "children": [
    {
      "id": "c1",
      "label": "Key Parties",
      "children": [
        { "id": "p1_role", "label": "Plaintiff/Complainant", "children": [{ "id": "p1_name", "label": "[Name]", "children": [] }] },
        { "id": "atty_root", "label": "Legal Team", "children": [{ "id": "a1", "label": "Counsel", "children": [{"id": "a1_name", "label": "Atty. [Name]", "children": []}] }] }
      ]
    },
    { "id": "c2", "label": "Legal Strategy", "children": [{ "id": "s1", "label": "Defense Strategy", "children": [] }] },
    { "id": "c3", "label": "Evidence & Facts", "children": [{ "id": "e1", "label": "Key Evidence", "children": [] }] },
    { "id": "c4", "label": "Laws & Jurisprudence", "children": [] }
  ]
}
[/MINDMAP]

6. You MUST provide a comprehensive, chronological [TIMELINE] array of the case. It MUST include past completed steps and future pending steps. Only use these exact statuses: "completed", "pending". If a pending step strictly requires the previous step to be finished first, add "requires_previous": true. 
CRITICAL RULE 1: Break down simultaneous or independent tasks into separate, granular micro-steps. Do NOT group them into broad categories (e.g. do not just say "Gather Evidence", say "Get Police Report" and "Get Medical Cert"). If multiple steps can be done simultaneously, set "requires_previous": false.
CRITICAL RULE 2: Calculate past dates mathematically using the Current System Date provided above (e.g. if today is 2026-03-19 and the user says '5 days ago', the date is 2026-03-14). NEVER copy the example dates or tasks verbatim. Generate original tasks and mathematically accurate dates based entirely on the user's transcript.

[TIMELINE]
[
  {"title":"Case Assessment","date":"[YYYY-MM-DD calculated from context]","description":"Initial review of notes.","status":"completed", "requires_previous": false},
  {"title":"Secure Medical Certificate","date":"","description":"Obtain official injury records from the hospital.","status":"pending", "requires_previous": false},
  {"title":"Obtain Barangay Incident Report","date":"","description":"Request the blotter from the barangay desk.","status":"pending", "requires_previous": false},
  {"title":"Draft Demand Letter","date":"","description":"Write the formal demand requiring the completion of the previous steps.","status":"pending", "requires_previous": true}
]
[/TIMELINE]
CRITICAL: The mind map JSON MUST use "label" for the display text. Ensure Names are nested under their Positions as separate nodes. (e.g. "Respondent" -> "John Doe"). Do not include these tags in the prose.`;

            return fetch('/api/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_input: payloadUserInput,
                session_id: sId,
                document_context: currentDocumentContext
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
                  aiResponseSuccessful = true;
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
              aiResponseSuccessful = true;
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

          const rawAiText = accumulatedText.trim();
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
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]) {
              updated[lastIdx] = { ...updated[lastIdx], text: "I'm sorry, I'm having trouble connecting right now." };
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
        let conversationTitle = currentInput.substring(0, 50) || (file ? `Document: ${file.name}` : "New Consultation");
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title: conversationTitle })
          .select()
          .single();

        if (convError) {
          setIsLoading(false);
          return;
        }

        sessionId = convData.id;
        setCurrentConsultationId(sessionId);
        await fetchConversations();
      }

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
