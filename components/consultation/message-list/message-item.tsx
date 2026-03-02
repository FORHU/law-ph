import { Scale, User, MoreHorizontal, Edit2, PenTool, Trash2, BookOpen, History, GitGraph, RefreshCcw, Gavel, Copy } from 'lucide-react';
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
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onOpenNote?: (id: string | number, text: string) => void;
  scrollToMessage: (id: string | number) => void;
  formatTime: (secs: number) => string;
  session?: any;
  relatedCasesLoading?: boolean;
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
  onUpdateMessage,
  onOpenNote,
  scrollToMessage,
  formatTime,
  session,
  relatedCasesLoading
}: MessageItemProps) {
  const isUser = message.sender === CHAT_SENDER.USER;
  const isAI = message.sender === CHAT_SENDER.AI;

  return (
    <div
      id={`message-bubble-${message.id}`}
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
            <AIResponseTabs 
              activeTab={activeTab} 
              onTabChange={onTabChange} 
              tabConfig={TAB_CONFIG} 
              message={message}
            />
          </div>
        )}

        <div className={`backdrop-blur border rounded-2xl p-3.5 md:p-6 pt-8 pb-6 relative group/inner break-words overflow-hidden ${
          isUser 
            ? `bg-[${COLORS.PRIMARY}]/20 border-` + COLORS.PRIMARY + `/40 rounded-tr-sm` 
            : `bg-[#2A2A2A]/40 ${message.originalText && message.text !== message.originalText ? 'border-[#E0A7C2]/60' : 'border-' + COLORS.PRIMARY + '/10'} rounded-tl-sm shadow-xl`
        }`}>
          {/* AI Menu Icon at Top Right */}
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
                  <DropdownMenuItem 
                    className="group flex items-center px-2 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer focus:bg-[#8B4564]/20 focus:text-white"
                    onClick={() => onUpdateMessage?.(message.id, { isEditing: !message.isEditing })}
                  >
                    <Edit2 size={14} className="mr-2 text-gray-400 group-hover:text-white" />
                    <span>{message.isEditing ? 'Cancel Edit' : 'Edit Response'}</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-white/5" />
                  
                  <DropdownMenuItem 
                    className="group flex items-center px-2 py-2 text-sm text-gray-300 hover:bg-white/5 cursor-pointer focus:bg-[#8B4564]/20 focus:text-white"
                    onClick={() => onOpenNote?.(message.id, message.text)}
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
                if (activeTab === 'sources') {
                  const sources = message.sources || [];
                  return (
                    <div className="py-4 space-y-4">
                      <h4 className="text-white font-bold flex items-center gap-2">
                        <BookOpen size={16} /> Legal Sources & Citations
                      </h4>
                      <div className="space-y-3">
                        {sources.map((source: LegalSource, i: number) => (
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

                if (activeTab === 'related') {
                  const cases = message.relatedCases || [];
                  
                  if (relatedCasesLoading) {
                    return (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="p-4 bg-[#8B4564]/10 rounded-full">
                          <Gavel size={32} className="text-[#E0A7C2] animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-lg">Searching Jurisprudence</h4>
                          <p className="text-gray-400 text-sm max-w-xs mx-auto">
                            ilovelawyer is searching for relevant Supreme Court cases...
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="py-4 space-y-4">
                      <h4 className="text-white font-bold flex items-center gap-2">
                        <Gavel size={16} /> Related Jurisprudence
                      </h4>
                      <div className="space-y-3">
                        {cases.map((caseItem: RelatedCase, i: number) => (
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

                if (activeTab === 'timeline') {
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

                if (activeTab === 'mindmap') {
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
                         onUpdateMessage?.(message.id, {
                           text: newText,
                           originalText: message.originalText || message.text,
                           isEditing: false,
                           editedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                           editedBy: session?.user?.email || "You"
                         });
                       }}
                       onCancel={() => onUpdateMessage?.(message.id, { isEditing: false })}
                    />
                  )
                }
                
                const displayContent = showOriginal && message.originalText ? message.originalText : message.text;
                
                return (
                  <div key="diff-view">
                   <GranularDiffViewer 
                      original={showOriginal ? '' : (message.originalText || '')} 
                      current={displayContent} 
                   />
                    
                    {message.originalText && message.text !== message.originalText && (
                       <div className="mt-2 flex justify-end gap-2">
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
                              className="text-[11px] font-semibold tracking-wide text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5"
                            >
                              <RefreshCcw size={10} /> Reset to Original
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              onToggleOriginal();
                              scrollToMessage(message.id);
                            }} 
                            className="text-[11px] font-semibold tracking-wide text-[#E0A7C2] hover:text-white transition-colors bg-[#8B4564]/10 hover:bg-[#8B4564]/30 px-2.5 py-1 rounded-md"
                          >
                            {showOriginal ? "Show Edited" : "Show Original"}
                          </button>
                       </div>
                    )}
                    {(() => {
                      const authUrlMatch = message.text.match(/\[AUTH_URL\]\s*(https?:\/\/[^\s]+)/);
                      return authUrlMatch ? <div className="mt-4"><AuthRequestCard authUrl={authUrlMatch[1]} /></div> : null;
                    })()}

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
}
