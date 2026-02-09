'use client';

import { Scale, User } from 'lucide-react';
import { CHAT_SENDER, COLORS } from '@/lib/constants';
import ReactMarkdown from 'react-markdown';
import { AuthRequestCard } from '@/components/auth-request-card';

interface Message {
  id: string | number;
  text: string;
  sender: typeof CHAT_SENDER.USER | typeof CHAT_SENDER.AI;
  time: string;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
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
            <div className={`flex-1 ${isUser ? 'max-w-[90%] md:max-w-[85%] ml-auto' : 'max-w-[90%] md:max-w-[85%]'}`}>
              <div className={`backdrop-blur border rounded-2xl p-3.5 md:p-5 ${
                isUser 
                  ? `bg-[${COLORS.PRIMARY}]/20 border-` + COLORS.PRIMARY + `/40 rounded-tr-sm` 
                  : `bg-[#2A2A2A]/70 border-` + COLORS.PRIMARY + `/30 rounded-tl-sm`
              }`}>
                <div className="text-sm md:text-base text-gray-200 leading-relaxed prose prose-invert max-w-none">
                  {message.text === "" && isAI ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  ) : isAI ? (
                    <>
                    <ReactMarkdown 
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                        h3: ({children}) => <h3 className="text-sm md:text-base font-bold mb-2 mt-3">{children}</h3>,
                        a: ({node, ...props}) => (
                          <a 
                            {...props} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#8B4564] hover:text-[#9D5373] underline font-medium transition-colors"
                          />
                        ),
                      }}
                    >
                      {message.text.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
                    </ReactMarkdown>
                    {(() => {
                        const authUrlMatch = message.text.match(/\[AUTH_URL\]\s*(https?:\/\/[^\s]+)/);
                        if (authUrlMatch) {
                            return <AuthRequestCard authUrl={authUrlMatch[1]} />;
                        }
                        return null;
                    })()}
                    </>
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
