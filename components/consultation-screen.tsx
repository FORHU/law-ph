"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSocketChat } from '@/hooks/use-socket-chat';
import { Conversation, Message } from '@/types'; // Standard Message type
import ReactMarkdown from 'react-markdown';

interface ConsultationScreenProps {
  onBack: () => void;
  isLoggedIn?: boolean;
  onSubmitPrompt?: (value: string) => void;
  activeConversationId?: string;
  conversations?: Conversation[]
}

// Extended for local UI needs if necessary, but hook uses this structure too
interface ExtendedMessage extends Message {
  sources?: any[];
  imagePreview?: string;
}

const ConsultationScreen: React.FC<ConsultationScreenProps> = ({ onBack, isLoggedIn = false, onSubmitPrompt, activeConversationId, conversations }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);


  // Use the socket chat hook
  const { messages, sendMessage, isLoading, sessionId } = useSocketChat({
    onError: useCallback((err: string) => console.error("Chat Error:", err), [])
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() && !selectedImage) return;
    
    onSubmitPrompt?.(text)
    // Send via socket
    // Note: Image sending is not yet supported by backend socket, passing it but it won't be processed effectively
    sendMessage(text, selectedImage || undefined);
    setInput('');
    setSelectedImage(null);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background-dark">
      {/* Sidebar - Desktop */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 border-r border-border-dark bg-slate-900/50 hidden md:flex flex-col`}>
        <div className="p-6 border-b border-border-dark flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Workspace</h3>
          <button className="text-primary hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">add_circle</span>
          </button>
        </div>
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs font-medium text-primary cursor-pointer">
            Current Consultation
          </div>
          
          <div className="px-3 py-2">
            <p className="text-[10px] text-slate-500 font-mono">Session: {sessionId.slice(0, 8)}...</p>
          </div>

          {!isLoggedIn && (
            <div className="p-5 bg-card-dark border border-dashed border-border-dark rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <span className="material-symbols-outlined text-lg">history</span>
                <span className="text-[10px] font-black uppercase tracking-widest">History Disabled</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Your guest consultation will not be saved. Sign in to sync history across devices.
              </p>
              <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors">
                Sign In Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-grow flex flex-col relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark bg-slate-900/20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:block text-slate-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors font-bold text-xs uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Exit
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {!isLoggedIn && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-[10px] font-black uppercase tracking-widest">
                Guest Session
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Encrypted
            </div>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-grow overflow-y-auto p-6 md:p-10 space-y-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((msg, idx) => {
                const hasContent =
                  typeof msg.content === 'string' && msg.content.trim().length > 0;

                const hasImage = Boolean((msg as ExtendedMessage).imagePreview);

                if (!hasContent && !hasImage) return null;

                return (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    } animate-in fade-in slide-in-from-bottom-2`}
                  >
                    <div
                      className={`max-w-[85%] flex gap-4 ${
                        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user'
                            ? 'bg-slate-700'
                            : 'bg-primary shadow-lg shadow-primary/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm text-white">
                          {msg.role === 'user' ? 'person' : 'account_balance'}
                        </span>
                      </div>

                      <div
                        className={`flex flex-col gap-2 ${
                          msg.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`p-5 rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-primary text-white'
                              : 'bg-slate-800/80 border border-border-dark text-slate-100'
                          } shadow-sm`}
                        >
                          {/* Image */}
                          {(msg as ExtendedMessage).imagePreview && (
                            <div className="mb-4 rounded-xl overflow-hidden border border-white/20">
                              <img
                                src={(msg as ExtendedMessage).imagePreview}
                                alt="Uploaded document"
                                className="max-w-xs h-auto"
                              />
                            </div>
                          )}

                          {/* Text */}
                          {hasContent && (
                            <div className="text-[15px] leading-relaxed prose prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            
            {isLoading && (
               /* Show typing indicator only if the latest message is NOT from assistant (i.e., initial wait) 
                  OR if assistant message is empty. 
                  But since we auto-add an empty assistant message, we might see the empty bubble growing. 
                  Let's just show a small indicator if the last message content is empty */
               (messages.length === 0 || messages[messages.length - 1].role !== 'assistant' || messages[messages.length - 1].content === '') && (
                <div className="flex justify-start">
                  <div className="flex gap-4 items-center p-5 bg-slate-800/40 rounded-2xl border border-border-dark">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">Legal Thinking...</span>
                  </div>
                </div>
               )
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Input Bar */}
        <div className="p-6 md:p-10">
          <div className="max-w-4xl mx-auto">
             {/* Warning about limited functionality */}
             <div className="mb-2 text-center">
                <span className="text-[10px] text-amber-500/70 uppercase tracking-widest">
                    ⚠️ Note: Image analysis is currently limited in this mode.
                </span>
             </div>

            {selectedImage && (
              <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary/20">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-primary">Document attached</span>
                </div>
                <button onClick={() => setSelectedImage(null)} className="text-primary hover:text-white transition-colors">
                  <span className="material-symbols-outlined">cancel</span>
                </button>
              </div>
            )}
            
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} 
              className="relative flex items-center group bg-slate-800/80 backdrop-blur-xl border border-border-dark rounded-[24px] p-2 focus-within:ring-2 focus-within:ring-primary/40 transition-all shadow-2xl"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-primary transition-colors"
                title="Upload legal document"
              >
                <span className="material-symbols-outlined">attachment</span>
              </button>
              
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask LexPH regarding Philippine Law..."
                className="flex-grow bg-transparent py-4 px-4 text-white placeholder-slate-500 focus:outline-none"
                disabled={isLoading && messages.length > 0 && messages[messages.length-1].content === ''} // Only disable if strictly waiting for connect
              />
              
              <button 
                type="submit"
                disabled={(!input.trim() && !selectedImage) || (isLoading && messages[messages.length-1].content === '')}
                className="bg-primary hover:bg-primary/90 text-white w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">gavel</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationScreen;
