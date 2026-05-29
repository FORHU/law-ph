import React, { useState } from 'react';
import { Scale, User, MoreHorizontal, Edit2, PenTool, Trash2, BookOpen, History, GitGraph, RefreshCcw, Gavel, Copy, FileText, Bookmark, Loader2, Volume2, VolumeX, ArrowUpRight, ScrollText, BookMarked } from 'lucide-react';
import { synthesizeSpeech } from '@/lib/aws-polly-utils';
import { CHAT_SENDER, COLORS } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { AuthRequestCard } from '@/components/auth/auth-request-card';
import { EditMessageForm } from '../edit-message-form';
import { GranularDiffViewer } from '../granular-diff-viewer';
import { Message } from '@/components/consultation/message-list/types';
import { AIResponseTabs } from '@/components/consultation/message-list/ai-response-tabs';
import { VoiceNoteSection } from '@/components/consultation/message-list/voice-note-section';
import { TAB_CONFIG } from '@/components/consultation/message-list/constants';
import { LegalSource, RelatedCase } from '@/lib/citation-parser';
import { useConversations } from '@/components/conversation-provider/conversation-context';

interface MessageItemProps {
  message: Message;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showOriginal: boolean;
  onToggleOriginal: () => void;
  isRecording: boolean;
  recordingTime: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDelete?: (id: string | number) => void;
  onSourceClick?: (source: LegalSource, context?: string) => void;
  onCaseClick?: (caseItem: RelatedCase, context?: string) => void;
  onSourceLinkClick?: (itemId: string, title?: string) => void;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onOpenNote?: (id: string | number, text: string) => void;
  scrollToMessage: (id: string | number) => void;
  formatTime: (secs: number) => string;
  session?: any;
  relatedCasesLoading?: boolean;
  hasMoreRelatedCases?: boolean;
  onLoadMoreRelated?: () => void;
  isLoading?: boolean;
  onSendMessage?: (text: string) => void;
}

export function MessageItem({
  message,
  activeTab,
  onTabChange,
  showOriginal,
  onToggleOriginal,
  isRecording,
  recordingTime,
  onStartRecording,
  onStopRecording,
  onDelete,
  onSourceClick,
  onCaseClick,
  onSourceLinkClick,
  onUpdateMessage,
  onOpenNote,
  scrollToMessage,
  formatTime,
  session,
  relatedCasesLoading,
  hasMoreRelatedCases,
  onLoadMoreRelated,
  isLoading,
  onSendMessage
}: MessageItemProps) {
  const isUser = message.sender === CHAT_SENDER.USER;
  const isAI = message.sender === CHAT_SENDER.AI;
  const { addBookmark, removeBookmark, isBookmarked, currentConsultationId, isSharedCase } = useConversations();
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('all');
  const [caseSortBy, setCaseSortBy] = useState<'relevance' | 'date'>('relevance');
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const bookmarkId = isBookmarked(message.id.toString());
  const bookmarked = !!bookmarkId;

  const handleBookmarkToggle = async () => {
    if (bookmarked && bookmarkId) {
      await removeBookmark(bookmarkId);
    } else {
      // Create a title from the first line or first few words
      const textForTitle = message.text.split('\n')[0].replace(/[#*]/g, '').trim();
      const title = textForTitle.length > 60 ? textForTitle.substring(0, 57) + "..." : textForTitle || "AI Response";

      await addBookmark({
        itemId: message.id.toString(),
        title: title,
        reference: "AI_RESPONSE",
        type: 'source',
        url: `/consultation/${currentConsultationId}`,
        aiSummary: message.text,
      });
    }
  };

  const handleSpeak = async (voiceId: string = "Joanna") => {
    if (isPlaying && currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
      // If the same voice is clicked, just stop. If different, we continue below to play new voice
    }

    setIsSynthesizing(true);
    try {
      localStorage.setItem('preferred_voice', voiceId);
      const audio = await synthesizeSpeech(message.text, voiceId);
      if (audio) {
        setCurrentAudio(audio);
        setIsPlaying(true);
        audio.play();
        audio.onended = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
        };
      }
    } catch (err) {
      console.error("Speech synthesis failed:", err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handlePreview = async (e: React.MouseEvent, voiceId: string, voiceName: string) => {
    e.stopPropagation(); // Don't close the menu if we just want a preview
    
    if (isPreviewing === voiceId && previewAudio) {
      previewAudio.pause();
      setIsPreviewing(null);
      return;
    }

    if (previewAudio) previewAudio.pause();
    
    setIsPreviewing(voiceId);
    try {
      const sampleText = `Hello, I am ${voiceName}. I will be your legal assistant today.`;
      const audio = await synthesizeSpeech(sampleText, voiceId);
      if (audio) {
        setPreviewAudio(audio);
        audio.play();
        audio.onended = () => setIsPreviewing(null);
      }
    } catch (err) {
      console.error("Preview failed:", err);
      setIsPreviewing(null);
    }
  };

  const voices = [
    { id: 'Ruth', name: 'Ruth', desc: 'Professional & Authoritative' },
    { id: 'Stephen', name: 'Stephen', desc: 'Trustworthy & Formal' },
    { id: 'Joanna', name: 'Joanna', desc: 'Friendly & Clear' },
    { id: 'Matthew', name: 'Matthew', desc: 'Reliable & Direct' },
  ];

  if (message.sender === 'system') {
    return (
      <div id={`message-bubble-${message.id}`} className="flex flex-col items-center justify-center my-6 scroll-mt-32 w-full animate-in fade-in slide-in-from-bottom-1 duration-700">
        <div className="text-[12px] font-medium text-center text-gray-500/80 tracking-tight max-w-xl px-4 py-1 italic">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-bubble-${message.id}`}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} scroll-mt-32`}
    >
      {isAI && (
        <div className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-[${COLORS.PRIMARY}]/20 rounded-lg mt-1 flex-shrink-0`}>
          <Scale size={16} className={`text-[${COLORS.PRIMARY}] md:w-[18px] md:h-[18px]`} />
        </div>
      )}
      {isUser && (
        <div className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-[${COLORS.PRIMARY}]/20 rounded-full mt-1 flex-shrink-0`}>
          <User size={16} className="text-white md:w-[18px] md:h-[18px]" />
        </div>
      )}

      <div className={`flex-1 ${isUser ? 'max-w-[90%] md:max-w-[85%] ml-auto' : 'w-full md:max-w-[90%] lg:max-w-[85%]'} group/msg relative`}>
        {!isUser && isAI && (
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <AIResponseTabs
              activeTab={activeTab}
              onTabChange={onTabChange}
              tabConfig={TAB_CONFIG}
              message={message}
              loadingTabId={relatedCasesLoading ? 'related' : undefined}
            />
          </div>
        )}

        <div className={`backdrop-blur-xl border rounded-2xl p-4 md:p-6 ${isAI ? 'pt-12 md:pt-12' : 'pt-4 md:pt-8'} pb-5 md:pb-6 relative group/inner break-words ${isUser
          ? `bg-[${COLORS.PRIMARY}]/10 border-[#722f37]/30 rounded-tr-sm shadow-lg`
          : `bg-[#0B0B0C]/60 ${message.originalText && message.text !== message.originalText ? 'border-[#e9c176]/60' : 'border-[#722f37]/20'} rounded-tl-sm shadow-2xl`
          }`}>
          {message.isAnalysis && (
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <span className="bg-[#722f37]/20 text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded border border-[#722f37]/30 flex items-center gap-2">
                <FileText size={10} /> INSTITUTIONAL ANALYSIS
              </span>
            </div>
          )}
          {/* AI Menu Icon at Top Right */}
          {!isUser && isAI && !message.isEditing && (
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1 md:gap-0.5">
              {message.highlights && message.highlights.length > 0 && (
                <button
                  onClick={() => onOpenNote?.(message.id, message.text)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#722f37]/10 rounded-md transition-all focus:outline-none flex items-center relative"
                  title={`View Notes (${message.highlights.length})`}
                >
                  <BookOpen size={14} />
                  <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-[#722f37] text-white px-0.5 rounded-full min-w-[10px] h-[10px] flex items-center justify-center border border-[#1A1A1A]">
                    {message.highlights.length}
                  </span>
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={isSynthesizing}
                    className={`p-1.5 rounded-md transition-all focus:outline-none ${isPlaying ? 'text-white bg-[#722f37]/20' : 'text-gray-400 hover:text-white hover:bg-[#722f37]/10'}`}
                    title={isPlaying ? "Stop Speaking / Change Voice" : "Read Aloud (Select Voice)"}
                  >
                    {isSynthesizing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isPlaying ? (
                      <VolumeX size={14} />
                    ) : (
                      <Volume2 size={14} />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-[#0B0B0C]/95 backdrop-blur-xl border-[#722f37]/20 text-gray-200 shadow-2xl">
                  <div className="px-3 py-2 border-b border-[#722f37]/10 mb-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Volume2 size={12} />
                      Select AI Voice
                    </div>
                  </div>
                  {voices.map((voice) => (
                    <DropdownMenuItem
                      key={voice.id}
                      className="group flex items-center justify-between px-3 py-2 text-sm hover:bg-[#722f37]/20 cursor-pointer focus:bg-[#722f37]/20"
                      onClick={() => handleSpeak(voice.id)}
                    >
                      <div className="flex flex-col items-start flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-gray-200">{voice.name}</span>
                          {typeof window !== 'undefined' && localStorage.getItem('preferred_voice') === voice.id && (
                            <div className="w-1 h-1 rounded-full bg-gray-400" />
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 group-hover:text-gray-300">{voice.desc}</span>
                      </div>
                      
                      <button
                        onClick={(e) => handlePreview(e, voice.id, voice.name)}
                        className={`p-1.5 rounded-full transition-all hover:bg-white/10 ${isPreviewing === voice.id ? 'text-white animate-pulse' : 'text-gray-500 hover:text-white'}`}
                        title="Play Sample"
                      >
                        {isPreviewing === voice.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Volume2 size={12} />
                        )}
                      </button>
                    </DropdownMenuItem>
                  ))}
                  {isPlaying && (
                    <>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem
                        className="flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 cursor-pointer"
                        onClick={() => {
                          if (currentAudio) {
                            currentAudio.pause();
                            setIsPlaying(false);
                          }
                        }}
                      >
                        <VolumeX size={14} className="mr-2" />
                        <span>Stop Playback</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={handleBookmarkToggle}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#722f37]/10 rounded-md transition-all focus:outline-none"
                title={bookmarked ? "Remove Bookmark" : "Bookmark Response"}
              >
                <Bookmark size={14} className={bookmarked ? "fill-white text-white" : ""} />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 text-gray-400 hover:text-white rounded-md transition-colors focus:outline-none">
                    <MoreHorizontal size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#0B0B0C]/95 backdrop-blur-xl border-[#722f37]/20 text-gray-200">
                  <DropdownMenuItem
                    className="group flex items-center px-2 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer focus:bg-[#722f37]/20 focus:text-white"
                    onClick={() => {
                      const activeTabToCopy = activeTab;
                      let textToCopy = '';
                      if (activeTabToCopy === 'answer') {
                        textToCopy = (message.text || "").replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim();
                      } else if (activeTabToCopy === 'sources') {
                        const sources = message.sources || [];
                        textToCopy = "Legal Sources & Citations:\n\n" + sources.map((s: LegalSource) => `${s.type.toUpperCase()}: ${s.reference}\n${s.description}`).join("\n\n");
                      } else if (activeTabToCopy === 'related') {
                        const cases = message.relatedCases || [];
                        textToCopy = "Related Jurisprudence:\n\n" + cases.map((c: RelatedCase) => `SUPREME COURT CASE: ${c.caseNumber}\n${c.description}`).join("\n\n");
                      }
                      if (textToCopy) navigator.clipboard.writeText(textToCopy);
                    }}
                  >
                    <Copy size={14} className="mr-2 text-gray-400 group-hover:text-white" />
                    <span>Copy Content</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/5" />

                  <DropdownMenuItem
                    className="group flex items-center px-2 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer focus:bg-[#722f37]/20 focus:text-white"
                    onClick={() => onOpenNote?.(message.id, message.text)}
                  >
                    <PenTool size={14} className="mr-2 text-gray-400 group-hover:text-white" />
                    <span>Add Note</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Message Actions For User (Edit Only) */}
          {isUser && (
            <div className="absolute top-2 right-2 transition-all z-20">
              {!isLoading && (
                <button
                  onClick={() => onUpdateMessage?.(message.id, { isEditing: true })}
                  className="p-1.5 text-gray-500 hover:text-white transition-colors"
                  title="Edit prompt"
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          )}

          <div className="text-sm md:text-base text-gray-100 leading-relaxed prose prose-invert max-w-none">
            {message.fileAttachment && !message.fileAttachments && (
              <div className="mb-3 flex items-center gap-3 p-2.5 bg-white border border-black/5 rounded-xl hover:bg-gray-50 transition-colors group/file cursor-pointer max-w-sm shadow-sm">
                <div className="w-11 h-11 rounded-lg bg-[#F84F44] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                  <FileText size={22} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-bold text-gray-900 truncate tracking-tight">{message.fileAttachment.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">{message.fileAttachment.type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                </div>
              </div>
            )}
            {message.fileAttachments && message.fileAttachments.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {message.fileAttachments.map((file: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-white border border-black/5 rounded-xl hover:bg-gray-50 transition-colors group/file cursor-pointer max-w-sm shadow-sm">
                    <div className="w-11 h-11 rounded-lg bg-[#F84F44] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                      <FileText size={22} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[13px] font-bold text-gray-900 truncate tracking-tight">{file.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">{file.type?.toUpperCase() || 'FILE'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {message.status === 'processing' ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <Loader2 size={24} className="text-gray-500 animate-spin" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] animate-pulse">ANALYZING ARCHIVES...</p>
              </div>
            ) : message.text === "" && isAI ? (
              <div className="flex gap-1.5 py-1 px-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            ) : isAI ? (
              (() => {

                if (activeTab === 'related') {
                  const cases = message.relatedCases || [];
                  const notYetFetched = message.relatedCases === undefined && !relatedCasesLoading;

                  if (notYetFetched) {
                    return (
                      <div className="py-10 flex flex-col items-center justify-center gap-4">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-2 border-[#722f37]/20 border-t-[#e9c176]/60 animate-spin" />
                          <Gavel size={20} className="text-[#722f37]/60" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Searching jurisprudence</p>
                          <p className="text-[10px] text-gray-600">Fetching related cases from the legal archive</p>
                        </div>
                      </div>
                    );
                  }

                  if (relatedCasesLoading && cases.length === 0) {
                    return (
                      <div className="py-3 space-y-3">
                        {/* Toolbar skeleton */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-8 rounded-lg bg-white/5 animate-pulse" />
                          <div className="w-28 h-8 rounded-lg bg-white/5 animate-pulse" />
                        </div>
                        {/* Card skeletons */}
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="bg-black/30 border border-white/5 rounded-xl p-4"
                            style={{ opacity: 1 - i * 0.15 }}>
                            <div className="flex items-start gap-3">
                              {/* Icon placeholder */}
                              <div className="mt-0.5 w-7 h-7 rounded-lg bg-[#722f37]/10 border border-[#722f37]/20 flex-shrink-0 animate-pulse" />
                              <div className="flex-1 space-y-2">
                                {/* Badge row */}
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                                  <div className="h-3 w-16 rounded bg-[#e9c176]/5 animate-pulse" />
                                </div>
                                {/* Title */}
                                <div className="h-3.5 rounded bg-white/8 animate-pulse"
                                  style={{ width: `${70 + (i % 3) * 10}%` }} />
                                <div className="h-3.5 w-1/2 rounded bg-white/5 animate-pulse" />
                              </div>
                              {/* Arrow placeholder */}
                              <div className="w-3.5 h-3.5 rounded bg-white/5 animate-pulse flex-shrink-0 mt-0.5" />
                            </div>
                          </div>
                        ))}
                        {/* Label */}
                        <p className="text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest animate-pulse pt-1">
                          Searching jurisprudence...
                        </p>
                      </div>
                    );
                  }

                  if (!relatedCasesLoading && cases.length === 0) {
                    return (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-5 bg-[#722f37]/10 rounded-full border border-[#722f37]/20 shadow-inner">
                          <Gavel size={40} className="text-gray-600" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="text-xl font-serif text-white mb-2">No related cases found</h4>
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest max-w-xs mx-auto">
                            No matching documents found for this topic in the legal archive.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (() => {
                    // Build type groups
                    const typeGroups = cases.reduce<Record<string, number>>((acc, c) => {
                      const t = c.type || 'Other';
                      acc[t] = (acc[t] || 0) + 1;
                      return acc;
                    }, {});
                    const typeKeys = Object.keys(typeGroups).sort();

                    // Filter
                    const filtered = caseTypeFilter === 'all'
                      ? cases
                      : cases.filter(c => (c.type || 'Other') === caseTypeFilter);

                    // Sort
                    const sorted = [...filtered].sort((a, b) => {
                      if (caseSortBy === 'date') {
                        return (b.year ?? 0) - (a.year ?? 0);
                      }
                      return 0; // keep original relevance order
                    });

                    return (
                      <div className="py-3 space-y-3">
                        {showTypeMenu && <div className="fixed inset-0 z-20" onClick={() => setShowTypeMenu(false)} />}
                        {/* Toolbar: filter + sort */}
                        <div className="flex items-center gap-2">
                          {/* Type filter dropdown */}
                          {typeKeys.length > 1 && (
                            <div className="relative flex-1">
                              <button
                                onClick={() => setShowTypeMenu(v => !v)}
                                className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/8 hover:border-white/15 text-gray-300 text-[11px] font-bold uppercase tracking-wider rounded-lg pl-3 pr-3 py-2 transition-colors"
                              >
                                <span className="truncate">
                                  {caseTypeFilter === 'all'
                                    ? `All · ${cases.length}`
                                    : `${caseTypeFilter.charAt(0).toUpperCase() + caseTypeFilter.slice(1)} · ${typeGroups[caseTypeFilter]}`}
                                </span>
                                <ScrollText size={11} className="text-gray-500 flex-shrink-0" />
                              </button>
                              {showTypeMenu && (
                                <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-full bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                  {[{ key: 'all', label: 'All', count: cases.length }, ...typeKeys.map(t => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1), count: typeGroups[t] }))].map(({ key, label, count }) => (
                                    <button
                                      key={key}
                                      onClick={() => { setCaseTypeFilter(key); setShowTypeMenu(false); }}
                                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition-colors ${caseTypeFilter === key ? 'text-[#e9c176] bg-[#722f37]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                      <span className="truncate">{label}</span>
                                      <span className={`flex-shrink-0 ml-2 tabular-nums ${caseTypeFilter === key ? 'text-[#e9c176]/70' : 'text-gray-600'}`}>{count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Sort toggle pills */}
                          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg p-1 flex-shrink-0">
                            {(['relevance', 'date'] as const).map(opt => (
                              <button
                                key={opt}
                                onClick={() => setCaseSortBy(opt)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${caseSortBy === opt ? 'bg-[#722f37]/60 text-[#e9c176] border border-[#722f37]/50' : 'text-gray-500 hover:text-gray-300'}`}
                              >
                                {opt === 'relevance' ? 'Relevance' : 'Date'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Cards */}
                        <div className="space-y-2">
                          {sorted.length === 0 ? (
                            <p className="text-[11px] text-gray-600 text-center py-4">No results for this filter.</p>
                          ) : sorted.map((caseItem: RelatedCase, i: number) => {
                            const isCase = caseItem.caseNumber && caseItem.caseNumber !== 'N/A';
                            return (
                              <div
                                key={i}
                                className="group relative bg-black/30 border border-white/5 hover:border-[#e9c176]/20 hover:bg-[#722f37]/5 rounded-xl p-4 cursor-pointer transition-all duration-200"
                                onClick={() => onCaseClick?.(caseItem, message.text)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 p-1.5 bg-[#722f37]/10 rounded-lg border border-[#722f37]/20 flex-shrink-0 group-hover:border-[#e9c176]/20 transition-colors">
                                    <BookMarked size={12} className="text-[#722f37] group-hover:text-[#e9c176] transition-colors" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      {caseItem.subtype && (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{caseItem.subtype}</span>
                                      )}
                                      {isCase && (
                                        <span className="text-[9px] font-bold text-[#e9c176]/70 bg-[#e9c176]/5 border border-[#e9c176]/10 px-1.5 py-0.5 rounded-md">
                                          {caseItem.caseNumber}
                                        </span>
                                      )}
                                      {caseItem.year && (
                                        <span className="text-[9px] text-gray-600 tabular-nums">{caseItem.year}</span>
                                      )}
                                    </div>
                                    <p className="text-[13px] text-gray-300 group-hover:text-white transition-colors leading-snug line-clamp-2">
                                      {caseItem.title || caseItem.description}
                                    </p>
                                  </div>
                                  <ArrowUpRight size={14} className="flex-shrink-0 mt-0.5 text-gray-700 group-hover:text-[#e9c176] transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {hasMoreRelatedCases && (
                          <div className="pt-2 flex justify-center">
                            <button
                              onClick={onLoadMoreRelated}
                              disabled={relatedCasesLoading}
                              className="bg-[#722f37]/10 hover:bg-[#722f37]/30 border border-[#722f37]/20 hover:border-[#722f37]/40 text-gray-400 hover:text-white rounded-xl px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {relatedCasesLoading ? (
                                <><Loader2 size={12} className="animate-spin" /> Loading...</>
                              ) : (
                                <><BookOpen size={12} /> Load More</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })();
                }


                const displayContent = showOriginal && message.originalText ? message.originalText : message.text;

                return (
                  <div key="diff-view">
                    <GranularDiffViewer
                      original={showOriginal ? '' : (message.originalText || '')}
                      current={displayContent}
                      onSourceLinkClick={onSourceLinkClick}
                      onSourceClick={onSourceClick}
                    />

                    {message.originalText && message.text !== message.originalText && (
                      <div className="mt-4 flex justify-end gap-3">
                        {showOriginal && (
                          <button
                            onClick={() => {
                              onUpdateMessage?.(message.id, {
                                text: message.originalText!,
                                isEditing: false,
                                editedAt: undefined,
                                editedBy: undefined
                              });
                              onToggleOriginal();
                              scrollToMessage(message.id);
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2"
                          >
                            <RefreshCcw size={12} /> Revert to Original
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onToggleOriginal();
                            scrollToMessage(message.id);
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#722f37]/40 border border-[#722f37]/20 px-3 py-1.5 rounded-lg bg-[#722f37]/20"
                        >
                          {showOriginal ? "View Final Version" : "View Original Input"}
                        </button>
                      </div>
                    )}
                    {(() => {
                      const authUrlMatch = message.text.match(/\[AUTH_URL\]\s*(https?:\/\/[^\s]+)/);
                      return authUrlMatch ? <div className="mt-4"><AuthRequestCard authUrl={authUrlMatch[1]} /></div> : null;
                    })()}

                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <VoiceNoteSection
                        message={message}
                        isRecording={isRecording}
                        recordingTime={recordingTime}
                        onStartRecording={onStartRecording}
                        onStopRecording={onStopRecording}
                        onUpdateMessage={onUpdateMessage}
                        formatTime={formatTime}
                      />
                    </div>
                  </div>
                );
              })()
            ) : (
              !message.isEditing ? (
                message.isAnalysis && message.sender === 'user' && message.text.toUpperCase().includes('ANALYZING') ? (
                  isLoading ? (
                    <span className="text-[10px] font-bold text-gray-400 animate-pulse italic uppercase tracking-[0.2em]">Analyzing...</span>
                  ) : null
                ) : (
                  <>
                    {message.text && <span>{message.text}</span>}
                    {/* Show voice notes for user messages (e.g. case recordings) */}
                    {(message.voiceNotes?.length || message.recordingUrl) ? (
                      <div className="mt-3">
                        <VoiceNoteSection
                          message={message}
                          onUpdateMessage={onUpdateMessage}
                          formatTime={formatTime}
                        />
                      </div>
                    ) : null}
                  </>
                )
              ) : (
                <div className="w-full min-w-[300px] md:min-w-[500px]">
                  <EditMessageForm
                    initialText={message.text}
                    onSave={(newText) => {
                      if (onUpdateMessage) {
                        // Reset the current message's editing state WITHOUT changing its text
                        onUpdateMessage(message.id, { isEditing: false });

                        // Send the edited version as a NEW message at the bottom
                        if (onSendMessage) {
                          onSendMessage(newText);
                        }
                      }
                    }}
                    onCancel={() => onUpdateMessage?.(message.id, { isEditing: false })}
                  />
                </div>
              )
            )}
          </div>
          <div className="mt-3 text-[10px] text-gray-500 flex items-center gap-1.5 font-medium">
            {isSharedCase && isUser && message.authorName && (
              <span className="text-[#e9c176]/70 font-bold uppercase tracking-widest mr-1">
                {message.authorName}
              </span>
            )}
            <span>{message.time}</span>
            {message.editedAt && (
              <span className="flex items-center gap-1">
                <span className="w-0.5 h-0.5 bg-gray-600 rounded-full" />
                <span className="italic">Edited by {message.editedBy} at {message.editedAt}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
