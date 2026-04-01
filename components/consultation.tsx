"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  History,
  GitGraph,
  Mail,
  Calendar,
  Sparkles,
  Briefcase,
  PenTool,
  Layout,
  Upload,
  FileText as FileIcon,
  X,
  Loader2
} from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { CHAT_SENDER, STORAGE_KEYS, ASSETS } from "@/lib/constants";
import { uploadAndAnalyzeDocument } from "@/lib/s3-utils";
import { Session } from "@supabase/supabase-js";
import { Conversation } from "@/types";

import { useAuth } from "@/components/auth/auth-provider";
import { useConversations, Message } from "@/components/conversation-provider/conversation-context";

import { PageLayout } from "@/components/ui/page-layout";

// Sub-components
import { ConsultationHeader } from "./consultation/consultation-header";
import { QuickQuestions } from "./consultation/quick-questions";
import { MessageList } from "./consultation/message-list";
import { ChatInput } from "./consultation/chat-input";
import { SourceDetailSidebar } from "./consultation/source-detail-sidebar";
import { NoteSidebar } from "./consultation/note-sidebar";
import { MindMap } from "./consultation/mind-map";
import { DocumentAnalyzer } from "./consultation/document-analyzer";
import { Timeline } from "@/components/ui/timeline";

import { useConsultationState } from "./consultation/use-consultation-state";
import { useConsultationEffects } from "./consultation/use-consultation-effects";
import { checkAuthStatus } from "@/lib/calendar-api";

export default function Consultation() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const emailTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scheduleTextareaRef = useRef<HTMLTextAreaElement>(null);
  // Stable ref so the schedule form can trigger a tab switch without a circular dep
  const switchToTabRef = useRef<((tab: any) => void) | null>(null);
  const router = useRouter();
  const params = useParams();
  const activeConversationId = (params?.conversationId || params?.id) as
    | string
    | undefined;
  const { loggedIn, supabase, session } = useAuth();

  useEffect(() => {
    if (!loggedIn) {
      router.push("/auth/login");
    }
  }, [loggedIn, router]);

  const {
    messages,
    setMessages,
    isLoading,
    recentConsultations,
    currentConsultationId,
    handleLoadConsultation,
    handleNewConsultation: coreHandleNewConsultation,
    handleRemoveConsultation,
    handleRenameConsultation,
    handleSendMessage,
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
    updateMessage,
    cases,
    analyzeDocuments
  } = useConversations();

  const activeCase = activeConversationId
    ? cases.find((c) => c.id === activeConversationId)
    : null;
  const isCaseMode = !!activeCase;

  const handleGetCaseInsight = () => {
    if (activeCase) {
      const prompt = `[Case Analysis Request] I have opened a new case. Please provide your professional insight, a strategic plan, and a proposed timeline of actionable steps. Do not repeat the facts or notes in your insight, just provide pure strategy and advice.

Case Name: ${activeCase.case_name}
Party Involved: ${activeCase.party_involved || "N/A"}
Notes/Transcript: ${activeCase.notes || "None provided"}`;

      handleSendMessage(prompt);
    }
  };

  const handleViewCaseDetails = () => {
    if (activeCase) {
      setIsSidebarOpen(false);

      // Collect all voice notes from every message in this case
      const allVoiceNotes: {
        id: string;
        url: string;
        label?: string;
        messageTime?: string;
      }[] = [];
      messages.forEach((msg) => {
        const notes =
          msg.voiceNotes ||
          (msg.recordingUrl ? [{ id: "legacy", url: msg.recordingUrl }] : []);
        notes.forEach((note: any, idx: number) => {
          allVoiceNotes.push({
            id: note.id,
            url: note.url,
            label:
              note.label ||
              `Recording from ${msg.time || "unknown time"}${notes.length > 1 ? ` (#${idx + 1})` : ""}`,
            messageTime: msg.time,
          });
        });
      });

      // Collect all transcribed text (text from user messages that were sent via voice/transcription)
      const transcribedTexts = messages
        .filter(
          (m) =>
            m.sender === "user" &&
            m.voiceNotes &&
            m.voiceNotes.length > 0 &&
            m.text &&
            !m.text.startsWith("[Case Analysis Request]"),
        )
        .map((m) => m.text.trim())
        .filter(Boolean);

      let description = `**Party Involved:** ${activeCase.party_involved || "N/A"}\n\n**Notes:**\n${activeCase.notes || "None provided"}`;

      if (transcribedTexts.length > 0) {
        description += `\n\n---\n\n**Transcribed Audio Notes:**\n${transcribedTexts.map((t, i) => `${i + 1}. ${t}`).join("\n\n")}`;
      }

      openCaseDetail({
        caseNumber: activeCase.id.toString(),
        title: activeCase.case_name,
        description,
        isLocalCase: true,
        voiceNotes: allVoiceNotes,
      } as any);
    }
  };

  const [isNoteSidebarOpen, setIsNoteSidebarOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [selectedNoteMessage, setSelectedNoteMessage] = useState<{
    id: string | number;
    text: string;
  } | null>(null);

  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      checkAuthStatus(session.user.id)
        .then((status) => setIsGoogleConnected(status.authenticated))
        .catch(() => setIsGoogleConnected(false));
    }
  }, [session?.user?.id]);

  console.log(
    "[Consultation] Render. Messages:",
    messages.length,
    "RecentItems:",
    recentConsultations.length,
    "ActiveID:",
    activeConversationId,
  );


  // Separated Logic
  const { globalTab, setGlobalTab, handleTabChange, emailState, scheduleState, derivedData } = useConsultationState({
    messages,
    activeCase,
    scrollContainerRef,
    supabase,
    userId: session?.user?.id,
    isGoogleConnected,
    handleSendMessage: (msg: string) => handleSendMessage(msg, activeConversationId),
    onTabChange: (tab) => switchToTabRef.current?.(tab),
  });
  // Sync handleTabChange into the stable ref after each render
  switchToTabRef.current = handleTabChange;

  useConsultationEffects({
    messages, isLoading, router, currentConsultationId, activeConversationId, scrollContainerRef, handleSendMessage
  });


  let activeTimeline = derivedData.activeTimeline;
  let activeMindMap = derivedData.activeMindMap;
  const {
    emailTo,
    setEmailTo,
    emailSubject,
    setEmailSubject,
    emailBody,
    setEmailBody,
    isSendingEmail,
    emailSentStatus,
    emailErrorMessage,
    handleSendEmail,
  } = emailState;
  const { scheduleType, setScheduleType, scheduleDateTime, setScheduleDateTime, scheduleEmail, setScheduleEmail, scheduleNotes, setScheduleNotes, isScheduling, scheduleStatus, handleScheduleEvent } = scheduleState;


  const lastIdRef = useRef<string | null>(null);

  // Handle URL hash scrolling (e.g., from bookmarks)
  useEffect(() => {
    const handleHashScroll = () => {
      if (messages.length === 0) return;
      const hash = window.location.hash;
      if (hash && hash.startsWith("#message-")) {
        const messageId = hash.replace("#message-", "");
        setTimeout(() => {
          const el = document.getElementById(`message-bubble-${messageId}`);
          if (el && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const topPos =
              el.getBoundingClientRect().top -
              container.getBoundingClientRect().top +
              container.scrollTop;
            container.scrollTo({
              top: topPos - 100, // Extra padding for the header
              behavior: "smooth",
            });
            // Clear hash after scrolling to allow re-triggering
            router.replace(window.location.pathname, { scroll: false });
          }
        }, 300); // Wait for potential rendering/loading
      }
    };

    // Attempt to scroll when messages array changes
    handleHashScroll();

    // Listen to hashchange event if already on the page
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, [messages.length, router]);

  // Sync state to URL for new consultations
  useEffect(() => {
    // Only redirect if we have a real UUID (string), and we aren't already on that URL
    const shouldRedirect =
      currentConsultationId &&
      typeof currentConsultationId === "string" &&
      !activeConversationId &&
      currentConsultationId !== lastIdRef.current;

    if (shouldRedirect) {
      lastIdRef.current = currentConsultationId as string;
      // Use replace so we don't blow up the history stack, and it transitions smoothly
      router.replace(`/consultation/${currentConsultationId}`);
    }
  }, [currentConsultationId, activeConversationId, router]);

  // Handle Legal Wizard Data
  useEffect(() => {
    const wizardDataStr = sessionStorage.getItem("legal_wizard_data");

    // Check if we have data, no messages, no active consultation, AND checking isLoading to ensure socket is likely ready
    if (
      wizardDataStr &&
      messages.length === 0 &&
      !currentConsultationId &&
      !isLoading
    ) {
      try {
        const data = JSON.parse(wizardDataStr);

        // Construct a more natural "User" message
        // Handle "Other" vs specific categories text
        const issueText = data.specificIssue
          ? `specifically regarding ${data.specificIssue}`
          : "";
        const descriptionText = data.description
          ? `Here are the details: "${data.description}"`
          : "";

        const prompt = `I am a ${data.userType} dealing with a ${data.legalArea} matter ${issueText}. ${descriptionText} ${data.consultationHistory}. My primary goal is to ${data.primaryGoal}. The situation is ${data.urgency}.`;

        // Store wizard data in sessionStorage with a special flag for title generation
        sessionStorage.setItem(
          "wizard_title_data",
          JSON.stringify({
            userType: data.userType,
            legalArea: data.legalArea,
            specificIssue:
              data.specificIssue || data.description?.substring(0, 30),
          }),
        );

        // Small delay to ensure socket/auth is stable
        const timer = setTimeout(() => {
          handleSendMessage(prompt);
          sessionStorage.removeItem("legal_wizard_data");
        }, 500);

        return () => clearTimeout(timer);
      } catch (e) {
        console.error("Failed to parse wizard data", e);
      }
    }
  }, [messages.length, currentConsultationId, handleSendMessage, isLoading]);

  const onSendMessage = (msg: string, file?: File | null, skipAIResponse?: boolean) => {
    if (file || msg.trim()) {
      handleSendMessage(msg, activeConversationId, undefined, file, skipAIResponse);
      if (globalTab !== 'chat') handleTabChange('chat');
    }
  };

  const handleAnalyzeFile = async (file: File): Promise<void> => {
    setIsAnalysisModalOpen(false); // Close modal as soon as file is accepted

    // Unified Flow: Start the message process immediately
    // filename as text satisfies the (text.trim() || file) check
    handleSendMessage(file.name, activeConversationId, undefined, file, false, true);
  };

  const handleDocumentAnalyzed = (data: any) => {
    handleTabChange('chat');
    const { ai_summary, filename, file_url, s3_key } = data;
    const content = ai_summary || "";

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

    const isPreAnalyzed = content.includes('## ');
    const prompt = isPreAnalyzed
      ? `[ILM_META]${metaStr}[/ILM_META][HIDDEN_INSTRUCTION]I have uploaded a legal document titled "${filename}". Here is the initial AI analysis:\n\n${content}\n\n---\n\nBased on this analysis, please provide:\n1. **Additional Insights** — anything important the analysis may have missed or should expand on.\n2. **Practical Recommendations** — specific, actionable steps I or my client should take immediately.\n3. **Key Risk Flags** — the top 3 most critical legal risks in this document and how to mitigate them.\n4. **Suggested Follow-up Questions** — questions I should be asking a lawyer or the other party regarding this document.\n5. **Next Steps** — a prioritized action plan (e.g., what to sign, register, negotiate, or dispute).[/HIDDEN_INSTRUCTION]`
      : `[ILM_META]${metaStr}[/ILM_META][HIDDEN_INSTRUCTION][Document Analysis Request] Please analyze the following legal document titled "${filename}". Provide:\n1. A comprehensive summary of the document.\n2. Key legal issues, obligations, and rights.\n3. Relevant Philippine laws or jurisprudence.\n4. Notable clauses or concerns.\n5. Practical recommendations and next steps.\n\nDocument:\n\n${content}[/HIDDEN_INSTRUCTION]`;

    handleSendMessage(prompt);
  };

  const DocumentAnalysisModal = () => {
    const [dragActive, setDragActive] = useState(false);
    const modalFileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
      else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.length) {
        handleAnalyzeFile(e.dataTransfer.files[0]);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsAnalysisModalOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-[#1A1A1A] border border-[#8B4564]/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E0A7C2]" />
                Upload Document
              </h2>
              <button
                onClick={() => setIsAnalysisModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => modalFileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer group ${dragActive
                  ? 'border-[#E0A7C2] bg-[#8B4564]/10 scale-[1.02]'
                  : 'border-[#8B4564]/30 hover:border-[#8B4564]/60 bg-[#2A2A2A]/40'
                }`}
            >
              <input
                ref={modalFileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleAnalyzeFile(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#8B4564]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Upload size={32} className="text-[#E0A7C2]" />
                </div>
                <div>
                  <p className="text-lg font-medium text-white mb-1">
                    Drop documents here or click to browse
                  </p>
                  <p className="text-sm text-gray-500 max-w-[280px] mx-auto">
                    PDF, DOC, DOCX, TXT (Max 20MB). Your analysis will start automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };


  /* sidebarRecentItems update to include onRename */
  const sidebarRecentItems = recentConsultations.map((c: any) => ({
    id: c.id,
    title: c.title,
    onClick: () => {
      setGlobalTab("chat");
      router.push(`/consultation/${c.id}`);
      setIsSidebarOpen(false); // Close sidebar on selection (mobile friendly)
    },
    onRemove: async () => {
      console.log("[Consultation] Removing item in sidebar:", c.id);
      const isDeletingActive =
        c.id === activeConversationId ||
        c.id?.toString() === currentConsultationId?.toString();

      // If we are deleting the active one, push BEFORE awaiting to clear the URL ID immediately
      if (isDeletingActive) {
        console.log(
          "[Consultation] Deleting active item, pushing to /consultation",
        );
        router.push("/consultation");
        setGlobalTab("chat");
      }

      await handleRemoveConsultation(c.id);
    },
    onRename: (newTitle: string) => handleRenameConsultation(c.id, newTitle),
  }));

  const handleNewConsultation = () => {
    coreHandleNewConsultation();
    setGlobalTab("chat");
    setIsSidebarOpen(false); // Close sidebar for new chat

    // Forcefully push and clear history logic
    if (window.location.pathname !== "/consultation") {
      router.push("/consultation");
    } else {
      router.replace("/consultation", { scroll: false }); // Ensure URL is clean
    }
  };

  // Find active conversation for title
  const activeConversation =
    recentConsultations.find((c: any) => c.id === currentConsultationId) ||
    (activeConversationId
      ? recentConsultations.find((c: any) => c.id === activeConversationId)
      : null);

  let headerTitle = activeConversation?.title || "New Consultation";
  if (isCaseMode && activeCase) {
    headerTitle = activeCase.case_name;
  }
  const isDefaultTitle = !activeConversation && !isCaseMode;

  return (
    <PageLayout
      activePage="chat"
      title={headerTitle}
      subtitle={undefined}
      maxWidth={globalTab === "mindmap" ? "max-w-6xl" : "max-w-4xl"}
      onNewItem={handleNewConsultation}
      newItemLabel="New Consultation"
      recentItems={sidebarRecentItems}
      isEditable={!isDefaultTitle}
      onTitleChange={(newTitle) => {
        if (currentConsultationId) {
          handleRenameConsultation(currentConsultationId, newTitle);
        }
      }}
      onBack={() => {
        if (!currentConsultationId && !isCaseMode) {
          router.push("/");
        } else {
          handleNewConsultation();
        }
      }}
      headerActions={
        <div className="flex items-center gap-2">
          {isCaseMode && activeCase && messages.length > 0 && (
            <button
              onClick={handleViewCaseDetails}
              className="text-[#E0A7C2] hover:text-white flex items-center gap-1.5 transition-colors text-xs font-semibold px-3 py-1.5 bg-[#8B4564]/20 hover:bg-[#8B4564]/50 border border-[#8B4564]/30 rounded-full"
            >
              <Briefcase size={13} /> View Case Details
            </button>
          )}
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 relative pb-6 md:pb-10">
        <div
          ref={scrollContainerRef}
          className={`flex-1 ${globalTab === "mindmap" ? "overflow-hidden" : "overflow-y-auto"} ${globalTab === "mindmap" ? "px-2 md:px-4 py-2" : "px-4 md:px-6 py-4 md:pt-8 md:pb-16 pb-2"} scroll-smooth landscape:py-2`}
        >
          <div
            className={`${globalTab === "mindmap" ? "max-w-6xl" : "max-w-4xl"} mx-auto w-full ${messages.length === 0 ? "h-full flex flex-col justify-start pt-4 md:pt-8" : ""}`}
          >
            <AnimatePresence mode="wait">
              {messages.length === 0 && (
                <motion.div
                  key="quick-questions-top"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-8"
                >
                  {isCaseMode && activeCase ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                      <div className="bg-[#8B4564]/10 p-4 rounded-full">
                        <MessageSquare className="w-8 h-8 text-[#E0A7C2]" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold">
                          Case: {activeCase.case_name}
                        </h2>
                        <p className="text-gray-400 max-w-md mx-auto">
                          Ready to analyze this case. The AI can review the
                          parties involved and notes to provide an initial
                          strategy and timeline.
                        </p>
                      </div>
                      <button
                        onClick={handleGetCaseInsight}
                        className="bg-[#8B4564] hover:bg-[#7a3c58] text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg shadow-[#8B4564]/20 flex items-center gap-2"
                      >
                        <Sparkles size={18} />
                        Get AI Insight
                      </button>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <div className="inline-flex p-5 bg-[#8B4564]/10 rounded-full mb-4">
                        <MessageSquare size={32} className="text-[#E0A7C2]" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">
                        Start a New Consultation
                      </h2>
                      <p className="text-gray-400 max-w-md mx-auto">
                        Describe your legal situation and get immediate
                        AI-powered guidance.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {globalTab === "chat" ? (
              <MessageList
                messages={messages.map((m) => {
                  if (
                    m.sender === CHAT_SENDER.USER &&
                    m.text.startsWith("[Case Analysis Request]")
                  ) {
                    return {
                      ...m,
                      text: activeCase
                        ? `Requesting AI analysis for "${activeCase.case_name}"...`
                        : "Requesting AI Case Analysis...",
                    };
                  }
                  return m;
                })}
                onDelete={handleDeleteMessage}
                onSourceClick={(s, c) => {
                  openSourceDetail(s, c);
                  setIsSidebarOpen(false);
                }}
                onCaseClick={(cs, c) => {
                  openCaseDetail(cs, c);
                  setIsSidebarOpen(false);
                }}
                onSourceLinkClick={(id) => {
                  if (id && id !== "__NAVIGATE__") {
                    openSourceByItemId(id);
                  }
                  setIsSidebarOpen(false);
                }}
                onUpdateMessage={updateMessage}
                onOpenNote={(msgId, msgText) => {
                  setSelectedNoteMessage({ id: msgId, text: msgText });
                  setIsNoteSidebarOpen(true);
                  setIsSidebarOpen(false); // Already present, but good to keep
                }}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
              />
            ) : globalTab === "timeline" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
                {activeTimeline.length > 0 ? (
                  <Timeline data={activeTimeline} />
                ) : (
                  <div className="py-20 text-center">
                    <div className="inline-flex p-5 bg-[#8B4564]/10 rounded-full mb-4">
                      <GitGraph size={32} className="text-[#E0A7C2]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                      Consultation Timeline
                    </h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Chronological overview of the legal proceedings and
                      evidence. Ask the AI to generate a plan to see it here.
                    </p>
                  </div>
                )}
              </div>
            ) : globalTab === 'email' ? (
              <div className="animate-in fade-in zoom-in duration-300 w-full max-w-2xl mx-auto py-8 px-4 h-full flex items-center">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden w-full">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#E0A7C2]/10 text-[#E0A7C2] rounded-xl flex-shrink-0">
                        <Mail size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">Draft Email</h2>
                        <p className="text-xs md:text-sm text-gray-400">Share findings and case summaries.</p>
                      </div>
                    </div>

                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Auto-fill from AI Findings (Optional)</label>
                      <div className="relative">
                        <select
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none focus:border-[#E0A7C2]/50 focus:ring-1 focus:ring-[#E0A7C2]/50 transition-all appearance-none cursor-pointer"
                          onChange={(e) => {
                            setEmailBody(e.target.value);
                          }}
                        >
                          <option value="">-- Select an AI finding to insert --</option>
                          {messages.filter(m => m.sender === 'ai' && m.text.length > 20).map((m, idx) => (
                            <option key={idx} value={m.text}>{m.text.substring(0, 60)}...</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center px-1 text-gray-500">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">To</label>
                      <input
                        type="email"
                        placeholder="client@example.com"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E0A7C2]/50 focus:ring-1 focus:ring-[#E0A7C2]/50 transition-all placeholder:text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Subject</label>
                      <input
                        type="text"
                        placeholder="Update on Case Findings"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E0A7C2]/50 focus:ring-1 focus:ring-[#E0A7C2]/50 transition-all placeholder:text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                        Message
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Hello, I am writing to share the latest AI findings regarding..."
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E0A7C2]/50 focus:ring-1 focus:ring-[#E0A7C2]/50 transition-all placeholder:text-gray-600 resize-none"
                      ></textarea>
                    </div>

                    <div className="pt-2 flex flex-col items-end gap-2">
                      <button
                        className={`bg-[#E0A7C2] text-black font-semibold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 ${emailSentStatus === 'success' ? '!bg-green-500 !text-white' :
                            emailSentStatus === 'error' ? '!bg-red-500 !text-white' :
                              'hover:bg-white'
                          }`}
                        onClick={handleSendEmail}
                        disabled={isSendingEmail}
                      >
                        {isSendingEmail ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </span>
                        ) : emailSentStatus === 'success' ? (
                          <span className="flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Sent Successfully
                          </span>
                        ) : emailSentStatus === 'error' ? (
                          <span>Failed to Send</span>
                        ) : (
                          <>
                            <Mail size={16} /> Send Email
                          </>
                        )}
                      </button>
                      {emailSentStatus === 'error' && emailErrorMessage && (
                        <p className="text-red-400 text-xs text-right max-w-sm">
                          {emailErrorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : globalTab === 'schedule' ? (
              <div className="animate-in fade-in zoom-in duration-300 w-full max-w-2xl mx-auto py-8 px-4 h-full flex items-center">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative w-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-[#10B981]/10 text-[#10B981] rounded-xl flex-shrink-0">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white">Schedule Event</h2>
                      <p className="text-xs md:text-sm text-gray-400">Book meetings, appointments, or hearings.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Event Type</label>
                        <select
                          value={scheduleType}
                          onChange={(e) => setScheduleType(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all appearance-none cursor-pointer"
                        >
                          <option>Meeting</option>
                          <option>Appointment</option>
                          <option>Hearing</option>
                          <option>Deposition</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Date & Time</label>
                        <input
                          type="datetime-local"
                          value={scheduleDateTime}
                          onChange={(e) => setScheduleDateTime(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Client Email</label>
                      <input
                        type="email"
                        placeholder="client@example.com"
                        value={scheduleEmail}
                        onChange={(e) => setScheduleEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all placeholder:text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Description / Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Discuss evidence strategy and finalize documentation..."
                        value={scheduleNotes}
                        onChange={(e) => setScheduleNotes(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all placeholder:text-gray-600 resize-none"
                      ></textarea>
                    </div>

                    <div className="pt-4 flex justify-end">
                      {scheduleStatus === 'success' ? (
                        <div className="flex flex-col items-end gap-3 w-full">
                          <div className="flex items-center gap-2 text-white bg-white/10 px-4 py-2 rounded-xl border border-[#10B981]/30">
                            <span className="text-[#10B981] font-bold">✓ Scheduled Successfully</span>
                          </div>
                          <a
                            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(scheduleType)}&dates=${new Date(scheduleDateTime).toISOString().replace(/-|:/g, '').replace(/\.\d{3}/, '')}/${new Date(new Date(scheduleDateTime).getTime() + 3600000).toISOString().replace(/-|:/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(scheduleNotes)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#10B981] hover:text-white transition-colors flex items-center gap-1.5 underline underline-offset-4"
                          >
                            <Calendar size={12} /> Add to your Google Calendar
                          </a>
                        </div>
                      ) : (
                        <button
                          className={`bg-[#10B981] text-black font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 ${scheduleStatus === 'error' ? '!bg-red-500 !text-white' :
                                'hover:bg-white'
                            }`}
                          onClick={handleScheduleEvent}
                          disabled={isScheduling}
                        >
                          {isScheduling ? "Scheduling..." :
                            scheduleStatus === 'error' ? "Failed to Schedule" :
                              <>
                                <Calendar size={16} /> Schedule Event
                              </>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : globalTab === "document" ? (
              <div className="animate-in fade-in zoom-in duration-300 w-full max-w-2xl mx-auto py-1">
                <DocumentAnalyzer
                  onDocumentAnalyzed={handleDocumentAnalyzed}
                  disabled={isLoading}
                />
              </div>
            ) : globalTab === "mindmap" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-2">
                <MindMap
                  rootTitle={activeCase ? activeCase.case_name : "Case Analysis"}
                  data={activeMindMap}
                />
                {!activeMindMap && messages.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => handleSendMessage("Please generate a visual strategy map for this case.")}
                      className="bg-[#8B4564]/20 hover:bg-[#8B4564]/40 border border-[#8B4564]/50 text-[#E0A7C2] px-6 py-3 rounded-xl flex items-center gap-2 transition-all group"
                    >
                      <Layout className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-sm">Generate Strategy Map</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full px-4 md:px-6 relative z-10">
          <div className="h-6 mb-1">
            {isLoading && messages.length > 0 && messages[messages.length - 1].sender === CHAT_SENDER.USER && messages[messages.length - 1].status !== 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-gray-400"
              >
                <div className="flex gap-1">
                  <span
                    className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></span>
                  <span
                    className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></span>
                  <span
                    className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></span>
                </div>
                <span>ilovelawyer is thinking...</span>
              </motion.div>
            )}
          </div>
        </div>

        <ChatInput
          onSend={onSendMessage}
          disabled={isLoading}
          activeTab={globalTab}
          onTabChange={handleTabChange}
          hasMessages={messages.length > 0}
          isCaseMode={isCaseMode}
          onAnalyzeFile={handleAnalyzeFile}
          onAnalyzeClick={() => setIsAnalysisModalOpen(true)}
          isAnalyzing={false}
        />
      </div>

      {/* Document Analysis Modal */}
      <AnimatePresence>
        {isAnalysisModalOpen && <DocumentAnalysisModal />}
      </AnimatePresence>

      {/* Source Detail Sidebar */}
      <SourceDetailSidebar
        isOpen={isDetailSidebarOpen}
        onClose={closeDetailSidebar}
        source={selectedSource || undefined}
        caseItem={selectedCase || undefined}
        context={detailContext}
      />

      {/* Note Sidebar Overlay */}
      <NoteSidebar
        isOpen={isNoteSidebarOpen}
        onClose={() => setIsNoteSidebarOpen(false)}
        messageText={selectedNoteMessage?.text}
        messageId={selectedNoteMessage?.id}
        onUpdateMessage={updateMessage}
        highlights={
          messages.find((m) => m.id === selectedNoteMessage?.id)?.highlights
        }
      />
    </PageLayout>
  );
}

