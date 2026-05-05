"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { Conversation, ConsultationSession, CaseData } from "@/types";
import { useAuth } from "@/components/auth/auth-provider";
import { useParams } from "next/navigation";
import { CHAT_SENDER } from "@/lib/constants";
import {
  extractLegalSources,
  extractRelatedCases,
  extractTimeline,
  extractMindMap,
  cleanAiText,
  cleanMessageText,
} from "@/lib/citation-parser";
import { uploadAndAnalyzeDocument } from "@/lib/s3-utils";
import {
  ConversationContext,
  Message,
  type ConversationContextType,
} from "./conversation-provider/conversation-context";
import { useDetailSidebar } from "./conversation-provider/use-detail-sidebar";
import { useSendMessage } from "./conversation-provider/use-send-message";
import { useChatSession } from "./conversation-provider/use-chat-session";
import {
  Bookmark,
  NewBookmark,
  getBookmarks,
  addBookmark as svcAddBookmark,
  removeBookmark as svcRemoveBookmark,
} from "@/lib/bookmarks-service";

export function ConversationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loggedIn, session, supabase } = useAuth();
  const params = useParams();
  const syncedConversationId = (params?.conversationId || params?.id) as
    | string
    | undefined;
  const userId = session?.user?.id;

  // Local/UI state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConsultationId, setCurrentConsultationId] = useState<
    string | number | null
  >(null);
  const [recentConsultations, setRecentConsultations] = useState<
    ConsultationSession[]
  >([]);
  const [documentContext, setDocumentContext] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Voice Recording Persistent State
  const [isRecording, setIsRecording] = useState<Record<string | number, boolean>>({});
  const [recordingTime, setRecordingTime] = useState<Record<string | number, number>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [conflictRecordingId, setConflictRecordingId] = useState<string | number | null>(null);
  const [activeRecordingTitle, setActiveRecordingTitle] = useState<string | null>(null);
  const [recordingCaseNames, setRecordingCaseNames] = useState<Record<string | number, string>>({});

  // Ensure recording is cleaned up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // One-time cleanup: remove stale localStorage consultation cache from old app versions
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ilovelawyer_consultations");
    }
  }, []);

  const updateMessage = useCallback(
    async (
      id: string | number,
      updates: Partial<Message> & {
        __appendVoiceNote?: { id: string; url: string; label?: string; s3_key?: string };
      },
    ) => {
      // 1. Update state immediately for UI responsiveness
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id.toString() !== id.toString()) return msg;

          // Handle special __appendVoiceNote: append OR update existing by ID
          if (updates.__appendVoiceNote) {
            const currentNotes =
              msg.voiceNotes ||
              (msg.recordingUrl
                ? [{ id: "legacy", url: msg.recordingUrl }]
                : []);
            const existingIdx = currentNotes.findIndex(
              (n) => n.id === updates.__appendVoiceNote!.id,
            );

            let newNotes;
            if (existingIdx >= 0) {
              // Update existing (e.g. from blob: to s3://)
              newNotes = [...currentNotes];
              newNotes[existingIdx] = {
                ...newNotes[existingIdx],
                ...updates.__appendVoiceNote,
              };
            } else {
              // Append new
              newNotes = [...currentNotes, updates.__appendVoiceNote];
            }
            const mergedMsg = {
              ...msg,
              voiceNotes: newNotes,
              recordingUrl: newNotes[0]?.url,
            };

            const cleanedText = cleanMessageText(mergedMsg.text || "");
            let finalContent = cleanedText;
            const meta = {
              originalText: mergedMsg.originalText,
              editedAt: mergedMsg.editedAt,
              editedBy: mergedMsg.editedBy,
              recordingUrl: mergedMsg.recordingUrl,
              voiceNotes: mergedMsg.voiceNotes,
              highlights: mergedMsg.highlights,
              fileAttachment: mergedMsg.fileAttachment,
            };

            if (Object.values(meta).some((v) => v !== undefined)) {
              finalContent += `\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]`;
            }
            return { ...mergedMsg, text: cleanedText, content: finalContent };
          }
          return { ...msg, ...updates };
        }),
      );

      // 2. Perform DB update if logged in and ID is a valid UUID
      if (loggedIn) {
        const isUuid =
          typeof id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          );
        if (!isUuid) return; // Skip DB update for temporary numeric IDs

        try {
          const currentMessages = messages;
          const targetMsg = currentMessages.find(
            (m) => m.id.toString() === id.toString(),
          );

          if (targetMsg) {
            // Compute what the merged message looks like
            let mergedMsg: any;
            if (updates.__appendVoiceNote) {
              const currentNotes =
                targetMsg.voiceNotes ||
                (targetMsg.recordingUrl
                  ? [{ id: "legacy", url: targetMsg.recordingUrl }]
                  : []);
              const existingIdx = currentNotes.findIndex(
                (n) => n.id === updates.__appendVoiceNote!.id,
              );

              let newNotes;
              if (existingIdx >= 0) {
                newNotes = [...currentNotes];
                newNotes[existingIdx] = {
                  ...newNotes[existingIdx],
                  ...updates.__appendVoiceNote,
                };
              } else {
                newNotes = [...currentNotes, updates.__appendVoiceNote];
              }
              mergedMsg = {
                ...targetMsg,
                voiceNotes: newNotes,
                recordingUrl: newNotes[0]?.url,
              };
            } else {
              mergedMsg = { ...targetMsg, ...updates };
            }

            const meta = {
              originalText: mergedMsg.originalText,
              editedAt: mergedMsg.editedAt,
              editedBy: mergedMsg.editedBy,
              recordingUrl: mergedMsg.recordingUrl,
              voiceNotes: mergedMsg.voiceNotes,
              highlights: mergedMsg.highlights,
            };

            const cleanedText = cleanMessageText(mergedMsg.text || "");
            let newContent = cleanedText;
            if (Object.values(meta).some((v) => v !== undefined)) {
              newContent += `\n\n[ILM_META]${JSON.stringify(meta)}[/ILM_META]`;
            }

            const { error } = await supabase
              .from("messages")
              .update({ content: newContent })
              .eq("id", id);
            if (error)
              console.error(
                "[ConversationProvider] DB Update message failed:",
                error.message,
              );
          }
        } catch (err) {
          console.error(
            "[ConversationProvider] DB Update message critical error:",
            err,
          );
        }
      }
    },
    [loggedIn, supabase, messages],
  );

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Cases state
  const [cases, setCases] = useState<CaseData[]>([]);

  // Detail sidebar hook
  const {
    isDetailSidebarOpen,
    selectedSource,
    selectedCase,
    detailContext,
    openSourceDetail,
    openCaseDetail,
    openSourceByItemId,
    closeDetailSidebar,
  } = useDetailSidebar(setIsSidebarOpen);

  // Chat session hook
  const { chatSessionId, setChatSessionId } = useChatSession();

  // Supabase state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [casesLoaded, setCasesLoaded] = useState(false);

  // Ref to track all IDs deleted during this session to prevent any "resurrection" from stale API data
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // Load shadow-deleted IDs from local storage on mount
  useEffect(() => {
    const savedIds = localStorage.getItem("deleted_conversation_ids");
    if (savedIds) {
      try {
        const parsed = JSON.parse(savedIds);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => deletedIdsRef.current.add(id));
        }
      } catch (e) {
        console.error("Failed to parse deleted IDs", e);
      }
    }
  }, []);

  const persistDeletedId = (id: string) => {
    deletedIdsRef.current.add(id);
    localStorage.setItem(
      "deleted_conversation_ids",
      JSON.stringify(Array.from(deletedIdsRef.current)),
    );
  };

  const handleRemoveConsultation = async (id: string | number) => {
    console.log("[ConversationProvider] Removing consultation:", id);
    const idStr = id.toString();

    // 1. Optimistic UI update
    setRecentConsultations((prev) =>
      prev.filter((c) => c.id.toString() !== idStr),
    );
    setConversations((prev) => prev.filter((c) => c.id.toString() !== idStr));

    // If it's the active one, clear state immediately
    if (currentConsultationId?.toString() === idStr) {
      handleNewConsultation();
    }

    // 2. Cloud removal
    try {
      const { error, status } = await supabase
        .from("conversations")
        .delete()
        .eq("id", idStr);

      if (error || (status !== 200 && status !== 204)) {
        // Only shadow-delete if the DB delete actually failed
        console.warn(
          "[ConversationProvider] DB Delete failed. Shadow-deleting locally.",
          status,
          error?.message,
        );
        persistDeletedId(idStr);
      } else {
        // Success: ensure it's NOT in the shadow list (clean up any old entry)
        console.log(
          "[ConversationProvider] DB deletion confirmed. Cleaning shadow list.",
        );
        deletedIdsRef.current.delete(idStr);
        localStorage.setItem(
          "deleted_conversation_ids",
          JSON.stringify(Array.from(deletedIdsRef.current)),
        );
        await fetchConversations();
      }
    } catch (err) {
      console.error("[ConversationProvider] Critical delete error:", err);
      // Shadow-delete as fallback so UI stays correct
      persistDeletedId(idStr);
    }
  };

  const handleDeleteMessage = async (messageId: string | number) => {
    // 1. Optimistic UI update
    setMessages(messages.filter((m) => m.id !== messageId));

    // 2. Cloud removal (Best Effort) - Only if it's a valid UUID
    const isUuid =
      typeof messageId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        messageId,
      );

    if (isUuid) {
      try {
        const { error } = await supabase
          .from("messages")
          .delete()
          .eq("id", messageId);
        if (error) {
          console.error(
            "Failed to delete message (likely RLS). Item hidden locally.",
            error.message,
          );
          // Shadow Delete: We do NOT restore it. We assume the user wants it gone.
        }
      } catch (err) {
        console.error("Unexpected error during message deletion:", err);
        // Do NOT restore.
      }
    }
  };

  // Helper to map Supabase/Cloud messages to UI format
  const mapCloudMessage = useCallback((msg: any): Message => {
    let text = msg.content || msg.text || "";
    const role = msg.role || msg.sender;
    const sender = role === "assistant" ? "ai" : (role === "system" ? "system" : "user");

    // Extract custom ILM metadata
    let meta: any = {};
    const metaMatch = text.match(/\[ILM_META\]([\s\S]*?)\[\/ILM_META\]/i);
    if (metaMatch) {
      try {
        meta = JSON.parse(metaMatch[1]);
      } catch (e) {
        console.error("Failed to parse ILM_META", e);
      }
    }

    // Auto-extract citations for AI messages on load/map
    // CRITICAL: Extract from raw text BEFORE cleaning it for display
    const sources =
      sender === CHAT_SENDER.AI ? extractLegalSources(text) : undefined;
    const relatedCases =
      sender === CHAT_SENDER.AI ? extractRelatedCases(text) : undefined;
    const timeline =
      sender === CHAT_SENDER.AI ? extractTimeline(text) : undefined;
    const mindMap =
      sender === CHAT_SENDER.AI ? extractMindMap(text) : undefined;

    // Now clean the text for display
    text = cleanMessageText(text);

    const cleanText =
      sender === CHAT_SENDER.AI
        ? cleanAiText(text)
        : text;

    console.log("Fetched file attachments for message:", msg.id, meta.fileAttachments);

    return {
      ...msg,
      text: cleanText,
      sender,
      sources,
      relatedCases,
      timeline,
      mindMap,
      originalText: meta.originalText,
      editedAt: meta.editedAt,
      editedBy: meta.editedBy,
      recordingUrl: meta.recordingUrl,
      voiceNotes: meta.voiceNotes,
      highlights: meta.highlights,
      isAnalysis: meta.isAnalysis || !!meta.isAnalysis,
      hidden: meta.hidden || !!meta.hidden,
      fileAttachment: meta.fileAttachment,
      fileAttachments: meta.fileAttachments,
      time: msg.time || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : "")
    };
  }, []);

  // Sync Supabase Conversations
  const fetchConversations = useCallback(async () => {
    if (!loggedIn || !userId) return;
    console.log(
      "[ConversationProvider] fetchConversations starting for user:",
      userId,
    );

    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.message === "Failed to fetch") {
          console.warn(
            "[ConversationProvider] fetchConversations: Network connection issues (Failed to fetch).",
          );
        } else {
          // If it's just a missing table, handle it gracefully without screaming in the console
          if (error.message.includes("not find the table")) {
            console.warn("[ConversationProvider] Conversations table not found. Using demo data.");
            const mockConversations = [
              { id: 'c1', user_id: userId, title: 'Legal Research: Rule 138-A', created_at: new Date().toISOString() },
              { id: 'c2', user_id: userId, title: 'Jurisprudence: Property Law', created_at: new Date(Date.now() - 3600000).toISOString() },
            ];
            setConversations(mockConversations);
          } else {
            console.error(
              "[ConversationProvider] fetchConversations error:",
              error.message,
            );
          }
        }
        return;
      }

      if (data) {
        // Double-check: Filter out ANY ID that was deleted in this session
        // AND exclude cases so they don't appear in the standard consultation history UI
        const liveData = data.filter(
          (c) =>
            !deletedIdsRef.current.has(c.id.toString()) &&
            !c.title.startsWith("[CASE]"),
        );
        console.log(
          "[ConversationProvider] Sync complete. Filtered items:",
          data.length - liveData.length,
        );

        setConversations(liveData);
        // Map basic conversation list to ConsultationSession format for UI compatibility
        const mappedSessions: ConsultationSession[] = liveData.map((conv) => ({
          id: conv.id,
          title: conv.title,
          subtitle: '',
          messages: [], // Messages are fetched on demand
        }));
        setRecentConsultations(mappedSessions);

        setLoaded(true);
      }
    } catch (err) {
      console.error(
        "[ConversationProvider] Unexpected error in fetchConversations:",
        err,
      );
    } finally {
      console.log("[ConversationProvider] fetchConversations complete.");
    }
  }, [loggedIn, userId, supabase]);

  const loadedHistoryIdRef = useRef<string | null>(null);

  // Wrapper to keep loaded history in sync when we jump to an active / new chat
  const setCurrentConsultationIdWrapper = useCallback(
    (id: string | number | null) => {
      setCurrentConsultationId(id);
      if (id) {
        loadedHistoryIdRef.current = id.toString();
      } else {
        loadedHistoryIdRef.current = null;
      }
    },
    [],
  );

  // Message sending hook
  const { handleSendMessage, abortMessage, abortControllerRef } = useSendMessage({
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    currentConsultationId,
    setCurrentConsultationId: setCurrentConsultationIdWrapper,
    syncedConversationId,
    chatSessionId,
    setChatSessionId,
    userId,
    fetchConversations,
    mapCloudMessage,
    supabase,
    documentContext
  });

  const handleNewConsultation = useCallback(() => {
    abortMessage();
    setMessages((prev) => (prev.length > 0 ? [] : prev));
    setCurrentConsultationId((prev) => (prev !== null ? null : prev));
    setIsLoading((prev) => (prev ? false : prev));
    // Do NOT clear loadedHistoryIdRef.current here. 
    // Keeping it allows fetchCloudMessages to detect we intentionally cleared this session
    // and skip re-fetching it while the URL is still transitioning.
  }, [abortMessage]);


  // Background Cleanup: Retry deleting shadow-items that previously failed (e.g. network error)
  const hasRetriedDeletions = useRef(false);

  useEffect(() => {
    const retryDeletions = async () => {
      if (
        !userId ||
        deletedIdsRef.current.size === 0 ||
        hasRetriedDeletions.current
      )
        return;
      hasRetriedDeletions.current = true;

      const idsToRetry = Array.from(deletedIdsRef.current);
      console.log(
        "[ConversationProvider] Retrying shadow-deleted items:",
        idsToRetry.length,
      );

      for (const id of idsToRetry) {
        const { error, status } = await supabase
          .from("conversations")
          .delete()
          .eq("id", id);
        // On success OR if not found (already gone), remove from shadow list
        if (!error || status === 404) {
          deletedIdsRef.current.delete(id);
        }
      }

      // Persist the (now smaller) shadow list
      localStorage.setItem(
        "deleted_conversation_ids",
        JSON.stringify(Array.from(deletedIdsRef.current)),
      );
    };

    retryDeletions();
  }, [userId]);

  // Initialize and Sync
  useEffect(() => {
    if (!userId) {
      setRecentConsultations([]);
      setMessages([]);
      setCurrentConsultationId(null);
    }
  }, [userId]);

  // Fetch Cloud Messages if needed
  const fetchCloudMessages = useCallback(
    async (ignore: boolean) => {
      // If we're on the root /consultation route (no ID), clear state and bail
      if (!syncedConversationId) {
        if (isLoading) return;
        if (currentConsultationId !== null || messages.length > 0) {
          handleNewConsultation();
        }
        loadedHistoryIdRef.current = null;
        return;
      }

      if (!userId || !loggedIn) return;

      // If we are looking for a specific conversation/case, we don't strictly need the full sidebar lists (loaded/casesLoaded)
      // to have finished. We can attempt to fetch the messages for that specific ID immediately.
      const isInitialFetchWithId = syncedConversationId && !loaded && !casesLoaded;

      if (!isInitialFetchWithId && (!loaded && !casesLoaded)) return;

      // Prevent race condition: if we intentionally cleared the consultation ID but the URL hasn't updated yet,
      // don't immediately re-fetch the old one.
      if (!currentConsultationId && syncedConversationId && loadedHistoryIdRef.current === syncedConversationId && messages.length === 0) {
        console.log("[ConversationProvider] Intentional clear detected for", syncedConversationId, "- skipping re-fetch");
        return;
      }

      if (loadedHistoryIdRef.current === syncedConversationId && !isLoading)
        return;

      const existsInConversations = conversations.some((c) => c.id.toString() === syncedConversationId);
      const existsInCases = cases.some((c) => c.id.toString() === syncedConversationId);
      const matchesCurrent = currentConsultationId?.toString() === syncedConversationId;

      // If we're on a case route, we might not have `cases` loaded from Supabase yet.
      // Easiest is to just allow the fetch to proceed and fail gracefully if not found,
      // or at least not clear the screen if cases are empty but we specifically routed to a case.
      const isCaseRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/cases/');

      if (!existsInConversations && !existsInCases && !matchesCurrent && !isCaseRoute) {
        if (
          !isLoading &&
          (currentConsultationId !== null || messages.length > 0)
        ) {
          handleNewConsultation();
        }
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", syncedConversationId)
        .order("created_at", { ascending: true });

      if (ignore) {
        setIsLoading(false);
        return;
      }

      if (!error && data) {
        const cloudMessages = data.map(mapCloudMessage);

        setMessages(prev => {
          // If we have local messages for the SAME conversation, merge them to avoid wiping live updates (like streaming AI)
          if (prev.length > 0 && currentConsultationId?.toString() === syncedConversationId) {
            const cloudIds = new Set(cloudMessages.map(m => m.id.toString()));
            const cloudContents = new Set(cloudMessages.map(m => m.text.trim()));

            // Keep local messages that aren't yet in the cloud (by ID or Content match)
            const localOnlyMessages = prev.filter(m => {
              if (cloudIds.has(m.id.toString())) return false;
              if (m.text.trim() && cloudContents.has(m.text.trim())) return false;
              return true;
            });

            return [...cloudMessages, ...localOnlyMessages];
          }

          // If loading a fundamentally different conversation or starting fresh
          return cloudMessages;
        });

        if (!isLoading) {
          loadedHistoryIdRef.current = syncedConversationId.toString();
        }
        setCurrentConsultationId(syncedConversationId);
      } else if (error) {
        console.error("Error fetching messages:", error);
      }
      setIsLoading(false);
    },
    [
      syncedConversationId,
      isLoading,
      userId,
      loggedIn,
      loaded,
      conversations,
      cases,
      supabase,
      mapCloudMessage,
      handleNewConsultation,
      currentConsultationId,
    ],
  );


  useEffect(() => {
    let ignore = false;
    fetchCloudMessages(ignore);
    return () => {
      ignore = true;
    };
  }, [fetchCloudMessages]);

  useEffect(() => {
    if (!loaded && loggedIn) {
      fetchConversations();
    }
  }, [loggedIn, loaded, fetchConversations]);

  // Handlers
  const handleLoadConsultation = (consultation: ConsultationSession) => {
    setMessages(consultation.messages);
    setCurrentConsultationIdWrapper(consultation.id);
  };

  const handleRenameConsultation = async (
    id: string | number,
    newTitle: string,
  ) => {
    const idStr = id.toString();
    console.log(
      `[ConversationProvider] handleRenameConsultation: "${idStr}" -> "${newTitle}"`,
    );

    // 1. Optimistic Update (UI responsiveness)
    setRecentConsultations((prev) => {
      const updated = prev.map((c) =>
        c.id.toString() === idStr ? { ...c, title: newTitle } : c,
      );
      return updated;
    });

    // 2. Atomic DB Update
    if (loggedIn) {
      try {
        console.log(`[ConversationProvider] Cloud Syncing rename: ${idStr}`);
        const { data, error } = await supabase
          .from("conversations")
          .update({ title: newTitle })
          .eq("id", idStr)
          .select();

        if (error) {
          console.error(
            "[ConversationProvider] DB Rename failed:",
            error.message,
          );
        } else if (data && data.length === 0) {
          console.warn(
            "[ConversationProvider] DB Update returned 0 rows. RLS likely blocking update for ID:",
            idStr,
          );
        } else {
          console.log(
            "[ConversationProvider] DB Rename successful. Updated rows:",
            data?.length,
          );
        }
      } catch (err) {
        console.error("[ConversationProvider] Critical rename error:", err);
      }
    }
  };

  // ---- Cases ----
  const fetchCases = useCallback(async () => {
    if (!loggedIn || !userId) return;
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setCases(data as CaseData[]);
      setCasesLoaded(true);
    } catch (err) {
      console.error("[ConversationProvider] fetchCases error:", err);
    }
  }, [loggedIn, userId, supabase]);

  const handleCreateCase = useCallback(
    async (caseData: {
      name: string;
      party: string;
      notes: string;
    }): Promise<CaseData | null> => {
      if (!userId || !loggedIn) {
        console.warn(
          "[ConversationProvider] handleCreateCase: User not authenticated",
        );
        return null;
      }

      try {
        const { data, error } = await supabase
          .from("cases")
          .insert({
            user_id: userId,
            case_name: caseData.name,
            party_involved: caseData.party,
            notes: caseData.notes,
          })
          .select()
          .single();

        if (!error && data) {
          // Create an associated invisible conversation for the case chat
          const { error: convError } = await supabase
            .from("conversations")
            .insert({
              id: data.id,
              user_id: userId,
              title: `[CASE] ${caseData.name}`,
            });

          if (convError) {
            console.error(
              "[ConversationProvider] Failed to link conversation to case:",
              convError.message,
            );
          }

          setCases((prev) => [data as CaseData, ...prev]);
          return data as CaseData;
        } else {
          console.error(
            "[ConversationProvider] handleCreateCase error:",
            error?.message,
          );
          return null;
        }
      } catch (err) {
        console.error(
          "[ConversationProvider] Unexpected error in handleCreateCase:",
          err,
        );
        return null;
      }
    },
    [userId, loggedIn, supabase],
  );

  const handleDeleteCase = useCallback(
    async (id: string) => {
      // Optimistically remove from UI
      setCases((prev) => prev.filter((c) => c.id !== id));

      try {
        const { data: dbCase } = await supabase.from("cases").select("*").eq("id", id).single();
        if (dbCase && dbCase.user_id !== userId) {
          alert(`Wait! You are not the owner. Owner: ${dbCase.user_id}, You: ${userId}`);
        }

        const convRes = await supabase.from("conversations").delete().eq("id", id);
        if (convRes.error) {
          alert(`Conv Delete Error: ${convRes.error.message}`);
        }

        const caseRes = await supabase.from("cases").delete().eq("id", id).select();

        if (caseRes.error) {
          alert(`Case Delete Error: ${caseRes.error.message}`);
          await fetchCases(); // Revert on failure
        } else if (!caseRes.data || caseRes.data.length === 0) {
          alert(`Case delete failed silently. ID: ${id}, user_id: ${dbCase?.user_id}, my id: ${userId}`);
          await fetchCases();
        } else {
          // Success
          console.log("Successfully deleted case:", caseRes.data);
        }
      } catch (err: any) {
        alert(`Critical delete error: ${err?.message || 'Unknown'}`);
        await fetchCases();
      }
    },
    [supabase, fetchCases, userId],
  );

  useEffect(() => {
    if (loggedIn) fetchCases();
  }, [loggedIn, fetchCases]);

  // ---- Bookmarks ----
  const fetchBookmarks = useCallback(async () => {
    if (!loggedIn || !userId) return;
    const data = await getBookmarks(userId);
    setBookmarks(data);
  }, [loggedIn, userId]);

  const handleAddBookmark = useCallback(
    async (bookmark: NewBookmark): Promise<Bookmark | null> => {
      if (!userId || !loggedIn) return null;
      const result = await svcAddBookmark(userId, bookmark);
      if (result) setBookmarks((prev) => [result, ...prev]);
      return result;
    },
    [userId, loggedIn],
  );

  const handleRemoveBookmark = useCallback(async (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    await svcRemoveBookmark(id);
  }, []);

  const isBookmarked = useCallback(
    (itemId: string): string | null => {
      const found = bookmarks.find((b) => b.item_id === itemId);
      return found ? found.id : null;
    },
    [bookmarks],
  );

  useEffect(() => {
    if (loggedIn) fetchBookmarks();
  }, [loggedIn, fetchBookmarks]);

  const sendDocumentToChat = useCallback(
    async (name: string, summary: string, conversationId?: string | number) => {
      // Include ILM_META with isAnalysis: true
      const prompt = `[ILM_META]{"isAnalysis":true}[/ILM_META]I have analyzed a document called "${name}". Here is the AI-generated summary:
    
${summary}

Please help me understand this document or answer questions based on it.`;

      return await handleSendMessage(prompt, conversationId, summary);
    },
    [handleSendMessage],
  );

  const analyzeDocuments = useCallback(
    async (files: File[], caseId: string, customPrompt?: string) => {
      if (files.length === 0) return;

      // 1. Create an optimistic processing message
      const tempId = `analysis-${Date.now()}`;
      const processingMsg: Message = {
        id: tempId,
        text:
          files.length > 1
            ? `Analyzing ${files.length} documents...`
            : `Analyzing ${files[0].name}...`,
        sender: CHAT_SENDER.USER,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        status: "processing",
        isAnalysis: true,
      };

      setMessages((prev) => [...prev, processingMsg]);
      setIsLoading(true);

      try {
        const newDocs: any[] = [];
        for (const file of files) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, text: `Uploading ${file.name}...` } : m,
            ),
          );

          const data = await uploadAndAnalyzeDocument(
            file,
            process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:8001",
            false, // Skip analysis
          );

          newDocs.push({
            id: crypto.randomUUID(),
            name: data.filename,
            timestamp: Date.now(),
            caseId: caseId,
            aiSummary: data.ai_summary,
            file_url: data.file_url,
            s3_key: data.s3_key,
          });
        }

        // Save documents to DB
        if (loggedIn && userId) {
          await supabase
            .from("documents")
            .insert(
              newDocs.map((doc) => ({
                id: doc.id,
                user_id: userId,
                name: doc.name,
                case_id: doc.caseId || null,
                file_url: doc.file_url || null,
                s3_key: doc.s3_key || null,
                ai_summary: null,
              })),
            )
            .select();
        }

        // 3. Clear processing and send to chat
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setIsLoading(false);

        const fileNames = newDocs.map((d) => d.name).join("”, “");

        const attachments = newDocs.map((d) => ({
          name: d.name,
          url: d.file_url,
          type: d.name.split(".").pop() || "file",
          s3_key: d.s3_key,
          ai_summary: d.aiSummary,
        }));

        const metaStr = JSON.stringify({
          isAnalysis: true,
          fileAttachments: attachments,
        });

        const finalPrompt = customPrompt
          ? `[ILM_META]${metaStr}[/ILM_META]ANALYZING\n\n[HIDDEN_INSTRUCTION]I have attached the following document(s): “${fileNames}”.\n\n${customPrompt}[/HIDDEN_INSTRUCTION]`
          : `[ILM_META]${metaStr}[/ILM_META]ANALYZING\n\n[HIDDEN_INSTRUCTION]I have attached the following document(s) for analysis: “${fileNames}”.[/HIDDEN_INSTRUCTION]`;

        await handleSendMessage(finalPrompt, caseId);
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                ...m,
                text: `Error during upload: ${err.message}`,
                status: "error",
              }
              : m,
          ),
        );
        setIsLoading(false);
      }
    },
    [
      loggedIn,
      userId,
      supabase,
      handleSendMessage,
      setIsLoading,
      setMessages,
    ],
  );

  // ---- Voice Recording ----
  const stopRecording = useCallback((messageId: string | number) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null; // Clear ref immediately after stopping
    }
    setIsRecording(prev => ({ ...prev, [messageId]: false }));
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const _internalStartRecording = useCallback(async (messageId: string | number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) chunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const tempUrl = URL.createObjectURL(audioBlob);
        const tempId = Date.now().toString();

        updateMessage(messageId, {
          __appendVoiceNote: { id: tempId, url: tempUrl, label: 'Uploading...' }
        });

        try {
          const { uploadVoiceNote } = await import('@/lib/s3-utils');
          const { file_url, s3_key } = await uploadVoiceNote(audioBlob);
          updateMessage(messageId, {
            __appendVoiceNote: { id: tempId, url: file_url, label: `Voice Note`, s3_key }
          });
        } catch (err) {
          console.error("Failed to upload recording to S3:", err);
          updateMessage(messageId, {
            __appendVoiceNote: { id: tempId, url: tempUrl, label: 'Upload Failed (Local Only)' }
          });
        }

        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(prev => ({ ...prev, [messageId]: 0 }));
      });

      mediaRecorder.start();
      setIsRecording(prev => ({ ...prev, [messageId]: true }));
      setRecordingTime(prev => ({ ...prev, [messageId]: 0 }));

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => ({ ...prev, [messageId]: (prev[messageId] || 0) + 1 }));
      }, 1000);

      // Track the case name for this recording session
      const currentTitle = recentConsultations.find(c => c.id.toString() === currentConsultationId?.toString())?.title || "Legal Consultation";
      setRecordingCaseNames(prev => ({ ...prev, [messageId]: currentTitle }));

    } catch (err) {
      console.error('Microphone access denied or error:', err);
      alert('Could not access microphone.');
    }
  }, [updateMessage, recentConsultations, currentConsultationId]);

  const startRecording = useCallback(async (messageId: string | number) => {
    // 1. Check for conflicts
    const anyActiveId = Object.keys(isRecording).find(id => isRecording[id]);
    if (anyActiveId) {
      // Find the cached title for the active session
      const activeSessionTitle = recordingCaseNames[anyActiveId] || "Active Case";

      setActiveRecordingTitle(activeSessionTitle);
      setConflictRecordingId(messageId);
      return; // HALT - wait for user choice
    }

    await _internalStartRecording(messageId);
  }, [isRecording, recordingCaseNames, _internalStartRecording]);

  const resolveRecordingConflict = useCallback(async (proceed: boolean) => {
    if (proceed && conflictRecordingId) {
      const targetId = conflictRecordingId;

      // 1. Stop the OLD one
      const anyActiveId = Object.keys(isRecording).find(id => isRecording[id]);
      if (anyActiveId) {
        stopRecording(anyActiveId);
        // Small delay to let the browser process the stop command
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 2. Clear conflict state
      setConflictRecordingId(null);
      setActiveRecordingTitle(null);

      // 3. Start the NEW one directly (bypassing redundant check)
      await _internalStartRecording(targetId);
    } else {
      setConflictRecordingId(null);
      setActiveRecordingTitle(null);
    }
  }, [conflictRecordingId, isRecording, stopRecording, _internalStartRecording]);

  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        refreshConversations: fetchConversations,
        messages,
        setMessages,
        isLoading,
        recentConsultations,
        currentConsultationId,
        chatSessionId,
        updateMessage,
        handleSendMessage,
        handleLoadConsultation,
        handleNewConsultation,
        handleRemoveConsultation,
        handleRenameConsultation,
        handleDeleteMessage,
        isSidebarOpen,
        setIsSidebarOpen,
        isDetailSidebarOpen,
        selectedSource,
        selectedCase,
        detailContext,
        openSourceDetail,
        openCaseDetail,
        openSourceByItemId,
        closeDetailSidebar,
        cases,
        refreshCases: fetchCases,
        casesLoaded,
        handleCreateCase,
        handleDeleteCase,
        bookmarks,
        refreshBookmarks: fetchBookmarks,
        addBookmark: handleAddBookmark,
        removeBookmark: handleRemoveBookmark,
        isBookmarked,
        sendDocumentToChat,
        analyzeDocuments,
        documentContext,
        setDocumentContext,
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        formatTime,
        conflictRecordingId,
        activeRecordingTitle,
        resolveRecordingConflict,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}
