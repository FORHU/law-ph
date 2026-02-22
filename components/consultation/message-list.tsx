import React, { useState } from 'react';

import { Scale, User, Trash2, Mail, Calendar, BookOpen, Gavel, Copy, History, GitGraph } from 'lucide-react';
import { CHAT_SENDER, COLORS } from '@/lib/constants';
import ReactMarkdown from 'react-markdown';
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
import { MoreHorizontal, Edit2, Mic, Play, Square, PenTool } from 'lucide-react';

interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'ai';
  time: string;
  sources?: LegalSource[];
  relatedCases?: RelatedCase[];
  recordingUrl?: string;
  isEditing?: boolean;
  originalText?: string;
  highlights?: { id: string, snippet: string, note: string }[];
  timeline?: any[];
  mindMap?: any;
}

interface MessageListProps {
  messages: Message[];
  onDelete?: (id: string | number) => void;
  onSourceClick?: (source: LegalSource, context?: string) => void;
  onCaseClick?: (caseItem: RelatedCase, context?: string) => void;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onOpenNote?: (id: string | number, text: string) => void;
}

function EditMessageForm({ 
  initialText, 
  onSave,
  onCancel
}: { 
  initialText: string; 
  onSave: (newText: string) => void; 
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  return (
    <div className="flex flex-col gap-2 relative z-10 w-full">
      <textarea
         className="w-full bg-black/40 border border-[#8B4564]/50 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-[#8B4564] min-h-[150px] resize-y custom-sidebar-scrollbar"
         value={text}
         onChange={(e) => setText(e.target.value)}
         autoFocus
      />
      <div className="flex justify-end gap-2 mt-1">
        <button 
           onClick={onCancel}
           className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button 
           onClick={() => onSave(text)}
           className="px-4 py-1.5 text-xs font-semibold bg-[#8B4564] text-white rounded-md hover:bg-[#A35276] transition-colors shadow-lg shadow-[#8B4564]/20"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function GranularDiffViewer({ original, current }: { original: string, current: string }) {
  if (!original || original === current) {
    return (
      <ReactMarkdown 
        components={{
          p: ({children}) => <p className="mb-4 last:mb-0 text-gray-200">{children}</p>,
          ul: ({children}) => <ul className="list-disc ml-5 mb-4 space-y-2">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal ml-5 mb-4 space-y-2">{children}</ol>,
          li: ({children}) => <li className="text-gray-200">{children}</li>,
          h3: ({children}) => <h3 className="text-lg md:text-xl font-bold mb-3 mt-4 text-white">{children}</h3>,
          a: ({node, ...props}) => (
            <a 
              {...props} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#E0A7C2] hover:text-[#F0B7D2] underline font-medium transition-colors"
            />
          ),
        }}
      >
        {current.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
      </ReactMarkdown>
    );
  }

  const originalWords = original.split(/(\s+)/);
  const currentWords = current.split(/(\s+)/);
  
  // Very basic word-level diff for UI purposes
  // A real diff algorithm like Myer's would be better but this is for colorizing 'new' content
  const originalSet = new Set(original.split(/\s+/));

  return (
    <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
      {currentWords.map((word, i) => {
        const isSpace = /^\s+$/.test(word);
        if (isSpace) return <span key={i}>{word}</span>;
        
        const isNew = !originalSet.has(word);
        return (
          <span 
            key={i} 
            className={isNew ? 'text-[#E0A7C2] font-medium' : 'text-gray-300'}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

export function MessageList({ messages, onDelete, onSourceClick, onCaseClick, onUpdateMessage, onOpenNote }: MessageListProps) {
  const [activeTabs, setActiveTabs] = useState<Record<string | number, string>>({});
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState<Record<string | number, boolean>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string | number, boolean>>({});
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<BlobPart[]>([]);

  const handleTabChange = (messageId: string | number, tab: string) => {
    setActiveTabs(prev => ({ ...prev, [messageId]: tab }));
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isUser = message.sender === CHAT_SENDER.USER;
        const isAI = message.sender === CHAT_SENDER.AI;
        
        return (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
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

              <div className={`backdrop-blur border rounded-2xl p-3.5 md:p-6 pb-6 relative group/inner break-words overflow-hidden ${
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
                          className="hover:bg-white/5 cursor-pointer py-2 focus:bg-[#8B4564]/20 focus:text-white"
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
                          <Copy size={14} className="mr-2" />
                          <span>Copy Content</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="hover:bg-white/5 cursor-pointer py-2 focus:bg-[#8B4564]/20 focus:text-white"
                          onClick={() => {
                            if (onUpdateMessage) {
                              onUpdateMessage(message.id, { isEditing: !message.isEditing });
                            }
                          }}
                        >
                          <Edit2 size={14} className="mr-2" />
                          <span>{message.isEditing ? 'Cancel Edit' : 'Edit Response'}</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator className="bg-white/5" />
                        
                        <DropdownMenuItem 
                          className="hover:bg-white/5 cursor-pointer py-2 focus:bg-[#8B4564]/20 focus:text-white"
                          onClick={() => {
                              if (onOpenNote) {
                                onOpenNote(message.id, message.text);
                              }
                          }}
                        >
                          <PenTool size={14} className="mr-2" />
                          <span>Add Sticky Note</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                          className="hover:bg-white/5 cursor-pointer py-2 focus:bg-[#8B4564]/20 focus:text-white text-[#E0A7C2]"
                          onClick={async () => {
                              if (!isRecording[message.id]) {
                                try {
                                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                  const mediaRecorder = new MediaRecorder(stream);
                                  mediaRecorderRef.current = mediaRecorder;
                                  audioChunksRef.current = [];

                                  mediaRecorder.addEventListener("dataavailable", event => {
                                    audioChunksRef.current.push(event.data);
                                  });

                                  mediaRecorder.addEventListener("stop", () => {
                                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                                    const audioUrl = URL.createObjectURL(audioBlob);
                                    if (onUpdateMessage) {
                                      onUpdateMessage(message.id, { recordingUrl: audioUrl });
                                    }
                                    stream.getTracks().forEach(track => track.stop());
                                  });

                                  mediaRecorder.start();
                                  setIsRecording(prev => ({...prev, [message.id]: true}));
                                } catch (err) {
                                  console.error("Microphone access denied or error:", err);
                                  alert("Could not access microphone.");
                                }
                              } else {
                                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                                  mediaRecorderRef.current.stop();
                                }
                                setIsRecording(prev => ({...prev, [message.id]: false}));
                              }
                          }}
                        >
                          {isRecording[message.id] ? (
                            <>
                              <Square size={14} className="mr-2 text-red-500 fill-red-500" />
                              <span className="text-red-400">Stop Recording</span>
                            </>
                          ) : (
                            <>
                              <Mic size={14} className="mr-2" />
                              <span>Record Audio Note</span>
                            </>
                          )}
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
                             initialText={stripMarkdown(message.text.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "")).trim()}
                             onSave={(newText) => {
                               if (onUpdateMessage) {
                                 onUpdateMessage(message.id, {
                                   text: newText,
                                   originalText: message.originalText || message.text,
                                   isEditing: false
                                 });
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
                             <div className="mt-2 text-right">
                                <button 
                                  onClick={() => setShowOriginal(prev => ({...prev, [message.id]: !prev[message.id]}))} 
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

                         {/* Audio Player if recording exists */}
                        {message.recordingUrl && (
                          <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/5 flex flex-col gap-2">
                            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1"><Mic size={12}/> Voice Note</span>
                            <audio controls src={message.recordingUrl} className="h-8 max-w-full" />
                          </div>
                        )}
                        </div>
                      );
                    })()
                  ) : (
                    message.text
                  )}
                </div>
                <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                  <span>{message.time}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
