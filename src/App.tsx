import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Leaf } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are a wise, compassionate, and minimal philosophical guide embodying the spirit and teachings of Sant Tukaram Maharaj. 
Your purpose is to help users find joy, peace, and practical solutions to their life problems based on Tukaram's Abhangas (devotional poetry) and philosophy.
Keep your responses concise, warm, and grounded in everyday reality, just as Tukaram did.
Use simple language. You may occasionally quote a relevant line from an Abhanga (in Marathi with English translation) if it perfectly fits the situation.
Focus on themes of devotion (Bhakti), equality, finding joy in simplicity, detachment from materialism, and inner peace.
Do not be overly preachy; be a comforting friend and guide.`;

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Welcome. I am here to share the wisdom of Sant Tukaram. How can I help you find joy and peace today?",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: "Hello" }] },
          { role: 'model', parts: [{ text: "Welcome. I am here to share the wisdom of Sant Tukaram. How can I help you find joy and peace today?" }] },
          ...messages.filter(m => m.id !== 'welcome').map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: userMessage.text }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I'm sorry, I couldn't find the words right now.",
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Forgive me, I am having trouble connecting right now. Let us pause and try again in a moment.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-warm-bg)] font-sans">
      {/* Header */}
      <header className="flex items-center justify-center p-6 border-b border-[var(--color-olive)]/20 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-olive)] flex items-center justify-center text-white shadow-sm">
            <Leaf size={20} className="opacity-90" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-medium text-[var(--color-olive-dark)] tracking-wide">Tukaram's Wisdom</h1>
            <p className="text-xs text-[var(--color-olive)]/70 uppercase tracking-widest font-medium">Find Joy in Simplicity</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-8 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] sm:max-w-[75%] rounded-3xl px-6 py-5 shadow-sm",
                  message.role === 'user'
                    ? "bg-[var(--color-olive)] text-white rounded-br-sm"
                    : "bg-white text-[var(--color-ink)] rounded-bl-sm border border-[var(--color-olive)]/10"
                )}
              >
                {message.role === 'model' ? (
                  <div className="markdown-body text-[15px] sm:text-base">
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-[15px] sm:text-base leading-relaxed">{message.text}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start w-full">
              <div className="bg-white border border-[var(--color-olive)]/10 rounded-3xl rounded-bl-sm px-6 py-5 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-olive)]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--color-olive)]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--color-olive)]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 sm:p-6 bg-gradient-to-t from-[var(--color-warm-bg)] via-[var(--color-warm-bg)] to-transparent">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Share your thoughts or ask for guidance..."
            className="w-full bg-white border border-[var(--color-olive)]/20 rounded-3xl pl-6 pr-16 py-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-olive)]/30 focus:border-[var(--color-olive)]/50 resize-none shadow-sm text-[15px] sm:text-base transition-all"
            rows={1}
            style={{ minHeight: '60px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[var(--color-olive)] text-white flex items-center justify-center hover:bg-[var(--color-olive-dark)] disabled:opacity-50 disabled:hover:bg-[var(--color-olive)] transition-colors"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
        <div className="text-center mt-3">
          <p className="text-[10px] sm:text-xs text-[var(--color-olive)]/60 uppercase tracking-wider font-medium">
            Wisdom from the Abhangas
          </p>
        </div>
      </footer>
    </div>
  );
}
