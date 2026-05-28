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
  Loader2,
  AlertCircle,
  CheckCircle,
  Send,
  ChevronDown,
  Check
} from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { PageLoader } from "@/components/ui/page-loader";
import { CHAT_SENDER, STORAGE_KEYS, ASSETS } from "@/lib/constants";
import { uploadAndAnalyzeDocument, formatS3Url } from "@/lib/s3-utils";
import { Conversation } from "@/types";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useAuth } from "@/components/auth/auth-provider";
import { useConversations, Message } from "@/components/conversation-provider/conversation-context";

import { PageLayout } from "@/components/ui/page-layout";
import { DateBox } from "@/components/ui/datebox";

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
import { CaseInviteButton } from "./consultation/case-invite-button";
import { CaseMembersButton } from "./consultation/case-members-button";
import TranscribeWorkspace from "./transcribe/transcribe-workspace";

import { useConsultationState } from "./consultation/use-consultation-state";
import { useConsultationEffects } from "./consultation/use-consultation-effects";
import { checkAuthStatus } from "@/lib/calendar-api";
import { RecordingConflictModal } from "./consultation/recording-conflict-modal";
import { synthesizeSpeech } from "@/lib/aws-polly-utils";

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
  const { loggedIn, user } = useAuth();

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
    handleSendMessage: coreSendMessage,
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
    casesLoaded,
    analyzeDocuments,
    isRecording,
    recordingTime,
    stopRecording,
    formatTime,
    conflictRecordingId
  } = useConversations();

  const onSendMessage = (msg: string, file?: File | null, skipAIResponse?: boolean) => {
    if (file || msg.trim()) {
      handleSendMessage(msg, activeConversationId, null, file, skipAIResponse);
      if (globalTab !== 'chat') handleTabChange('chat');
    }
  };

  const handleSendMessage = async (
    text: string,
    conversationId?: string | number,
    explicitDocumentContext?: string | null,
    mediaFile?: File | null,
    skipAIResponse?: boolean
  ) => {
    if (isLoading) {
      console.warn("Blocking message send: AI is currently busy responding.");
      return;
    }

    if (!text.trim() && !mediaFile) return;

    // Call the original handler
    return coreSendMessage(text, conversationId, explicitDocumentContext, mediaFile, skipAIResponse);
  };

  const activeCase = activeConversationId
    ? cases.find((c) => c.id === activeConversationId)
    : null;
  const isCaseMode = !!activeCase;

  const handleGetCaseInsight = () => {
    if (activeCase) {
      const prompt = `[Case Analysis] I have opened a new case. Please provide your professional insight, a strategic plan, and a proposed timeline of actionable steps. Do not repeat the facts or notes in your insight, just provide pure strategy and advice.

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
        duration?: number;
        s3_key?: string;
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
            duration: note.duration, // Capture stored duration
            s3_key: note.s3_key, // Ensure secure proxy can be used
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
            !m.text.startsWith("[Case Analysis]") &&
            !m.text.includes("voice recording attached to this case") // Exclude meta placeholder
        )
        .map((m) => m.text.trim())
        .filter(Boolean);

      let description = `**Party Involved:** ${activeCase.party_involved || "N/A"}\n\n**Notes:**\n${activeCase.notes || "None provided"}`;

      if (transcribedTexts.length > 0) {
        description += `\n\n---\n\n**Recorded Audio:**\n${transcribedTexts.map((t, i) => `${i + 1}. ${t}`).join("\n\n")}`;
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
    if (user?.id) {
      checkAuthStatus(user.id, user.googleAccessToken)
        .then((status) => setIsGoogleConnected(status.authenticated))
        .catch(() => setIsGoogleConnected(false));
    }
  }, [user?.id, user?.googleAccessToken]);

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
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name ?? undefined,
    providerToken: user?.googleAccessToken,
    isGoogleConnected,
    handleSendMessage: (msg: string) => handleSendMessage(msg, activeConversationId),
    onTabChange: (tab) => switchToTabRef.current?.(tab),
    consultationTitle: recentConsultations.find(c => String(c.id) === String(activeConversationId))?.title
  });
  // Sync handleTabChange into the stable ref after each render
  switchToTabRef.current = handleTabChange;

  useConsultationEffects({
    messages, isLoading, router, currentConsultationId, activeConversationId, scrollContainerRef, handleSendMessage
  });

  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  useEffect(() => {
    if (globalTab === 'schedule') {
      const fetchEvents = async () => {
        try {
          const res = await fetch("/api/events");
          if (res.ok) {
            const json = await res.json();
            setCalendarEvents(json.events || []);
          }
        } catch (error) {
          console.error("Failed to fetch calendar events:", error);
        }
      };
      fetchEvents();
    }
  }, [globalTab]);


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
    isEmailPreviewOpen,
    setIsEmailPreviewOpen,
    handleConfirmSendEmail,
    handleSendEmail,
  } = emailState;
  const {
    scheduleType, setScheduleType,
    scheduleDateTime, setScheduleDateTime,
    scheduleEmails, setScheduleEmails,
    scheduleNotes, setScheduleNotes,
    isScheduling, scheduleStatus,
    handleScheduleEvent, handleFinalizeSchedule,
    conflictWarning, setConflictWarning,
    draftedEventId, isSchedulePreviewOpen, setIsSchedulePreviewOpen,
    scheduleError, setScheduleError, getMinDateTime
  } = scheduleState;

  const [isSpeaking, setIsSpeaking] = useState(false);



  // Email Validation Helper
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [emailToInput, setEmailToInput] = useState("");
  const [emailToError, setEmailToError] = useState(false);
  const [scheduleTypeDropdownOpen, setScheduleTypeDropdownOpen] = useState(false);
  const [emailFindingsDropdownOpen, setEmailFindingsDropdownOpen] = useState(false);
  const [scheduleValidationErrors, setScheduleValidationErrors] = useState<string[]>([]);

  const handleAddEmailTo = (val: string) => {
    const email = val.trim().replace(/,$/, "");
    if (!email) return;
    if (validateEmail(email)) {
      if (!emailTo.includes(email)) {
        setEmailTo([...emailTo, email]);
      }
      setEmailToInput("");
      setEmailToError(false);
    } else {
      setEmailToError(true);
    }
  };

  const removeEmailTo = (index: number) => {
    setEmailTo(emailTo.filter((_, i) => i !== index));
  };

  const handleAddEmail = (val: string) => {
    const email = val.trim().replace(/,$/, "");
    if (!email) return;

    if (validateEmail(email)) {
      if (!scheduleEmails.includes(email)) {
        setScheduleEmails([...scheduleEmails, email]);
      }
      setEmailInput("");
      setEmailError(false);
    } else {
      setEmailError(true);
    }
  };

  const removeEmail = (index: number) => {
    setScheduleEmails(scheduleEmails.filter((_, i) => i !== index));
  };





  const handleAnalyzeFile = async (file: File): Promise<void> => {
    setIsAnalysisModalOpen(false); // Close modal as soon as file is accepted

    // Unified Flow: Start the message process immediately
    // filename as text satisfies the (text.trim() || file) check
    handleSendMessage(file.name, activeConversationId, null, file, false);
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
        url: formatS3Url(file_url),
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
          className="bg-[#0B0B0C] border border-[#722f37]/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif text-white flex items-center gap-2 tracking-tight">
                <Sparkles className="w-5 h-5 text-[#e9c176]" />
                Upload Documents
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
                ? 'border-[#e9c176] bg-[#722f37]/10 scale-[1.02]'
                : 'border-[#722f37]/20 hover:border-[#722f37]/40 bg-black/20'
                }`}
            >
              <input
                ref={modalFileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.mp3,.wav,.m4a,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*,audio/*"
                onChange={(e) => {

                  if (e.target.files?.length) {
                    handleAnalyzeFile(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[#722f37]/20 flex items-center justify-center border border-[#722f37]/30 group-hover:scale-110 transition-transform duration-300">
                  <Upload size={40} className="text-[#e9c176]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xl font-serif text-white mb-1 tracking-tight">
                    Drop files here or click to browse
                  </p>
                  <p className="text-[10px] font-bold text-[#e9c176]/50 uppercase tracking-[0.2em] max-w-[280px] mx-auto leading-relaxed">
                    PDF, DOC(X), TXT, Image, or Audio (Max 20MB). Analysis will start automatically.
                  </p>

                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const SchedulePreviewModal = () => {
    if (!isSchedulePreviewOpen) return null;

    const dt = new Date(scheduleDateTime);
    const dateStr = dt.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = dt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={() => setIsSchedulePreviewOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          className="bg-[#141414] border border-[#10B981]/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-[#10B981]/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#10B981]" />
                </div>
                Review Invitation
              </h2>
              <button
                onClick={() => setIsSchedulePreviewOpen(false)}
                className="p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Event Type</p>
                  <p className="text-white font-semibold">{scheduleType}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Date & Time</p>
                  <p className="text-white font-medium">{dateStr}</p>
                  <p className="text-[#10B981] font-bold text-lg">{timeStr}</p>
                </div>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Recipients</p>
                <div className="flex flex-wrap gap-2">
                  {scheduleEmails.map((email) => (
                    <span key={email} className="px-3 py-1 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] rounded-full text-xs font-medium">
                      {email}
                    </span>
                  ))}
                </div>
              </div>

              {scheduleNotes && (
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Internal Notes</p>
                  <p className="text-gray-300 text-sm italic">"{scheduleNotes}"</p>
                </div>
              )}

              {conflictWarning && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-white font-bold">Scheduling Conflict</p>
                    <p className="text-xs text-amber-200/70">{conflictWarning}</p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={handleFinalizeSchedule}
                  disabled={isScheduling}
                  className="w-full py-4 bg-[#10B981] hover:bg-[#0da270] text-black font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/20"
                >
                  {isScheduling ? <Loader2 className="w-5 h-4 animate-spin text-black" /> : <Send className="w-4 h-4" />}
                  {isScheduling ? "Sending..." : "Send Invitation"}
                </button>
                <button
                  onClick={() => setIsSchedulePreviewOpen(false)}
                  className="w-full py-4 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-medium rounded-2xl transition-all"
                >
                  Back to Editor
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const EmailPreviewModal = () => {
    if (!isEmailPreviewOpen) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={() => setIsEmailPreviewOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          className="bg-[#0B0B0C]/95 backdrop-blur-xl border border-[#722f37]/30 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-serif text-white flex items-center gap-3">
                <div className="p-2.5 bg-[#722f37]/20 rounded-xl border border-[#722f37]/30">
                  <Send className="w-5 h-5 text-[#e9c176]" />
                </div>
                Review Invitation
              </h2>
              <button
                onClick={() => setIsEmailPreviewOpen(false)}
                className="p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">To</p>
                  <p className="text-white font-medium break-all">{emailTo.join(", ")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Subject</p>
                  <p className="text-white font-medium truncate">{emailSubject}</p>
                </div>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/5 max-h-[35vh] overflow-y-auto w-full">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Message Body</p>
                <div className="text-gray-300 text-sm">
                  <div className="prose prose-invert prose-sm max-w-none text-gray-300 prose-p:leading-relaxed prose-a:text-[#e9c176] hover:prose-a:text-white font-bold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {emailBody}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {emailErrorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-white font-bold">Failed to Send</p>
                    <p className="text-xs text-red-200/70">{emailErrorMessage}</p>
                  </div>
                </div>
              )}

              <div className="pt-6 flex flex-col gap-3">
                <button
                  onClick={handleConfirmSendEmail}
                  disabled={isSendingEmail}
                  className="w-full py-4 bg-[#722f37] hover:bg-[#8b3a44] text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#722f37]/20 uppercase tracking-[0.2em] text-[11px]"
                >
                  {isSendingEmail ? <Loader2 className="w-5 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSendingEmail ? "Sending..." : "Send"}
                </button>
                <button
                  onClick={() => setIsEmailPreviewOpen(false)}
                  className="w-full py-4 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-medium rounded-2xl transition-all"
                >
                  Back to Editor
                </button>
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
    recentConsultations.find((c: any) => String(c.id) === String(currentConsultationId)) ||
    (activeConversationId
      ? recentConsultations.find((c: any) => String(c.id) === String(activeConversationId))
      : null);

  let headerTitle = activeConversation?.title || "Consultation";
  let headerSubtitle = activeConversation ? "AI Legal Consultation" : "Immediate guidance based on Philippine law";
  if (isCaseMode && activeCase) {
    headerTitle = activeCase.case_name;
  }
  const isDefaultTitle = !activeConversation && !isCaseMode;

  const getAngleFromTab = (tab: string) => {
    switch (tab) {
      case 'chat':
      case 'email':
        return 1;
      case 'documents':
        return 2;
      case 'transcribe':
        return 3;
      case 'schedule':
      case 'calendar':
        return 4;
      case 'mindmap':
      case 'timeline':
        return 5;
      default:
        return 1;
    }
  };

  return (
    <PageLayout
      activePage="chat"
      title={headerTitle}
      subtitle={headerSubtitle}
      maxWidth={globalTab === "mindmap" ? "max-w-6xl" : "w-full"}
      onNewItem={handleNewConsultation}
      newItemLabel="Consultation"
      recentItems={sidebarRecentItems}
      isEditable={!isDefaultTitle}
      backgroundAngle={getAngleFromTab(globalTab)}
      onTitleChange={(newTitle) => {
        if (currentConsultationId) {
          handleRenameConsultation(currentConsultationId, newTitle);
        }
      }}
      headerActions={
        <div className="flex items-center gap-2">
          {isCaseMode && activeCase && messages.length > 0 && (
            <>
              {!activeCase.is_shared && <CaseInviteButton caseId={activeCase.id.toString()} />}
              <CaseMembersButton caseId={activeCase.id.toString()} isOwner={!activeCase.is_shared} />
              <button
                onClick={handleViewCaseDetails}
                className="text-[#e9c176] hover:text-white flex items-center gap-2 transition-all text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-[#722f37]/20 hover:bg-[#722f37]/40 border border-[#722f37]/30 rounded-full shadow-lg"
              >
                <Briefcase size={13} /> View Case Details
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 relative pb-6 md:pb-10 bg-transparent">
        <div
          ref={scrollContainerRef}
          className={`flex-1 ${globalTab === "mindmap" || globalTab === "transcribe" ? "overflow-hidden" : "overflow-y-auto"} ${globalTab === "mindmap" ? "px-2 md:px-4 py-2" : globalTab === "transcribe" ? "p-0" : "px-4 md:px-6 py-4 md:pt-8 md:pb-16 pb-2"} scroll-smooth landscape:py-2`}
        >
          <div
            className={`${globalTab === "mindmap" ? "max-w-6xl" : "max-w-5xl"} mx-auto w-full ${messages.length === 0 ? "h-full flex flex-col justify-start pt-4 md:pt-8" : ""}`}
          >

            {globalTab === "chat" ? (
              <>
                <AnimatePresence mode="wait">
                  {(isLoading && messages.length === 0) || (isCaseMode && !casesLoaded) ? (
                    <motion.div
                      key="loading-main"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center py-20"
                    >
                      <PageLoader label="Loading case history..." />
                    </motion.div>
                  ) : (messages.length === 0) && !isLoading && casesLoaded && (
                    <motion.div
                      key="quick-questions-top"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="mb-8"
                    >
                      {isCaseMode && activeCase ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                          <div className="bg-[#722f37]/10 p-4 rounded-full border border-[#722f37]/30">
                            <MessageSquare className="w-8 h-8 text-[#e9c176]" />
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
                            className="bg-[#722f37] hover:bg-[#8b3a44] text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-[#722f37]/20 flex items-center gap-3 active:scale-95"
                          >
                            <Sparkles size={18} className="text-[#e9c176]" />
                            Ask AI
                          </button>
                        </div>
                      ) : (
                        <div className="py-24 text-center relative flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
                          {/* Ambient Backglow */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[rgba(114,47,55,0.15)] blur-[80px] rounded-full pointer-events-none" />

                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative z-10 inline-flex p-6 rounded-3xl mb-8 border border-[rgba(233,193,118,0.2)] bg-[#131314]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(114,47,55,0.2)]"
                          >
                            <MessageSquare size={48} className="text-[rgba(233,193,118,1)] stroke-[1.5]" />
                          </motion.div>

                          <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                            className="relative z-10 text-4xl md:text-5xl font-serif text-white mb-4 tracking-tight"
                          >
                            Start a <span className="text-[rgba(233,193,118,1)] italic">Consultation</span>
                          </motion.h2>

                          <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                            className="relative z-10 text-gray-400 max-w-lg mx-auto text-lg leading-relaxed font-light"
                          >
                            Describe your legal situation below to receive immediate, highly-accurate AI-powered guidance tailored to Philippine Law.
                          </motion.p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <MessageList
                  messages={messages.map((m) => {
                    if (
                      m.sender === CHAT_SENDER.USER &&
                      m.text.startsWith("[Case Analysis]")
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
                  onSourceLinkClick={(id, title) => {
                    if (id && id !== "__NAVIGATE__") {
                      openSourceByItemId(id, title);
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
              </>
            ) : globalTab === "timeline" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
                {activeTimeline.length > 0 ? (
                  <Timeline data={activeTimeline} />
                ) : (
                  <div className="py-20 text-center">
                    <div className="inline-flex p-5 bg-[#722f37]/10 rounded-full mb-6 border border-[#722f37]/30 shadow-xl shadow-[#722f37]/10">
                      <GitGraph size={32} className="text-[#e9c176]" />
                    </div>
                    <h2 className="text-3xl font-serif mb-3 tracking-tight">
                      Procedural <span className="text-[#e9c176] italic">Timeline</span>
                    </h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Chronological overview of the legal proceedings and
                      evidence. Ask the AI to generate a plan to see it here.
                    </p>
                  </div>
                )}
              </div>
            ) : globalTab === 'email' ? (
              <div className="animate-in fade-in zoom-in duration-300 w-full max-w-3xl mx-auto py-8 px-4 h-full flex items-center">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden w-full">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#722f37]/20 text-[#e9c176] rounded-xl flex-shrink-0 border border-[#722f37]/30">
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
                        <div
                          onClick={() => setEmailFindingsDropdownOpen(!emailFindingsDropdownOpen)}
                          className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none hover:border-[#e9c176]/50 cursor-pointer transition-all"
                        >
                          <span className="truncate pr-4">
                            {emailBody ? emailBody.replace(/[#*]/g, '').trim().substring(0, 50) + (emailBody.length > 50 ? "..." : "") : "-- Select an AI finding to insert --"}
                          </span>
                          <ChevronDown size={16} className={`transition-transform duration-200 text-white/60 ${emailFindingsDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        <AnimatePresence>
                          {emailFindingsDropdownOpen && (
                            <>
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute z-50 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar"
                              >
                                <div
                                  onClick={() => {
                                    setEmailBody("");
                                    setEmailFindingsDropdownOpen(false);
                                  }}
                                  className={`px-4 py-3 text-sm cursor-pointer transition-all border-b border-white/5
                                    ${!emailBody ? "bg-[#e9c176]/20 text-white font-bold" : "text-white/80 hover:bg-white/5 hover:text-white"}
                                  `}
                                >
                                  -- Select an AI finding to insert --
                                </div>
                                {messages.filter(m => m.sender === 'ai' && m.text.length > 20).map((m, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      setEmailBody(m.text);
                                      setEmailFindingsDropdownOpen(false);
                                    }}
                                    className={`px-4 py-3 text-sm cursor-pointer transition-all border-b border-white/5 last:border-none
                                      ${emailBody === m.text ? "bg-[#e9c176]/20 text-white font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"}
                                    `}
                                  >
                                    <div className="line-clamp-2 leading-relaxed">
                                      {m.text.replace(/[#*]/g, '').trim()}
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setEmailFindingsDropdownOpen(false); }} />
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">To</label>
                      <div className={`flex flex-wrap gap-2 p-2 bg-black/40 border ${emailToError ? 'border-red-500/50' : 'border-white/10'} rounded-xl min-h-[46px] focus-within:border-[#e9c176]/50 transition-all`}>
                        <AnimatePresence>
                          {emailTo.map((email, index) => (
                            <motion.div
                              key={email}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-1.5 bg-[#e9c176]/10 border border-[#e9c176]/30 text-[#e9c176] px-2 py-1 rounded-lg text-xs font-medium"
                            >
                              <span>{email}</span>
                              <button onClick={() => removeEmailTo(index)} className="hover:text-white transition-colors">
                                <X size={12} />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <input
                          type="text"
                          placeholder={emailTo.length === 0 ? "client@example.com, press Enter" : ""}
                          value={emailToInput}
                          onChange={(e) => {
                            setEmailToInput(e.target.value);
                            if (emailToError) setEmailToError(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') e.preventDefault();
                            if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                              handleAddEmailTo(emailToInput);
                            }
                            if (e.key === 'Backspace' && !emailToInput && emailTo.length > 0) {
                              removeEmailTo(emailTo.length - 1);
                            }
                          }}
                          onBlur={() => handleAddEmailTo(emailToInput)}
                          className="flex-1 bg-transparent border-none outline-none text-sm text-white min-w-[120px] py-1"
                        />
                      </div>
                      {emailToError && (
                        <p className="text-[10px] text-red-400 mt-1 ml-1 font-medium animate-in fade-in slide-in-from-top-1">
                          Invalid email. Use format: name@example.com
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Subject</label>
                      <input
                        type="text"
                        placeholder="Update on Case Findings"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#e9c176]/50 focus:ring-1 focus:ring-[#e9c176]/50 transition-all placeholder:text-gray-600 shadow-inner"
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
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#e9c176]/50 focus:ring-1 focus:ring-[#e9c176]/50 transition-all placeholder:text-gray-600 resize-none shadow-inner leading-relaxed"
                      ></textarea>
                    </div>

                    <div className="pt-2 flex flex-col items-end gap-2">
                      <button
                        className={`bg-[#e9c176] text-black font-bold uppercase tracking-widest text-[10px] px-8 py-3 rounded-xl transition-all flex items-center gap-2 ${emailSentStatus === 'success' ? '!bg-green-500 !text-white' :
                          emailSentStatus === 'error' ? '!bg-red-500 !text-white' :
                            'hover:bg-white'
                          }`}
                        onClick={handleSendEmail}
                        disabled={isSendingEmail}
                      >
                        {isSendingEmail ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin h-4 w-4" />
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
              <div className="animate-in fade-in zoom-in duration-300 w-full max-w-3xl mx-auto py-8 px-4 h-full flex items-center">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative w-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-[#722f37]/10 text-[#722f37] rounded-xl flex-shrink-0">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white">Schedule Event</h2>
                      <p className="text-xs md:text-sm text-gray-400">Book meetings, appointments, or hearings.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Custom Event Type Dropdown */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Event Type</label>
                        <div
                          onClick={() => setScheduleTypeDropdownOpen(!scheduleTypeDropdownOpen)}
                          className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none hover:border-[#722f37]/50 cursor-pointer transition-all"
                        >
                          <span>{scheduleType}</span>
                          <ChevronDown size={16} className={`transition-transform duration-200 text-white/60 ${scheduleTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        <AnimatePresence>
                          {scheduleTypeDropdownOpen && (
                            <>
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute z-50 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden"
                              >
                                {["Meeting", "Appointment", "Hearing", "Deposition"].map((t) => (
                                  <div
                                    key={t}
                                    onClick={() => {
                                      setScheduleType(t);
                                      setScheduleTypeDropdownOpen(false);
                                    }}
                                    className={`px-4 py-3 text-sm cursor-pointer transition-all capitalize flex items-center justify-between
                                      ${scheduleType === t ? "bg-[#722f37]/20 text-white font-semibold" : "text-white/80 hover:bg-white/5 hover:text-white"}
                                    `}
                                  >
                                    {t}
                                    {scheduleType === t && <Check size={14} strokeWidth={2} className="text-[#722f37]" />}
                                  </div>
                                ))}
                              </motion.div>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setScheduleTypeDropdownOpen(false); }} />
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Date & Time Input */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Date & Time</label>
                        <DateBox
                          value={scheduleDateTime}
                          min={getMinDateTime()}
                          onChange={(val) => {
                            setScheduleDateTime(val);
                            setScheduleValidationErrors(prev => prev.filter(err => !err.toLowerCase().includes('date') && !err.toLowerCase().includes('past')));
                            // Validate past date immediately on change
                            if (val) {
                              const selected = new Date(val);
                              const now = new Date();
                              now.setSeconds(0, 0);
                              selected.setSeconds(0, 0);
                              if (selected < now) {
                                setScheduleValidationErrors(["The selected date and time is in the past. Please choose a future time."]);
                              }
                            }
                          }}
                          hasError={scheduleValidationErrors.some(e => e.toLowerCase().includes('date') || e.toLowerCase().includes('past'))}
                          calendarEvents={calendarEvents}
                        />
                      </div>
                    </div>

                    {/* Client Emails */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Client Email(s)</label>
                      <div className={`flex flex-wrap gap-2 p-2 bg-black/40 border ${emailError ? 'border-red-500/50' : 'border-white/10'} rounded-xl min-h-[46px] focus-within:border-[#722f37]/50 transition-all`}>
                        <AnimatePresence>
                          {scheduleEmails.map((email, index) => (
                            <motion.div
                              key={email}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-1.5 bg-[#722f37]/10 border border-[#722f37]/30 text-[#ffb2b8] px-2 py-1 rounded-lg text-xs font-medium"
                            >
                              <span>{email}</span>
                              <button onClick={() => removeEmail(index)} className="hover:text-white transition-colors">
                                <X size={12} />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <input
                          type="text"
                          placeholder={scheduleEmails.length === 0 ? "client@example.com, press Enter" : ""}
                          value={emailInput}
                          onChange={(e) => {
                            setEmailInput(e.target.value);
                            if (emailError) setEmailError(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') e.preventDefault();
                            if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                              handleAddEmail(emailInput);
                            }
                            if (e.key === 'Backspace' && !emailInput && scheduleEmails.length > 0) {
                              removeEmail(scheduleEmails.length - 1);
                            }
                          }}
                          onBlur={() => handleAddEmail(emailInput)}
                          className="flex-1 bg-transparent border-none outline-none text-sm text-white min-w-[120px] py-1"
                        />
                      </div>
                      {emailError && (
                        <p className="text-[10px] text-red-400 mt-1 ml-1 font-medium animate-in fade-in slide-in-from-top-1">
                          Invalid email. Use format: name@example.com
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Description / Notes *</label>
                      <textarea
                        rows={3}
                        placeholder="Discuss evidence strategy and finalize documentation..."
                        value={scheduleNotes}
                        onChange={(e) => {
                          setScheduleNotes(e.target.value);
                          setScheduleValidationErrors(prev => prev.filter(err => !err.toLowerCase().includes('notes')));
                        }}
                        className={`w-full bg-black/40 border ${scheduleValidationErrors.some(e => e.toLowerCase().includes('notes')) ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#722f37]/50 focus:ring-1 focus:ring-[#722f37]/50 transition-all placeholder:text-gray-600 resize-none`}
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <div className="w-full space-y-3">
                        {/* Validation Errors — ALL shown at once */}
                        {scheduleValidationErrors.length > 0 && (
                          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 space-y-1.5 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 font-bold">
                              <AlertCircle size={14} className="flex-shrink-0" />
                              <span>Please fix the following:</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 ml-1">
                              {scheduleValidationErrors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Conflict Warning */}
                        {conflictWarning && (
                          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm text-white font-bold">Scheduling Conflict</p>
                              <p className="text-xs text-amber-200/70">{conflictWarning}</p>
                              <button onClick={() => setConflictWarning(null)} className="mt-2 text-xs font-bold text-amber-400 hover:underline">
                                Ignore & Proceed
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Schedule API Error */}
                        {scheduleError && (
                          <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                            <span>{scheduleError}</span>
                          </div>
                        )}

                        <button
                          className={`bg-[#722f37] text-white text-sm font-bold w-full py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${scheduleStatus === 'error' ? '!bg-red-500 !text-white' : 'hover:bg-[#8b3a44]'}`}
                          onClick={() => {
                            // Collect ALL validation errors at once
                            const errors: string[] = [];
                            const now = new Date();
                            now.setSeconds(0, 0);

                            if (!scheduleDateTime) {
                              errors.push("Please select a date and time.");
                            } else {
                              const selected = new Date(scheduleDateTime);
                              selected.setSeconds(0, 0);
                              if (selected < now) {
                                errors.push("The selected date and time is in the past. Please choose a future time.");
                              }
                            }

                            if (scheduleEmails.length === 0) {
                              errors.push("At least one client email is required.");
                              setEmailError(true);
                            }

                            if (!scheduleNotes.trim()) {
                              errors.push("Notes are required. Please describe the purpose of the meeting.");
                            }

                            if (errors.length > 0) {
                              setScheduleValidationErrors(errors);
                              return;
                            }

                            setScheduleValidationErrors([]);
                            handleScheduleEvent();
                          }}
                          disabled={isScheduling || scheduleStatus === 'success'}
                        >
                          {isScheduling ? "Preparing invitation..." :
                            scheduleStatus === 'error' ? "Try Again" :
                              scheduleStatus === 'success' ? "Sent Successfully!" :
                                <>
                                  <Calendar size={16} /> {scheduleStatus === 'drafted' ? 'Update & Review Preview' : 'Prepare Invitation'}
                                </>
                          }
                        </button>
                      </div>
                    </div>

                    {/* Success Popup */}
                    <AnimatePresence>
                      {scheduleStatus === 'success' && (
                        <motion.div
                          initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
                          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                          exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
                          className="fixed bottom-10 left-1/2 z-[100] bg-[#10B981] text-black px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold pointer-events-none"
                        >
                          <CheckCircle size={24} />
                          <span>Consultation Scheduled & Invitation Sent!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                      className="bg-[#722f37]/20 hover:bg-[#722f37]/40 border border-[#722f37]/50 text-[#e9c176] px-8 py-4 rounded-2xl flex items-center gap-3 transition-all group shadow-xl shadow-[#722f37]/10 uppercase tracking-[0.2em] text-[11px] font-bold"
                    >
                      <Layout className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Generate Strategy Map
                    </button>
                  </div>
                )}
              </div>
            ) : globalTab === "transcribe" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-[70vh] flex">
                <TranscribeWorkspace
                  onOpenSidebar={() => setIsSidebarOpen(true)}
                  isSidebarOpen={isSidebarOpen}
                />
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
                <span>AI is thinking...</span>
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
        {isSchedulePreviewOpen && <SchedulePreviewModal />}
        {isEmailPreviewOpen && <EmailPreviewModal />}
        {conflictRecordingId && <RecordingConflictModal />}
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

