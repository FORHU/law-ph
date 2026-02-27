import React from 'react';
import { Scale, User, MoreHorizontal, Edit2, Mic, Play, Square, PenTool, Trash2, BookOpen, Mail, Calendar, History, GitGraph } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Message } from './types';
import { AIResponseTabs } from './ai-response-tabs';
import { VoiceNoteSection } from './voice-note-section';
import { TAB_CONFIG, ANIMATION_VARIANTS } from './constants';

interface MessageItemProps {
  message: Message;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showOriginal: boolean;
  onToggleOriginal: () => void;
  isRecording: boolean;
  onStartStopRecording: () => void;
  editingNoteLabel: Record<string, string | null>;
  setEditingNoteLabel: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  onDelete?: (id: string | number) => void;
  onSourceClick?: (source: any, context?: string) => void;
  onCaseClick?: (caseItem: any, context?: string) => void;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onOpenNote?: (id: string | number, text: string) => void;
  onConfirmDeleteVoiceNote: (messageId: string | number, noteId: string, label: string) => void;
  scrollToMessage: (id: string | number) => void;
  isRelatedCasesLoading?: boolean;
}

export function MessageItem({
  message,
  activeTab,
  onTabChange,
  showOriginal,
  onToggleOriginal,
  isRecording,
  onStartStopRecording,
  editingNoteLabel,
  setEditingNoteLabel,
  onDelete,
  onSourceClick,
  onCaseClick,
  onUpdateMessage,
  onOpenNote,
  onConfirmDeleteVoiceNote,
  scrollToMessage,
  isRelatedCasesLoading = false,
}: MessageItemProps) {
  const isUser = message.sender === CHAT_SENDER.USER;
  const isAI = message.sender === CHAT_SENDER.AI;

  return (
    <div
      id={`message-${message.id}`}
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
            <AIResponseTabs 
              activeTab={activeTab} 
              onTabChange={onTabChange} 
              tabConfig={TAB_CONFIG} 
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover/msg:opacity-100 flex-shrink-0">
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10 w-48 shadow-2xl">
                <DropdownMenuItem 
                  className="hover:bg-white/5 cursor-pointer py-2 focus:bg-[#8B4564]/20 focus:text-white text-[#E0A7C2]"
                  onClick={() => {
                    if (onUpdateMessage) {
                      onUpdateMessage(message.id, { isEditing: true });
                    }
                  }}
                >
                  <Edit2 size={14} className="mr-2" />
                  <span>Edit Response</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  className="hover:bg-white/5 cursor-pointer py-2 focus:bg-[#8B4564]/20 focus:text-white text-[#E0A7C2]"
                  onClick={() => onOpenNote?.(message.id, message.text)}
                >
                  <PenTool size={14} className="mr-2" />
                  <span>Add Sticky Note</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  className="hover:bg-white/5 cursor-pointer py-2 focus:bg-[#8B4564]/20 focus:text-white text-[#E0A7C2]"
                  onClick={onStartStopRecording}
                >
                  {isRecording ? (
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

        <div className={`p-4 rounded-2xl ${isUser ? 'bg-[#8B4564]/10 border border-[#8B4564]/20' : 'bg-[#1E1E1E]/50 border border-white/5 shadow-inner'}`}>
          <div className="text-sm md:text-base text-gray-100 leading-relaxed prose prose-invert max-w-none">
            {message.text === "" && isAI ? (
              <div className="flex gap-1 py-1">
                {[0, 150, 300].map(delay => (
                  <span 
                    key={delay}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" 
                    style={{ animationDelay: `${delay}ms` }} 
                  />
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === 'answer' && (
                  <motion.div
                    key="answer"
                    {...ANIMATION_VARIANTS.container}
                  >
                    {message.isEditing ? (
                      <EditMessageForm 
                        initialText={message.text.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
                        onSave={(newText) => {
                          onUpdateMessage?.(message.id, {
                            text: newText,
                            originalText: message.originalText || message.text,
                            isEditing: false,
                            editedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                            editedBy: "You"
                          });
                        }}
                        onCancel={() => onUpdateMessage?.(message.id, { isEditing: false })}
                      />
                    ) : (
                      <>
                        <GranularDiffViewer 
                          original={showOriginal ? '' : (message.originalText || '')} 
                          current={showOriginal && message.originalText ? message.originalText : message.text} 
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
                                className="text-[11px] font-semibold tracking-wide text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md"
                              >
                                Reset to Original
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
                          const sourceText = message.originalText || message.text;
                          const authUrlMatch = sourceText.match(/\[AUTH_URL\]\s*(https?:\/\/[^\s]+)/);
                          return authUrlMatch ? <div className="mt-4"><AuthRequestCard authUrl={authUrlMatch[1]} /></div> : null;
                        })()}
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === 'email' && (
                  <motion.div key="email" {...ANIMATION_VARIANTS.container} className="py-8 text-center space-y-3">
                    <div className="p-4 bg-[#8B4564]/10 rounded-full w-fit mx-auto"><Mail size={32} className="text-[#E0A7C2]" /></div>
                    <h4 className="text-white font-bold text-lg">AI Email Drafter</h4>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto">ilovelawyer is drafting an email based on this conversation.</p>
                  </motion.div>
                )}

                {activeTab === 'schedule' && (
                  <motion.div key="schedule" {...ANIMATION_VARIANTS.container} className="py-8 text-center space-y-3">
                    <div className="p-4 bg-[#8B4564]/10 rounded-full w-fit mx-auto"><Calendar size={32} className="text-[#E0A7C2]" /></div>
                    <h4 className="text-white font-bold text-lg">Case Scheduler</h4>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto">Identifying key dates and scheduling next steps.</p>
                  </motion.div>
                )}

                {activeTab === 'sources' && (
                   <motion.div key="sources" {...ANIMATION_VARIANTS.container}>
                      <div className="space-y-3">
                        {message.sources?.map((source, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                            onClick={() => onSourceClick?.(source, message.text)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold text-[#E0A7C2] uppercase tracking-wide">{source.type}</span>
                            </div>
                            <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{source.reference || source.description}</p>
                          </div>
                        ))}
                      </div>
                   </motion.div>
                )}

                {activeTab === 'related' && (
                   <motion.div key="related" {...ANIMATION_VARIANTS.container}>
                      <div className="space-y-3">
                        {isRelatedCasesLoading ? (
                          <div className="py-8 text-center space-y-3">
                            <div className="flex justify-center gap-1">
                              {[0, 150, 300].map(delay => (
                                <span
                                  key={delay}
                                  className="w-2 h-2 bg-[#E0A7C2]/60 rounded-full animate-bounce"
                                  style={{ animationDelay: `${delay}ms` }}
                                />
                              ))}
                            </div>
                            <p className="text-gray-400 text-sm">Searching legal database...</p>
                          </div>
                        ) : message.relatedCases && message.relatedCases.length > 0 ? (
                          message.relatedCases.map((caseItem, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all group"
                            >
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <span className="text-xs font-bold text-[#E0A7C2] uppercase tracking-wide flex-shrink-0">
                                  {caseItem.type === 'lawphil_statute' ? 'STATUTE' : 'SUPREME COURT CASE'}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {caseItem.score !== undefined && (
                                    <span className="text-[10px] bg-[#8B4564]/20 text-[#E0A7C2] px-1.5 py-0.5 rounded-full font-semibold">
                                      {(caseItem.score * 100).toFixed(0)}% match
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-500">{caseItem.caseNumber}</span>
                                </div>
                              </div>
                              <p
                                className="text-sm text-gray-300 group-hover:text-white transition-colors cursor-pointer"
                                onClick={() => onCaseClick?.(caseItem, message.text)}
                              >
                                {caseItem.title || caseItem.description}
                              </p>
                              {caseItem.url && (
                                <a
                                  href={caseItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#E0A7C2]/60 hover:text-[#E0A7C2] transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View full document ↗
                                </a>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center space-y-2">
                            <div className="p-3 bg-[#8B4564]/10 rounded-full w-fit mx-auto">
                              <GitGraph size={24} className="text-[#E0A7C2]/50" />
                            </div>
                            <p className="text-gray-500 text-sm">No related cases found.</p>
                            <p className="text-gray-600 text-xs">Cases are retrieved from the legal database when you open this tab.</p>
                          </div>
                        )}
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
          
          <VoiceNoteSection 
            message={message}
            editingNoteLabel={editingNoteLabel}
            setEditingNoteLabel={setEditingNoteLabel}
            onUpdateMessage={onUpdateMessage}
            onConfirmDelete={onConfirmDeleteVoiceNote}
          />
          
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-white/5 pt-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isUser ? 'text-[#E0A7C2]' : 'text-gray-500'}`}>
                {message.sender}
              </span>
              <span className="text-[10px] text-gray-600 font-medium">{message.time}</span>
              {message.editedAt && (
                <span className="text-[10px] text-gray-600 italic font-medium ml-1">
                  • Edited by {message.editedBy} at {message.editedAt}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
