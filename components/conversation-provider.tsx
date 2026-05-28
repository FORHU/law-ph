"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Conversation, ConsultationSession, CaseData } from "@/types";
import { useAuth } from "@/components/auth/auth-provider";
import { useParams, useRouter } from "next/navigation";
import { CHAT_SENDER } from "@/lib/constants";
import {
  extractLegalSources,
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
import type { Bookmark, NewBookmark } from "@/lib/bookmarks-service";
import { useAlert } from "./alert-provider";

export function ConversationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loggedIn, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { showAlert } = useAlert();
  const syncedConversationId = (params?.conversationId || params?.id) as
    | string
    | undefined;
  const userId = user?.id;

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
  const isLoadingRef = useRef(false);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSharedCase, setIsSharedCase] = useState(false);

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

            await fetch(`/api/messages/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: newContent }),
            });
          }
        } catch (err) {
          console.error(
            "[ConversationProvider] DB Update message critical error:",
            err,
          );
        }
      }
    },
    [loggedIn, messages],
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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [casesLoaded, setCasesLoaded] = useState(false);

  // Ref to track all IDs deleted during this session to prevent any "resurrection" from stale API data
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const notFoundIdsRef = useRef<Set<string>>(new Set());

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
      const res = await fetch(`/api/conversations/${idStr}`, { method: "DELETE" });

      if (!res.ok) {
        console.warn("[ConversationProvider] DB Delete failed. Shadow-deleting locally.");
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
        await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
      } catch (err) {
        console.error("Unexpected error during message deletion:", err);
      }
    }
  };

  // Helper to map cloud messages to UI format
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
    const rawContent = sender === CHAT_SENDER.AI ? text : undefined;
    const sources =
      sender === CHAT_SENDER.AI ? extractLegalSources(text) : undefined;
    // Don't hardcode undefined — restore from localStorage if previously fetched
    const storedCases = (() => {
      if (sender !== CHAT_SENDER.AI || !msg.id) return undefined;
      try {
        const raw = localStorage.getItem(`lex_rc_${msg.id}`);
        return raw ? JSON.parse(raw) : undefined;
      } catch { return undefined; }
    })();
    const relatedCases = storedCases;
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

    return {
      ...msg,
      text: cleanText,
      sender,
      rawContent,
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
      time: msg.time || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ""),
      authorName: sender === 'user' ? (msg.user?.name || msg.user?.email?.split('@')[0] || undefined) : undefined,
      parentMessageId: msg.parentMessageId ?? undefined,
    };
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!loggedIn || !userId) return;
    console.log(
      "[ConversationProvider] fetchConversations starting for user:",
      userId,
    );

    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) {
        console.warn("[ConversationProvider] fetchConversations: Request failed", res.status);
        return;
      }

      const { conversations: data } = await res.json();

      if (data) {
        const liveData = data.filter(
          (c: any) =>
            !deletedIdsRef.current.has(c.id.toString()) &&
            !(c.title || "").startsWith("[CASE]"),
        );
        console.log(
          "[ConversationProvider] Sync complete. Filtered items:",
          data.length - liveData.length,
        );

        setConversations(liveData);
        // Map basic conversation list to ConsultationSession format for UI compatibility
        const mappedSessions: ConsultationSession[] = liveData.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          subtitle: '',
          messages: [], // Messages are fetched on demand
          createdAt: conv.createdAt || conv.created_at,
          updatedAt: conv.updatedAt || conv.updated_at,
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
  }, [loggedIn, userId]);

  const loadedHistoryIdRef = useRef<string | null>(null);
  // Mirror `conversations` in a ref so fetchCloudMessages can read the latest list
  // without having `conversations` in its dependency array. If conversations were a
  // dep, every sidebar refresh (e.g. after creating a new conversation) would give
  // fetchCloudMessages a new reference → the useEffect would re-fire mid-stream →
  // setMessages would replace the streaming text → visible flicker on first message.
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

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
        const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        // On success OR if not found (already gone), remove from shadow list
        if (res.ok || res.status === 404) {
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

  // Stable ref so fetchCloudMessages can call fetchCases without a forward-reference dep
  const fetchCasesRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Fetch Cloud Messages if needed
  const fetchCloudMessages = useCallback(
    async (ignore: boolean) => {
      // If this ID previously returned 404, never retry it
      if (syncedConversationId && notFoundIdsRef.current.has(syncedConversationId.toString())) return;

      // Skip if the ID is clearly not a conversation/case ID (e.g. legal-library doc title from URL params)
      const isValidSyncId = !syncedConversationId || (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(syncedConversationId) ||
        /^\d+$/.test(syncedConversationId)
      );
      if (!isValidSyncId) return;

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

      if (loadedHistoryIdRef.current === syncedConversationId)
        return;

      const existsInConversations = conversationsRef.current.some((c) => c.id.toString() === syncedConversationId);
      const existsInCases = cases.some((c) => c.id.toString() === syncedConversationId);
      const matchesCurrent = currentConsultationId?.toString() === syncedConversationId;

      // If we're on a case route, allow the fetch to proceed and fail gracefully if not found.
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
      const msgRes = await fetch(`/api/conversations/${syncedConversationId}/messages`);

      if (ignore) {
        setIsLoading(false);
        return;
      }

      if (msgRes.ok) {
        const { messages: data, isShared } = await msgRes.json();
        setIsSharedCase(!!isShared);
        const cloudMessages: Message[] = (data as any[]).map(mapCloudMessage);

        setMessages(prev => {
          // Build a lookup of client-only data (relatedCases, etc.) keyed by message ID
          const prevById = new Map(prev.map(m => [m.id.toString(), m]));

          // Restore client-only fields that aren't persisted to the DB
          const merged = cloudMessages.map(m => {
            const existing = prevById.get(m.id.toString());
            return existing?.relatedCases?.length
              ? { ...m, relatedCases: existing.relatedCases }
              : m;
          });

          // If we have local messages for the SAME conversation, keep any that aren't yet synced to cloud
          if (prev.length > 0 && currentConsultationId?.toString() === syncedConversationId) {
            const cloudIds = new Set(cloudMessages.map(m => m.id.toString()));
            const cloudContents = new Set(cloudMessages.map(m => m.text.trim()));
            const localOnlyMessages = prev.filter(m => {
              if (cloudIds.has(m.id.toString())) return false;
              if (m.text.trim() && cloudContents.has(m.text.trim())) return false;
              return true;
            });
            return [...merged, ...localOnlyMessages];
          }

          return merged;
        });

        if (!isLoading) {
          loadedHistoryIdRef.current = syncedConversationId.toString();
        }
        setCurrentConsultationId(syncedConversationId);
      } else {
        console.error("Error fetching messages:", msgRes.status);
        if (msgRes.status === 404) {
          const isCaseRoute =
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/cases/");

          // Participant was removed — show a brief notice then redirect
          const wasRemovedFromSharedCase = cases.some(
            (c) => c.id.toString() === syncedConversationId?.toString() && c.is_shared
          );
          if (wasRemovedFromSharedCase) {
            setMessages([{
              id: `removed-${Date.now()}`,
              text: "You have been removed from this case.",
              sender: "system",
              time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            }]);
            setIsLoading(false);
            setTimeout(() => {
              fetchCasesRef.current();
              router.replace("/consultation");
            }, 2500);
            return;
          }

          if (isCaseRoute || existsInCases) {
            try {
              const caseRes = await fetch(`/api/cases/${syncedConversationId}`);
              const caseName = caseRes.ok
                ? (await caseRes.json()).case?.caseName ?? "Case"
                : "Case";

              const provisionRes = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: syncedConversationId, title: `[CASE] ${caseName}` }),
              });

              if (provisionRes.ok) {
                const retryRes = await fetch(`/api/conversations/${syncedConversationId}/messages`);
                if (retryRes.ok) {
                  const { messages: data } = await retryRes.json();
                  const cloudMessages: Message[] = (data as any[]).map(mapCloudMessage);
                  setMessages(prev => {
                    const prevById = new Map(prev.map(m => [m.id.toString(), m]));
                    return cloudMessages.map(m => {
                      const existing = prevById.get(m.id.toString());
                      return existing?.relatedCases?.length ? { ...m, relatedCases: existing.relatedCases } : m;
                    });
                  });
                  loadedHistoryIdRef.current = syncedConversationId.toString();
                  setCurrentConsultationId(syncedConversationId);
                }
              }
            } catch (err) {
              console.error("[ConversationProvider] Error provisioning conversation:", err);
            }
          } else {
            notFoundIdsRef.current.add(syncedConversationId.toString());
            loadedHistoryIdRef.current = syncedConversationId.toString();
            persistDeletedId(syncedConversationId.toString());
            router.replace("/consultation");
          }
        } else {
          // Prevent infinite loops on non-404 failure by marking this ID as loaded/attempted
          loadedHistoryIdRef.current = syncedConversationId.toString();
        }
      }
      setIsLoading(false);
    },
    [
      syncedConversationId,
      userId,
      loggedIn,
      loaded,
      cases,
      mapCloudMessage,
      handleNewConsultation,
      currentConsultationId,
      router,
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

  // Poll for new messages every 3s when viewing a shared case (other participants can write).
  // Pauses automatically when the browser tab is hidden — resumes on visibility.
  useEffect(() => {
    if (!isSharedCase || !syncedConversationId || !loggedIn) return;

    let tabHidden = typeof document !== 'undefined' && document.hidden;
    const onVisibilityChange = () => { tabHidden = document.hidden; };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const interval = setInterval(async () => {
      if (tabHidden) return;
      try {
        const res = await fetch(`/api/conversations/${syncedConversationId}/messages`);
        if (!res.ok) return;
        const { messages: data } = await res.json();
        const cloudMessages: Message[] = (data as any[]).map(mapCloudMessage);

        setMessages(prev => {
          if (isLoadingRef.current) return prev;

          const cloudIds = new Set(cloudMessages.map(m => m.id.toString()));
          const cloudContents = new Set(cloudMessages.map(m => m.text.trim()));
          const localOnly = prev.filter(m => {
            if (cloudIds.has(m.id.toString())) return false;
            if (m.text.trim() && cloudContents.has(m.text.trim())) return false;
            return true;
          });

          if (localOnly.length === 0 && cloudMessages.length === prev.length) return prev;
          return [...cloudMessages, ...localOnly];
        });
      } catch {
        // silent — polling failure should never surface to the user
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isSharedCase, syncedConversationId, loggedIn, mapCloudMessage]);

  // Handlers
  const handleLoadConsultation = (consultation: ConsultationSession) => {
    setMessages(prev => {
      const prevById = new Map(prev.map(m => [m.id.toString(), m]));
      return consultation.messages.map(m => {
        const existing = prevById.get(m.id.toString());
        return existing?.relatedCases?.length ? { ...m, relatedCases: existing.relatedCases } : m;
      });
    });
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
        const res = await fetch(`/api/conversations/${idStr}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        if (!res.ok) {
          console.error("[ConversationProvider] DB Rename failed:", res.status);
        } else {
          console.log("[ConversationProvider] DB Rename successful.");
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
      const res = await fetch("/api/cases");
      if (res.ok) {
        const json = await res.json();
        setCases(json.cases as CaseData[]);
      }
      setCasesLoaded(true);
    } catch (err) {
      console.error("[ConversationProvider] fetchCases error:", err);
    }
  }, [loggedIn, userId]);

  // Keep the ref in sync so fetchCloudMessages can call it without a forward-reference dep
  useEffect(() => { fetchCasesRef.current = fetchCases; }, [fetchCases]);

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
        const res = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseName: caseData.name, partyInvolved: caseData.party, notes: caseData.notes }),
        });

        if (res.ok) {
          const json = await res.json();
          const newCase = json.case as CaseData;
          setCases((prev) => [newCase, ...prev]);
          return newCase;
        } else {
          console.error("[ConversationProvider] handleCreateCase error:", res.status);
          return null;
        }
      } catch (err) {
        console.error("[ConversationProvider] Unexpected error in handleCreateCase:", err);
        return null;
      }
    },
    [userId, loggedIn],
  );

  const handleDeleteCase = useCallback(
    async (id: string) => {
      // Optimistically remove from UI
      setCases((prev) => prev.filter((c) => c.id !== id));

      try {
        const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
        if (!res.ok) {
          console.error("[ConversationProvider] handleDeleteCase error:", res.status);
          await fetchCases();
        } else {
          console.log("[ConversationProvider] Successfully deleted case:", id);
          // Redirect away if the user is currently viewing the deleted case
          if (typeof window !== "undefined" && window.location.pathname.startsWith(`/cases/${id}`)) {
            router.push("/consultation");
          }
        }
      } catch (err: any) {
        console.error("[ConversationProvider] Critical delete error:", err?.message || "Unknown");
        await fetchCases();
      }
    },
    [fetchCases, router],
  );

  useEffect(() => {
    if (loggedIn) fetchCases();
  }, [loggedIn, fetchCases]);

  // ---- Bookmarks ----
  const fetchBookmarks = useCallback(async () => {
    if (!loggedIn || !userId) return;
    const res = await fetch("/api/bookmarks");
    if (res.ok) {
      const { bookmarks: data } = await res.json();
      setBookmarks(data ?? []);
    }
  }, [loggedIn, userId]);

  const handleAddBookmark = useCallback(
    async (bookmark: NewBookmark): Promise<Bookmark | null> => {
      if (!loggedIn) return null;
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookmark),
      });
      if (!res.ok) return null;
      const { bookmark: result } = await res.json();
      if (result) setBookmarks((prev) => [result, ...prev]);
      return result ?? null;
    },
    [loggedIn],
  );

  const handleRemoveBookmark = useCallback(async (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
  }, []);

  const isBookmarked = useCallback(
    (itemId: string): string | null => {
      const found = bookmarks.find((b) => b.itemId === itemId);
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
            "http://localhost:8000",
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
          await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documents: newDocs.map((doc) => ({
                id: doc.id,
                name: doc.name,
                case_id: doc.caseId || null,
                file_url: doc.file_url || null,
                s3_key: doc.s3_key || null,
                ai_summary: null,
              })),
            }),
          });
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
      showAlert('Could not access microphone. Please check your browser permissions.', 'Microphone Error');
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
        isSharedCase,
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
