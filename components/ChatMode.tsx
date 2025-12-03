import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Loader2, BookOpen } from 'lucide-react';
import { ChatMessage } from '../types';
import { createChatSession, sendMessageToChat } from '../services/geminiService';
import { Chat } from "@google/genai";
import MarkdownRenderer from './MarkdownRenderer';

interface ChatModeProps {
  reportContext?: string;
}

const ChatMode: React.FC<ChatModeProps> = ({ reportContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Selamat datang. Saya adalah **Profesor Akuntansi** dan Penguji Disertasi Anda. Silakan unggah proposal Anda di panel sebelah kiri untuk diperiksa, atau ajukan pertanyaan akademik secara langsung.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [contextLoaded, setContextLoaded] = useState(false);

  useEffect(() => {
    // Initialize chat session on mount
    chatSessionRef.current = createChatSession();
  }, []);

  // Effect to inject report context when available
  useEffect(() => {
    if (reportContext && chatSessionRef.current && !contextLoaded) {
      const injectContext = async () => {
        try {
          // Send context as a hidden message flow or explicit instruction
          // Here we act as if the user provided the context to the professor
          await chatSessionRef.current?.sendMessage({ 
            message: `Berikut adalah KONTEKS LAPORAN HASIL ANALISIS dari sistem multi-agen. Gunakan informasi ini untuk menjawab pertanyaan saya selanjutnya tentang perbaikan proposal saya: \n\n ${reportContext}` 
          });
          
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            content: "*Laporan pemeriksaan telah dimuat ke dalam memori. Anda sekarang dapat berdiskusi secara mendalam mengenai poin-poin kritik yang dihasilkan.*",
            timestamp: Date.now()
          }]);
          setContextLoaded(true);
        } catch (e) {
          console.error("Failed to inject context", e);
        }
      };
      injectContext();
    }
  }, [reportContext, contextLoaded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chatSessionRef.current) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToChat(chatSessionRef.current, userMessage.content);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header for Chat Panel */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <BookOpen size={20} className="text-blue-600"/>
          Chatbot Akademik
        </h2>
        {contextLoaded && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            Konteks Laporan Aktif
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
              msg.role === 'user' 
                ? 'bg-slate-100 text-slate-800 rounded-tr-none' 
                : 'bg-blue-50 text-slate-800 border border-blue-100 rounded-tl-none'
            }`}>
              <MarkdownRenderer content={msg.content} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl rounded-tl-none border border-blue-100 flex items-center gap-2 text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm">Profesor sedang meninjau referensi...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Tanyakan tentang metodologi, teori, atau perbaikan proposal..."
            className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-center text-slate-400 mt-2">
          Konten AI dapat tidak akurat. Selalu verifikasi informasi akademik penting.
        </p>
      </div>
    </div>
  );
};

export default ChatMode;