import React, { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CHAT_SENDER, S3_CONFIG } from '@/lib/constants';
import { extractLegalSources, extractRelatedCases, extractTimeline, extractMindMap, cleanAiText, cleanMessageText } from '@/lib/citation-parser';
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
    skipAIResponse?: boolean,
    isAnalysisTrigger?: boolean
  ): Promise<string | number | undefined> => {
    if ((text.trim() || file) && !isLoading && supabase) {
      setIsLoading(true);
      const currentInput = text.trim();
      const newMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newMessage: Message = {
        id: newMessageId,
        text: isAnalysisTrigger ? "" : currentInput,
        sender: CHAT_SENDER.USER,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        fileAttachment: file ? {
          name: file.name,
          type: file.type,
          size: file.size
        } : undefined,
        status: skipAIResponse ? 'done' : undefined,
        isAnalysis: isAnalysisTrigger,
        hidden: false
      };

      // Extract ILM_META if present in the text (e.g. from Document Analysis)
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

      // Define internal async function to process the rest of the flow in the background
      const processMessage = async (activeSessionId: string | number) => {
        try {
          let currentFileAttachment = newMessage.fileAttachment;
          let currentDocumentContext = explicitDocumentContext !== undefined ? explicitDocumentContext : documentContext;
          let finalPromptToAI = currentInput;

          // 3. Prepare AI 'Thinking' bubble immediately to provide single loading feedback
          const aiMessageId = isAnalysisTrigger ? `analysis-ai-${Date.now()}` : `temp-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const initialAiMessage = {
            id: aiMessageId,
            text: "",
            sender: CHAT_SENDER.AI,
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          };

          setMessages(prev => [...prev, initialAiMessage]);

          // 1. If there's a file, upload and analyze it first
          if (file) {
            console.log("Attempting to upload file:", file.name, file.type, file.size);
            try {
              const uploadData = await uploadAndAnalyzeDocument(
                file,
                process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
                !skipAIResponse
              );
              console.log("File uploaded and analyzed successfully:", uploadData);

              const s3BaseUrl = uploadData.url ? uploadData.url.split('?')[0] : null;
              const resolvedUrl = formatS3Url(uploadData.file_url || s3BaseUrl || `https://s3.amazonaws.com/${uploadData.s3_key}`);
              currentFileAttachment = {
                ...currentFileAttachment!,
                url: resolvedUrl,
                s3_key: uploadData.s3_key,
                ai_summary: uploadData.ai_summary || ""
              };

              currentDocumentContext = uploadData.ai_summary || "";

              // If this is an analysis trigger, we need to construct the special prompt
              if (isAnalysisTrigger) {
                const ai_summary = uploadData.ai_summary || "";
                const filename = file.name;
                const file_url = uploadData.file_url;
                const s3_key = uploadData.s3_key;

                const metaStr = JSON.stringify({
                  isAnalysis: true,
                  hidden: false,
                  fileAttachments: [{
                    name: filename,
                    url: file_url,
                    type: filename.split('.').pop() || 'file',
                    s3_key: s3_key,
                    ai_summary: ai_summary
                  }]
                });

                const isPreAnalyzed = ai_summary.includes('## ');
                finalPromptToAI = isPreAnalyzed
                  ? `[ILM_META]${metaStr}[/ILM_META][HIDDEN_INSTRUCTION]Analyze the document "${filename}". Based on the content:\n\n${ai_summary}\n\nProvide a comprehensive legal report including:\n1. **Executive Summary** — core overview.\n2. **Practical Recommendations** — actionable next steps.\n3. **Key Risk Flags** — top critical legal risks.\n4. **Relevant Philippine Law** — statutes or cases that apply.\n5. **Next Steps** — prioritized action plan.[/HIDDEN_INSTRUCTION]`
                  : `[ILM_META]${metaStr}[/ILM_META][HIDDEN_INSTRUCTION][Document Analysis Request] Analyze "${filename}". Provide:\n1. Comprehensive summary.\n2. Key legal points.\n3. Relevant Philippine laws.\n4. Notable clauses.\n5. Recommendations.[/HIDDEN_INSTRUCTION]`;
              }

              // Update the local message with the final file data
              setMessages(prev => prev.map(m => m.id === newMessageId ? { ...m, fileAttachment: currentFileAttachment, text: isAnalysisTrigger ? "" : m.text } : m));

              // If this is an analysis trigger, we can speed things up by showing the summary directly 
              // but we'll stick to the stream for the premium formatting
            } catch (uploadErr) {
              console.error("File upload/analysis failed for:", file.name, uploadErr);
              // We'll continue without the file context if it failed
            }
          }

          // 2. Save user message to cloud
          const meta = {
            fileAttachment: currentFileAttachment,
            isAnalysis: isAnalysisTrigger,
            hidden: false
          };

          // For analysis triggers, we use the finalPromptToAI which already has [ILM_META]
          // Otherwise build it from currentInput
          const contentWithMeta = isAnalysisTrigger
            ? finalPromptToAI
            : currentInput + (Object.values(meta).some(v => v !== undefined) ? `\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]` : "");

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
            const receiptText = `I've received your file "${currentFileAttachment?.name || 'document'}." What would you like me to do with it?\n\nHere are a few things I can help you with:\n\n- **Comprehensive Document Analysis**: Perform a deep-dive analysis of the file's legal implications and core findings.\n- **Key Data Extraction**: Identify and extract critical dates, parties, and legal obligations from the document.\n- **Synthesize Case Facts**: Extract a clear, plain-language summary of the core facts and legal issues.\n- **Generate Professional Brief**: Produce a structured case brief including the issue, ruling, and legal reasoning.\n- **Deconstruct Legal Reasoning**: Provide a step-by-step breakdown of the court's logic and the specific laws applied.\n\nJust tell me 👍`;


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
            let googleAccessToken: string | undefined = undefined;
            if (supabase) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                googleAccessToken = session?.provider_token || undefined;
              } catch (e) {
                console.error("Failed to get session for provider token", e);
              }
            }
            const payloadUserInput = `[Legal AI] ${finalPromptToAI || (file ? `Analyze the attached document: ${file.name}` : "")}\n\n[SYSTEM RULE - CRITICAL]: If your response includes any form of step-by-step legal plan, strategy, or action timeline, you MUST append it EXCLUSIVELY in the following machine-readable format below your prose answer. \n             Do NOT write it as a numbered list, bullet points, or any other Markdown format.\n\n---\n[SYSTEM INSTRUCTION - RESPONSE FORMAT]:\nCurrent System Date: ${new Date().toISOString().split('T')[0]}\n\n4. IMPORTANT: Always include these 4 specific main branches in the mind map if the information is available:\n   - "Key Parties": Separate Names and Roles into distinct nested levels. \n     Structure: "Key Parties" -> [Role (e.g. "Plaintiff")] -> [Full Name (e.g. "Engr. Marcus T. Torres")]. \n     CRITICAL: NEVER combine the role and name in a single label (e.g., Do NOT use "Plaintiff: Marcus Torres"). They MUST be separate nodes.\n     Include Attorneys, Witnesses, and specific experts.\n\n\n5. If the user's inquiry relates to filing a case, you MUST add a "Filing Requirements" branch including: (a) Jurisdiction and Venue, (b) Verification and Certification Against Forum Shopping, and (c) Reliefs Demanded.\n\nCRITICAL: NEVER mention "Mind Map", "Timeline", or that you are generating them in your prose/text response. The UI renders them automatically in a separate tab. Your prose must ONLY contain the direct legal consultation, then immediately output the tags.\n\nThe tags MUST be at the very bottom and look like this:\n\n[MINDMAP]\n{\n  "id": "root",\n  "label": "Case Analysis",\n  "description": "Comprehensive mapping of legal elements for the specific dispute regarding [Case Subject].",\n  "children": [\n    {\n      "id": "c1",\n      "label": "Key Parties",\n      "description": "Inventory of case-specific stakeholders, featuring their unique identifiers and precise legal standing.",\n      "children": [\n        { "id": "p1_role", "label": "Plaintiff", "description": "The primary initiator [Name] who is seeking recovery of [Specific Property/Amount].", "children": [{ "id": "p1_name", "label": "Sofia Santos", "description": " Sofia Santos, owner of OCT No. 12345, claiming a 50sqm encroachment in Brgy. San Jose.", "children": [] }] },\n        { "id": "atty_root", "label": "Legal Team", "description": "The specific attorneys managing the procedural strategy for this case.", "children": [{ "id": "a1", "label": "Counsel", "description": "Lead legal representation focused on the Accion Reivindicatoria strategy.", "children": [{"id": "a1_name", "label": "Atty. Gabriel Cruz", "description": "Atty. Cruz, specializing in land disputes, currently preparing the complaint for the Pasig RTC.", "children": []}] }] }\n      ]\n    }\n  ]\n}\n[/MINDMAP]\n\n7. CRITICAL: Every node in the [MINDMAP] MUST have a unique \"description\" and you MUST deconstruct technical details into subnodes. \n   - DESCRIPTION FORMATTING: If the information is a narrative role or strategy, use a concise sentence. If the information is a short technical fact (e.g., license, measurements, serial numbers, specific dates), use bulleted form (e.g. \"- License: 008922\").\n   - QUANTITIES & IDENTIFIERS: If a measurement (e.g., \"38.5sqm\"), license number, or serial number is mentioned, it MUST be its own distinct node.\n   - For example: \"Evidence\" -> \"Relocation Survey\" -> \"38.5sqm Encroachment (North-West)\".\n\n8. You MUST provide a comprehensive, chronological [TIMELINE] array of the case. It MUST include past completed steps and future pending steps. Only use these exact statuses: \"completed\", \"pending\". \nCRITICAL RULE 1: Break down simultaneous or independent tasks into separate, granular micro-steps. Do NOT group them into broad categories.\nCRITICAL RULE 2: Calculate past dates mathematically using the Current System Date provided above. NEVER copy the example dates or tasks verbatim. Generate original tasks and mathematically accurate dates based entirely on the user's transcript.\n\n[TIMELINE]\n[\n  {\"title\":\"Case Assessment\",\"date\":\"[YYYY-MM-DD]\",\"description\":\"- Initial review of [Party's Name] documentation.\\n- Document inventory.\",\"status\":\"completed\", \"requires_previous\": false},\n  {\"title\":\"Technical Survey Verification\",\"date\":\"\",\"description\":\"- Conduct on-site boundary verification.\\n- Confirm 50sqm encroachment.\",\"status\":\"pending\", \"requires_previous\": false}\n]\n[/TIMELINE]\nCRITICAL: The mind map JSON MUST use \"label\" for the display text. Ensure Names are ALWAYS nested UNDER their Titles/Roles as separate child nodes. (e.g. \"Geodetic Engineer\" (parent) -> \"Engr. Miguel Gomez\" (child) -> \"License No. 008922\" (grandchild)). NEVER use a colon \":\" to join a role and a name in one label. Do not include these tags in the prose.`;


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
                      rawContent: accumulatedText,
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
        processMessage(sessionId).catch((err) => {
          console.error("[processMessage] Unhandled rejection:", err);
        });
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
