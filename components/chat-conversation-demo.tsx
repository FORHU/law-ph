"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Scale, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatConversationDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: "What are my rights as a tenant if my landlord wants to terminate my lease early?",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(0);

  // Simulated conversation flow
  useEffect(() => {
    const runDemo = async () => {
      // Step 0: Initial state (already set with first user message)
      if (step === 0) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: '2',
            role: 'assistant',
            content: "Under Philippine law, particularly the Civil Code, a landlord cannot arbitrarily terminate a lease agreement before the agreed period ends. According to Article 1673, you have the right to continue occupying the property for the duration specified in your contract. If your landlord insists on early termination without just cause, they may be liable for damages. I recommend reviewing your lease agreement and, if needed, consulting with a lawyer who specializes in property law.",
            timestamp: new Date()
          }]);
          setStep(1);
        }, 2000);
      }
      
      // Step 1: Second User Message (wait for typewriter to finish ~9s)
      if (step === 1) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: '3',
            role: 'user',
            content: "Can you explain what 'just cause' means in this context?",
            timestamp: new Date()
          }]);
          setStep(2);
        }, 9550);
      }

      // Step 2: Second Assistant Response
      if (step === 2) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: '4',
            role: 'assistant',
            content: "Just cause for early lease termination typically includes: (1) Non-payment of rent, (2) Violation of lease terms, (3) Using the property for illegal activities, or (4) If the landlord or their immediate family needs to personally occupy the property. The Rent Control Act (R.A. 9653) provides additional protections. Without any of these conditions, your landlord must honor the lease term or negotiate a mutual agreement with you.",
            timestamp: new Date()
          }]);
          setStep(3);
        }, 2500);
      }
      
      // Reset loop (wait for second typewriter to finish ~7s)
      if (step === 3) {
        setTimeout(() => {
          setStep(0);
          setMessages([{
            id: '1',
            role: 'user',
            content: "What are my rights as a tenant if my landlord wants to terminate my lease early?",
            timestamp: new Date()
          }]);
        }, 9000);
      }
    };

    runDemo();
  }, [step]);

  return (
    <div className="flex flex-col h-[400px] md:h-[500px] w-full mx-auto bg-transparent rounded-xl overflow-hidden relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <AnimatePresence mode='popLayout'>
                {messages.map((msg) => (
                    <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                msg.role === 'user' 
                                    ? 'bg-[#8B4564]/20' 
                                    : 'bg-[#8B4564]/20'
                            }`}>
                                {msg.role === 'user' ? <User size={14} className="text-white" /> : <Scale size={14} className="text-[#8B4564]" />}
                            </div>

                            {/* Bubble */}
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                    ? 'bg-[#8B4564]/20 border border-[#8B4564]/40 text-gray-200 rounded-tr-sm' 
                                    : 'bg-[#2A2A2A]/70 border border-[#8B4564]/30 text-gray-200 rounded-tl-sm'
                            }`}>
                                {msg.role === 'assistant' ? (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        {msg.content.split("").map((char, index) => (
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
                                    msg.content
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {isTyping && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                >
                    <div className="flex gap-3 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-[#8B4564]/20 flex items-center justify-center flex-shrink-0">
                            <Scale size={14} className="text-[#8B4564]" />
                        </div>
                        <div className="bg-[#2A2A2A]/70 border border-[#8B4564]/30 p-3 rounded-2xl rounded-tl-sm flex gap-1 items-center h-10">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    </div>
  );
}
