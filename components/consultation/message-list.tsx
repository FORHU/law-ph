import React, { useState } from 'react';

import { Scale, User, Trash2, Mail, Calendar, BookOpen, Gavel, Copy, History, GitGraph, Mic, Square, Download, X, MoreHorizontal, Edit2, PenTool, RefreshCcw } from 'lucide-react';
import { CHAT_SENDER, COLORS } from '@/lib/constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { AuthRequestCard } from '@/components/auth/auth-request-card';
import { stripMarkdown } from '@/lib/clipboard-utils';
import { LegalSource, RelatedCase } from '@/lib/citation-parser';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth/auth-provider';
import { EditMessageForm } from './edit-message-form';

interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'ai';
  time: string;
  sources?: LegalSource[];
  relatedCases?: RelatedCase[];
  recordingUrl?: string;
  voiceNotes?: { id: string; url: string }[];
  isEditing?: boolean;
  originalText?: string;
  highlights?: { id: string, snippet: string, note: string }[];
  timeline?: any[];
  mindMap?: any;
  editedAt?: string;
  editedBy?: string;
  [key: string]: any; // allow extra props for __appendVoiceNote
}

interface MessageListProps {
  messages: Message[];
  onDelete?: (id: string | number) => void;
  onSourceClick?: (source: LegalSource, context?: string) => void;
  onCaseClick?: (caseItem: RelatedCase, context?: string) => void;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onOpenNote?: (id: string | number, text: string) => void;
}


// Helper to normalize words for comparison
const normalizeWord = (word: string) => word.toLowerCase().trim().replace(/[.,!?;:()\[\]{}"'“”‘’]/g, '');

function DiffHighlighter({ children, originalSet }: { children: React.ReactNode, originalSet: Set<string> }) {
  if (children === undefined || children === null) return null;

  const processText = (text: string) => {
    if (!text) return text;
    // Split on spaces but keep them to preserve spacing intent
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, i) => {
      if (!token) return null;
      // Whitespace tokens: render as-is inside a span to preserve visual spacing
      if (/^\s+$/.test(token)) {
        return <span key={i} style={{ whiteSpace: 'pre' }}>{token}</span>;
      }
      const cleanWord = normalizeWord(token);
      const isNew = cleanWord && !originalSet.has(cleanWord);
      return (
        <span
          key={i}
          className={isNew ? 'text-[#E0A7C2] font-semibold tracking-wide' : 'tracking-normal'}
        >
          {token}
        </span>
      );
    });
  };

  return (
    <>
      {React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processText(child);
        }
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<any>;
          if (typeof element.props.children === 'string') {
            return React.cloneElement(element, {
              children: processText(element.props.children)
            } as any);
          }
          return child;
        }
        return child;
      })}
    </>
  );
}

function GranularDiffViewer({ original, current }: { original?: string, current?: string }) {
  const safeOriginal = original || "";
  const safeCurrent = current || "";
  
  // Use a cleaner word set for comparison to avoid punctuation issues
  // Split by anything that isn't a word or character to get tokens, then normalize each
  const originalWords = safeOriginal.split(/[\s,!?;:()\[\]{}"'“”‘’]+/).filter(Boolean);
  const originalSet = new Set(originalWords.map(normalizeWord).filter(Boolean));
  const hasEdit = safeOriginal && safeOriginal !== safeCurrent;

  return (
    <ReactMarkdown 
      components={{
        p: ({children}) => <p className="mb-2 last:mb-0 text-gray-200 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</p>,
        ul: ({children}) => <ul className="list-disc ml-5 mb-2 space-y-1 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</ul>,
        ol: ({children}) => <ol className="list-decimal ml-5 mb-2 space-y-1 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</ol>,
        li: ({children}) => <li className="text-gray-200 mb-0.5 last:mb-0 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</li>,
        h3: ({children}) => <h3 className="text-lg md:text-xl font-bold mb-2 mt-4 text-white tracking-wide">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</h3>,
        strong: ({children}) => <strong className="font-bold text-white">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</strong>,
        em: ({children}) => <em className="italic">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</em>,
        a: ({node, children, ...props}) => (
          <a 
            {...props} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#E0A7C2] hover:text-[#F0B7D2] underline font-medium transition-colors"
          >
            {children}
          </a>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {safeCurrent.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
    </ReactMarkdown>
  );
}

export function MessageList({ messages, onDelete, onSourceClick, onCaseClick, onUpdateMessage, onOpenNote }: MessageListProps) {
  const { session } = useAuth();
  const [activeTabs, setActiveTabs] = useState<Record<string | number, string>>({});
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState<Record<string | number, boolean>>({});
  const [recordingTime, setRecordingTime] = useState<Record<string | number, number>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string | number, boolean>>({});
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<BlobPart[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startRecording = async (messageId: string | number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', event => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (onUpdateMessage) {
          const newNote = { id: Date.now().toString(), url: audioUrl };
          onUpdateMessage(messageId, { __appendVoiceNote: newNote });
        }
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(prev => ({ ...prev, [messageId]: 0 }));
      });

      mediaRecorder.start();
      setIsRecording(prev => ({ ...prev, [messageId]: true }));
      setRecordingTime(prev => ({ ...prev, [messageId]: 0 }));
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => ({ ...prev, [messageId]: (prev[messageId] || 0) + 1 }));
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = (messageId: string | number) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(prev => ({ ...prev, [messageId]: false }));
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTabChange = (messageId: string | number, tab: string) => {
    setActiveTabs(prev => ({ ...prev, [messageId]: tab }));
  };

  const scrollToMessage = (id: string | number) => {
    setTimeout(() => {
      document.getElementById(`message-bubble-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isUser = message.sender === CHAT_SENDER.USER;
        const isAI = message.sender === CHAT_SENDER.AI;
        
        return (
          <div
            id={`message-bubble-${message.id}`}
            key={message.id}
            className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} scroll-mt-24`}
          >
            {isAI && (
              <div className={`p-1.5 md:p-2 bg-[${COLORS.PRIMARY}]/20 rounded-lg mt-1 flex-shrink-0`}>
                <Scale size={16} className={`text-[${COLORS.PRIMARY}] md:w-[18px] md:h-[18px]`} />
              </div>
            )}
            {isUser && (
              <div className={`p-1.5 md:p-2 bg-[${COLORS.PRIMARY}]/20 rounded-full mt-1 flex-shrink-0`}>
                <User size={16} className="text-white md:w-[18px] md:h-[18px]" />
              </div>
            )}
            <div className={`flex-1 ${isUser ? 'max-w-[90%] md:max-w-[85%] ml-auto' : 'w-full md:max-w-[90%] lg:max-w-[85%]'} group/msg relative overflow-hidden`}>
              {!isUser && isAI && (
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-[#252525]/80 backdrop-blur-md rounded-lg p-1 border border-white/5 shadow-2xl flex-1 md:flex-none">
                    <button 
                      onClick={() => handleTabChange(message.id, 'answer')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all ${
                        (activeTabs[message.id] || 'answer') === 'answer' 
                          ? 'bg-[#8B4564]/30 text-[#E0A7C2] border border-[#8B4564]/40 shadow-inner' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Scale size={14} />
                      Answer
                    </button>

                    {/* Only show Related Cases tab if there are cases */}
                    {message.relatedCases && message.relatedCases.length > 0 && (
                      <button 
                        onClick={() => handleTabChange(message.id, 'related')}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition-all whitespace-nowrap group/tab ${
                          activeTabs[message.id] === 'related'
                            ? 'bg-[#8B4564]/30 text-[#E0A7C2] border border-[#8B4564]/40'
                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <Gavel size={14} />
                        Related Cases
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                          activeTabs[message.id] === 'related' ? 'bg-[#E0A7C2]/20 text-[#E0A7C2]' : 'bg-white/10 text-white/40 group-hover/tab:bg-white/20 group-hover/tab:text-white/60'
                        }`}>{message.relatedCases.length}</span>
                      </button>
                    )}

                    {/* Only show Sources tab if there are sources */}
                    {message.sources && message.sources.length > 0 && (
                      <button 
                        onClick={() => handleTabChange(message.id, 'sources')}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition-all whitespace-nowrap group/tab ${
                          activeTabs[message.id] === 'sources'
                            ? 'bg-[#8B4564]/30 text-[#E0A7C2] border border-[#8B4564]/40'
                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <BookOpen size={14} />
                        Sources
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                          activeTabs[message.id] === 'sources' ? 'bg-[#E0A7C2]/20 text-[#E0A7C2]' : 'bg-white/10 text-white/40 group-hover/tab:bg-white/20 group-hover/tab:text-white/60'
                        }`}>{message.sources.length}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className={`backdrop-blur border rounded-2xl p-3.5 md:p-6 pt-8 pb-6 relative group/inner break-words overflow-hidden ${
                isUser 
                  ? `bg-[${COLORS.PRIMARY}]/20 border-` + COLORS.PRIMARY + `/40 rounded-tr-sm` 
                  : `bg-[#2A2A2A]/40 ${message.originalText && message.text !== message.originalText ? 'border-[#E0A7C2]/60' : 'border-' + COLORS.PRIMARY + '/10'} rounded-tl-sm shadow-xl`
              }`}>
                {/* AI Menu Icon at Top Right - Moved inside border per user request */}
                {!isUser && isAI && !message.isEditing && (
                  <div className="absolute top-2 right-2 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 text-gray-400 hover:text-white rounded-md transition-colors focus:outline-none">
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-[#252525]/95 backdrop-blur-xl border-white/5 text-gray-200">
                        <DropdownMenuItem 
                          className="group flex items-center px-2 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer focus:bg-[#8B4564]/20 focus:text-white"
                          onClick={() => {
                            const activeTab = activeTabs[message.id] || 'answer';
                            let textToCopy = '';
                            if (activeTab === 'answer') {
                              textToCopy = stripMarkdown(message.text.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim());
                            } else if (activeTab === 'sources') {
                              const sources = message.sources || [];
                              textToCopy = "Legal Sources & Citations:\n\n" + sources.map(s => `${s.type.toUpperCase()}: ${s.reference}\n${s.description}`).join("\n\n");
                            } else if (activeTab === 'related') {
                              const cases = message.relatedCases || [];
                              textToCopy = "Related Jurisprudence:\n\n" + cases.map(c => `SUPREME COURT CASE: ${c.caseNumber}\n${c.description}`).join("\n\n");
                            }
                            if (textToCopy) navigator.clipboard.writeText(textToCopy);
                          }}
                        >
                          <Copy size={14} className="mr-2 text-gray-400 group-hover:text-white" />
                          <span>Copy Content</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="group flex items-center px-2 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer focus:bg-[#8B4564]/20 focus:text-white"
                          onClick={() => {
                            if (onUpdateMessage) {
                              onUpdateMessage(message.id, { isEditing: !message.isEditing });
                            }
                          }}
                        >
                          <Edit2 size={14} className="mr-2 text-gray-400 group-hover:text-white" />
                          <span>{message.isEditing ? 'Cancel Edit' : 'Edit Response'}</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator className="bg-white/5" />
                        
                        <DropdownMenuItem 
                          className="group flex items-center px-2 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer focus:bg-[#8B4564]/20 focus:text-white"
                          onClick={() => {
                              if (onOpenNote) {
                                onOpenNote(message.id, message.text);
                              }
                          }}
                        >
                          <PenTool size={14} className="mr-2 text-gray-400 group-hover:text-white" />
                          <span>Add Sticky Note</span>
                        </DropdownMenuItem>


                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                {/* Message Actions For User (Delete) */}
                {isUser && onDelete && (
                  <div className="absolute -left-8 top-2 flex flex-col gap-2 opacity-0 group-hover/msg:opacity-100 transition-all transition-opacity z-20">
                    <button
                      onClick={() => onDelete(message.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete message"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                
                <div className="text-sm md:text-base text-gray-100 leading-relaxed prose prose-invert max-w-none">
                  {message.text === "" && isAI ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  ) : isAI ? (
                    (() => {
                      const currentTab = activeTabs[message.id] || 'answer';
                      
                      if (currentTab === 'sources') {
                        const sources = message.sources || [];
                        return (
                          <div className="py-4 space-y-4">
                            <h4 className="text-white font-bold flex items-center gap-2">
                              <BookOpen size={16} /> Legal Sources & Citations
                            </h4>
                            <div className="space-y-3">
                              {sources.map((source, i) => (
                                <div 
                                  key={i} 
                                  className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer group"
                                  onClick={() => onSourceClick?.(source, message.text)}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-[#E0A7C2]">{source.type.toUpperCase()}</span>
                                    <span className="text-[10px] text-gray-500">{source.reference}</span>
                                  </div>
                                  <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{source.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (currentTab === 'related') {
                        const cases = message.relatedCases || [];
                        return (
                          <div className="py-4 space-y-4">
                            <h4 className="text-white font-bold flex items-center gap-2">
                              <Gavel size={16} /> Related Jurisprudence
                            </h4>
                            <div className="space-y-3">
                              {cases.map((caseItem, i) => (
                                <div 
                                  key={i} 
                                  className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer group"
                                  onClick={() => onCaseClick?.(caseItem, message.text)}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-[#E0A7C2]">SUPREME COURT CASE</span>
                                    <span className="text-[10px] text-gray-500">{caseItem.caseNumber}</span>
                                  </div>
                                  <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{caseItem.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (currentTab === 'timeline') {
                        return (
                          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="p-4 bg-[#8B4564]/10 rounded-full">
                              <History size={32} className="text-[#E0A7C2]" />
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-lg">Timeline View</h4>
                              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                ilovelawyer is generating a chronological overview of your case.
                              </p>
                              <div className="mt-4 flex gap-1 justify-center">
                                <span className="w-1.5 h-1.5 bg-[#8B4564]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-[#8B4564]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-[#8B4564]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (currentTab === 'mindmap') {
                        return (
                          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="p-4 bg-[#8B4564]/10 rounded-full">
                              <GitGraph size={32} className="text-[#E0A7C2]" />
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-lg">Legal Mind Map</h4>
                              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                Visualizing the nodes and connections of your legal situation.
                              </p>
                              <div className="mt-4 flex gap-1 justify-center">
                                <span className="w-1.5 h-1.5 bg-[#8B4564]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-[#8B4564]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-[#8B4564]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (message.isEditing) {
                        return (
                          <EditMessageForm 
                             initialText={(message.text || "").replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
                             onSave={(newText) => {
                               try {
                                 if (onUpdateMessage) {
                                   onUpdateMessage(message.id, {
                                     text: newText,
                                     originalText: message.originalText || message.text,
                                     isEditing: false,
                                     editedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                                     editedBy: session?.user?.email || "You"
                                   });
                                 }
                               } catch (err) {
                                 console.error("[MessageList] Error updating message:", err);
                               }
                             }}
                             onCancel={() => {
                               if (onUpdateMessage) {
                                 onUpdateMessage(message.id, { isEditing: false });
                               }
                             }}
                          />
                        )
                      }
                      
                      const displayContent = showOriginal[message.id] && message.originalText ? message.originalText : message.text;
                      
                      return (
                        <div key="diff-view">
                         <GranularDiffViewer 
                            original={showOriginal[message.id] ? '' : (message.originalText || '')} 
                            current={displayContent} 
                         />
                          
                          {message.originalText && message.text !== message.originalText && (
                             <div className="mt-2 flex justify-end gap-2">
                                {showOriginal[message.id] && (
                                  <button 
                                    onClick={() => {
                                      if (onUpdateMessage) {
                                        onUpdateMessage(message.id, { 
                                          text: message.originalText!,
                                          isEditing: false,
                                          editedAt: undefined,
                                          editedBy: undefined
                                        });
                                      }
                                      setShowOriginal(prev => ({...prev, [message.id]: false}));
                                      scrollToMessage(message.id);
                                    }} 
                                    className="text-[11px] font-semibold tracking-wide text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5"
                                  >
                                    <RefreshCcw size={10} /> Reset to Original
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    setShowOriginal(prev => ({...prev, [message.id]: !prev[message.id]}));
                                    scrollToMessage(message.id);
                                  }} 
                                  className="text-[11px] font-semibold tracking-wide text-[#E0A7C2] hover:text-white transition-colors bg-[#8B4564]/10 hover:bg-[#8B4564]/30 px-2.5 py-1 rounded-md"
                                >
                                  {showOriginal[message.id] ? "Show Edited" : "Show Original"}
                                </button>
                             </div>
                          )}
                          {(() => {
                            const authUrlMatch = message.text.match(/\[AUTH_URL\]\s*(https?:\/\/[^\s]+)/);
                            if (authUrlMatch) {
                                return <div className="mt-4"><AuthRequestCard authUrl={authUrlMatch[1]} /></div>;
                            }
                            return null;
                        })()}

                         {/* Voice Notes Section */}
                        {(() => {
                          const notes = message.voiceNotes || (message.recordingUrl ? [{ id: 'legacy', url: message.recordingUrl }] : []);
                          return (
                            <div className="mt-4 flex flex-col gap-2">
                              {/* List existing notes */}
                              {notes.map((note: { id: string; url: string }, idx: number) => (
                                <div key={note.id} className="p-3 bg-black/30 rounded-lg border border-white/5 flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                      <Mic size={12}/> Voice Note {notes.length > 1 ? `#${idx + 1}` : ''}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {/* Download button */}
                                      <button
                                        title="Download recording"
                                        className="p-1 text-gray-500 hover:text-[#E0A7C2] transition-colors"
                                        onClick={() => {
                                          const a = document.createElement('a');
                                          a.href = note.url;
                                          a.download = `voice-note-${idx + 1}.webm`;
                                          a.click();
                                        }}
                                      >
                                        <Download size={13} />
                                      </button>
                                      {/* Delete button */}
                                      <button
                                        title="Delete recording"
                                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                        onClick={() => {
                                          if (onUpdateMessage) {
                                            const remaining = notes.filter((_: any, i: number) => i !== idx);
                                            onUpdateMessage(message.id, {
                                              voiceNotes: remaining,
                                              recordingUrl: remaining.length > 0 ? remaining[0].url : undefined
                                            });
                                          }
                                        }}
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  </div>
                                  <audio controls src={note.url} className="h-8 max-w-full" />
                                </div>
                              ))}

                              {/* Recording indicator / controls */}
                              {isRecording[message.id] ? (
                                <div className="flex items-center gap-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                  </span>
                                  <span className="text-xs font-mono font-semibold text-red-400">REC {formatTime(recordingTime[message.id] || 0)}</span>
                                  <button
                                    onClick={() => stopRecording(message.id)}
                                    className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded-md text-xs font-semibold text-red-400 hover:text-white transition-colors"
                                  >
                                    <Square size={10} className="fill-red-400" /> Stop
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startRecording(message.id)}
                                  className="flex items-center gap-2 px-3 py-2 bg-[#8B4564]/10 hover:bg-[#8B4564]/25 border border-[#8B4564]/30 rounded-lg text-xs font-semibold text-[#E0A7C2] hover:text-white transition-colors w-fit"
                                >
                                  <Mic size={13} /> Record Audio Note
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        </div>
                      );
                    })()
                  ) : (
                    message.text
                  )}
                </div>
                <div className="mt-3 text-[10px] text-gray-500 flex items-center gap-1.5 font-medium">
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
      })}
    </div>
  );
}
