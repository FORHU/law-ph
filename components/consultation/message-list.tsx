'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scale, User } from 'lucide-react';
import { CHAT_SENDER, COLORS } from '@/lib/constants';

interface Message {
  id: number;
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
                <div className="text-sm md:text-base text-gray-200 leading-relaxed">
                  {isAI ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {message.text.split("").map((char, index) => (
                        <motion.span
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: 0.01,
                            delay: index * 0.02,
                            ease: "linear",
                          }}
                        >
                          {char}
                        </motion.span>
                      ))}
                    </motion.span>
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
