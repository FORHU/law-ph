import React, { useState } from 'react';

import { Scale, User, Trash2, Mail, Calendar, BookOpen, Gavel, Copy } from 'lucide-react';
import { CHAT_SENDER, COLORS } from '@/lib/constants';
import ReactMarkdown from 'react-markdown';
import { AuthRequestCard } from '@/components/auth/auth-request-card';
import { stripMarkdown } from '@/lib/clipboard-utils';
import { LegalSource, RelatedCase } from '@/lib/citation-parser';

interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'ai';
  time: string;
  sources?: LegalSource[];
  relatedCases?: RelatedCase[];
}

interface MessageListProps {
  messages: Message[];
  onDelete?: (id: string | number) => void;
  onSourceClick?: (source: LegalSource, context?: string) => void;
  onCaseClick?: (caseItem: RelatedCase, context?: string) => void;
}

export function MessageList({ messages, onDelete, onSourceClick, onCaseClick }: MessageListProps) {
  const [activeTabs, setActiveTabs] = useState<Record<string | number, string>>({});

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
            <div className={`flex-1 ${isUser ? 'max-w-[90%] md:max-w-[85%] ml-auto' : 'w-full md:max-w-[90%] lg:max-w-[85%]'} group/msg relative`}>
              {!isUser && isAI && (
                <div className="flex items-center gap-1 mb-2 overflow-x-auto no-scrollbar">
                  <div className="flex bg-[#252525]/80 backdrop-blur-md rounded-lg p-1 border border-white/5 shadow-2xl">
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
                    <button className="px-3 py-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 flex items-center gap-2 text-xs font-medium transition-all whitespace-nowrap cursor-not-allowed">
                      <Mail size={14} />
                      Send Email
                    </button>
                    <button className="px-3 py-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 flex items-center gap-2 text-xs font-medium transition-all whitespace-nowrap cursor-not-allowed">
                      <Calendar size={14} />
                      Schedule
                    </button>
                    
                    <button className="px-3 py-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 flex items-center gap-2 text-xs font-medium transition-all whitespace-nowrap cursor-not-allowed">
                      <Mail size={14} />
                      Timeline
                    </button>
                    <button className="px-3 py-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 flex items-center gap-2 text-xs font-medium transition-all whitespace-nowrap cursor-not-allowed">
                      <Mail size={14} />
                      Mind Map
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

              <div className={`backdrop-blur border rounded-2xl p-3.5 md:p-6 ${
                isUser 
                  ? `bg-[${COLORS.PRIMARY}]/20 border-` + COLORS.PRIMARY + `/40 rounded-tr-sm` 
                  : `bg-[#2A2A2A]/40 border-` + COLORS.PRIMARY + `/10 rounded-tl-sm shadow-xl`
              }`}>
                {/* Message Actions */}
                <div className={`absolute ${isUser ? '-left-8' : '-right-8'} top-2 flex flex-col gap-2 opacity-0 group-hover/msg:opacity-100 transition-all transition-opacity`}>
                  {/* Copy Button for AI */}
                  {isAI && (
                    <button
                      onClick={() => {
                        const activeTab = activeTabs[message.id] || 'answer';
                        let textToCopy = '';

                        if (activeTab === 'answer') {
                          // Clean text: remove [AUTH_URL] tags first
                          const cleanText = message.text.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim();
                          // Then strip markdown formatting for "perfect" plain text
                          textToCopy = stripMarkdown(cleanText);
                        } else if (activeTab === 'sources') {
                          // Generate sources text from actual data
                          const sources = message.sources || [];
                          textToCopy = "Legal Sources & Citations:\n\n" + 
                            sources.map(source => 
                              `${source.type.toUpperCase()}: ${source.reference}\n${source.description}`
                            ).join("\n\n");
                        } else if (activeTab === 'related') {
                          // Generate related cases text from actual data
                          const cases = message.relatedCases || [];
                          textToCopy = "Related Jurisprudence:\n\n" + 
                            cases.map(caseItem => 
                              `SUPREME COURT CASE: ${caseItem.caseNumber}\n${caseItem.description}`
                            ).join("\n\n");
                        }

                        if (textToCopy) {
                          navigator.clipboard.writeText(textToCopy);
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-white transition-colors"
                      title="Copy content"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  
                  {/* Delete Button for User */}
                  {isUser && onDelete && (
                    <button
                      onClick={() => onDelete(message.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete message"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                
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

                      // Default: Answer tab
                      return (
                        <>
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
                          {message.text.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
                        </ReactMarkdown>
                        {(() => {
                            const authUrlMatch = message.text.match(/\[AUTH_URL\]\s*(https?:\/\/[^\s]+)/);
                            if (authUrlMatch) {
                                return <div className="mt-4"><AuthRequestCard authUrl={authUrlMatch[1]} /></div>;
                            }
                            return null;
                        })()}
                        </>
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
