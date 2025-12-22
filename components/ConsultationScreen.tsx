
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { geminiService } from '../services/geminiService';

interface ConsultationScreenProps {
  onBack: () => void;
}

const ConsultationScreen: React.FC<ConsultationScreenProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your AI Philippine Legal Assistant. How can I help you today? Please remember that I provide information, not legal advice.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await geminiService.getLegalResponse(input, messages);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-128px)]">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Home
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-bold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          AI Consultant Online
        </div>
      </div>

      <div className="flex-grow bg-card-dark rounded-3xl border border-border-dark shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${msg.role === 'user' ? 'bg-slate-700' : 'bg-primary'}`}>
                  <span className="material-symbols-outlined text-base">
                    {msg.role === 'user' ? 'person' : 'smart_toy'}
                  </span>
                </div>
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-slate-800 text-gray-200'}`}>
                  <div className="text-sm prose prose-invert max-w-none whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-4 items-center p-4 bg-slate-800 rounded-2xl border border-border-dark">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                </div>
                <span className="text-xs text-gray-400 font-medium">Researching Philippine Law...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-border-dark bg-background-dark/30">
          <div className="relative flex items-center">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Revised Penal Code, Labor Laws, etc..."
              className="w-full bg-slate-800/50 border border-border-dark rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-gray-500"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:bg-slate-700 rounded-xl text-white transition-all shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-500 mt-3">
            LexPH provides information based on Philippine Statutes and Jurisprudence. Verify with a legal professional.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ConsultationScreen;
