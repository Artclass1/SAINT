import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Leaf, Download, Loader2, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toPng } from 'html-to-image';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getSystemInstruction = (language: string) => `You are a wise, compassionate, and minimal philosophical guide embodying the spirit and teachings of Sant Tukaram Maharaj. 
Your purpose is to help users find joy, peace, and practical solutions to their life problems based on Tukaram's Abhangas (devotional poetry) and philosophy.
Keep your responses concise, warm, and grounded in everyday reality, just as Tukaram did.
Use simple language. You may occasionally quote a relevant line from an Abhanga (in Marathi with English translation) if it perfectly fits the situation.
Focus on themes of devotion (Bhakti), equality, finding joy in simplicity, detachment from materialism, and inner peace.
Do not be overly preachy; be a comforting friend and guide.
IMPORTANT: Keep your responses VERY short (maximum 2-3 sentences, strictly under 50 words) so they fit perfectly on an Instagram post.
CRITICAL: You MUST respond entirely in the ${language} language.`;

const WELCOME_MESSAGES: Record<string, string> = {
  English: "Welcome. I am here to share the wisdom of Sant Tukaram. How can I help you find joy and peace today?",
  Marathi: "नमस्कार. मी संत तुकारामांचे विचार आणि शहाणपण सामायिक करण्यासाठी येथे आहे. आज तुम्हाला आनंद आणि शांती मिळवण्यासाठी मी कशी मदत करू शकेन?",
  Hindi: "नमस्ते। मैं यहाँ संत तुकाराम के ज्ञान को साझा करने के लिए हूँ। आज खुशी और शांति पाने में मैं आपकी कैसे मदद कर सकता हूँ?",
  Gujarati: "નમસ્તે. હું અહીં સંત તુકારામનું જ્ઞાન વહેંચવા માટે છું. આજે તમને આનંદ અને શાંતિ શોધવામાં હું કેવી રીતે મદદ કરી શકું?",
  Spanish: "Bienvenido. Estoy aquí para compartir la sabiduría de Sant Tukaram. ¿Cómo puedo ayudarte a encontrar alegría y paz hoy?",
};

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function App() {
  const [language, setLanguage] = useState('English');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: WELCOME_MESSAGES['English'],
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<{question: string, answer: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update welcome message if language changes and no other messages exist
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [{
          id: 'welcome',
          role: 'model',
          text: WELCOME_MESSAGES[language] || WELCOME_MESSAGES['English']
        }];
      }
      return prev;
    });
  }, [language]);

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
          { role: 'model', parts: [{ text: WELCOME_MESSAGES[language] || WELCOME_MESSAGES['English'] }] },
          ...messages.filter(m => m.id !== 'welcome').map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: userMessage.text }] }
        ],
        config: {
          systemInstruction: getSystemInstruction(language),
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

  const handleDownload = async (question: string, answer: string) => {
    setIsExporting(true);
    setExportData({ question, answer });
    
    // Wait for React to render the export card and fonts to load
    await document.fonts.ready;
    
    setTimeout(async () => {
      const node = document.getElementById('instagram-export-card');
      if (node) {
        try {
          const dataUrl = await toPng(node, { 
            quality: 1.0, 
            pixelRatio: 2,
            // Ensure fonts are loaded before capturing
            style: { transform: 'scale(1)', transformOrigin: 'top left' }
          });
          const link = document.createElement('a');
          link.download = 'tukaram-wisdom.png';
          link.href = dataUrl;
          link.click();
        } catch (err) {
          console.error('Failed to export image', err);
          alert('Failed to generate image. Please try again.');
        } finally {
          setIsExporting(false);
          setExportData(null);
        }
      }
    }, 500); // Give it a bit more time to ensure fonts and layout are ready
  };

  return (
    <div className="flex flex-col h-screen matte-bg font-sans text-[var(--color-text)]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 sm:p-6 border-b border-[var(--color-border)] bg-[#121212]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text)] shadow-sm">
            <Leaf size={18} className="opacity-90" />
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-light text-[var(--color-text)] tracking-wide">Tukaram's Wisdom</h1>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-medium">Find Joy in Simplicity</p>
          </div>
        </div>
        
        {/* Language Selector */}
        <div className="flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-4 py-2 shadow-sm hover:bg-[var(--color-surface-hover)] transition-colors">
          <Globe size={14} className="text-[var(--color-text-muted)]" />
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-medium text-[var(--color-text)] focus:outline-none cursor-pointer appearance-none pr-2"
          >
            {Object.keys(WELCOME_MESSAGES).map(lang => (
              <option key={lang} value={lang} className="bg-[var(--color-surface)] text-[var(--color-text)]">{lang}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-8 pb-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "flex flex-col",
                message.role === 'user' ? "items-end" : "items-start",
                "max-w-[85%] sm:max-w-[75%]"
              )}>
                <div
                  className={cn(
                    "rounded-3xl px-6 py-5 w-full font-light",
                    message.role === 'user'
                      ? "bg-[var(--color-surface)] text-[var(--color-text)] rounded-br-sm border border-[var(--color-border)] shadow-[inset_0_1px_0_rgba(255,248,231,0.03),0_4px_20px_rgba(0,0,0,0.2)]"
                      : "bg-transparent text-[var(--color-text)] rounded-bl-sm border border-[var(--color-border)] shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                  )}
                >
                  {message.role === 'model' ? (
                    <div className="markdown-body text-[15px] sm:text-base leading-relaxed">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-[15px] sm:text-base leading-relaxed">{message.text}</p>
                  )}
                </div>
                
                {/* Download Button for AI Messages */}
                {message.role === 'model' && message.id !== 'welcome' && (
                  <button
                    onClick={() => {
                      const prevMessage = messages[index - 1];
                      const question = prevMessage?.role === 'user' ? prevMessage.text : "How can I find joy?";
                      handleDownload(question, message.text);
                    }}
                    disabled={isExporting}
                    className="mt-3 ml-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                    title="Download as Instagram Post"
                  >
                    {isExporting && exportData?.answer === message.text ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span className="uppercase tracking-widest font-medium text-[10px]">Save as Image</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start w-full">
              <div className="bg-transparent border border-[var(--color-border)] rounded-3xl rounded-bl-sm px-6 py-5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 sm:p-6 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)] to-transparent">
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
            placeholder={language === 'Marathi' ? "तुमचे विचार सामायिक करा..." : language === 'Hindi' ? "अपने विचार साझा करें..." : "Share your thoughts or ask for guidance..."}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-3xl pl-6 pr-16 py-4 focus:outline-none focus:ring-1 focus:ring-[var(--color-text-muted)] focus:border-[var(--color-text-muted)] resize-none shadow-[inset_0_1px_0_rgba(255,248,231,0.03),0_4px_20px_rgba(0,0,0,0.2)] text-[15px] sm:text-base transition-all font-light placeholder:text-[var(--color-text-muted)]"
            rows={1}
            style={{ minHeight: '60px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] flex items-center justify-center hover:bg-[#FFF8E7]/80 disabled:opacity-50 disabled:hover:bg-[var(--color-text)] transition-colors"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
        <div className="text-center mt-4">
          <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] uppercase tracking-[0.2em] font-medium">
            Wisdom from the Abhangas
          </p>
        </div>
      </footer>

      {/* Hidden Instagram Export Card */}
      {exportData && (
        <div className="fixed top-[-9999px] left-[-9999px]">
          <div 
            id="instagram-export-card" 
            className="w-[1080px] h-[1350px] matte-bg flex flex-col relative overflow-hidden"
          >
            {/* Minimal Premium Border */}
            <div className="absolute inset-8 border-[1px] border-[var(--color-border)] rounded-3xl pointer-events-none" />
            
            {/* Content Container */}
            <div className="flex-1 flex flex-col px-24 pt-28 pb-12 relative z-10">
              
              {/* Question Section */}
              <div className="mb-12">
                <p className="text-lg text-[var(--color-text-muted)] uppercase tracking-[0.3em] font-medium mb-5">The Seeker</p>
                <p className="text-4xl font-sans text-[var(--color-text)] leading-snug font-light">
                  "{exportData.question}"
                </p>
              </div>
              
              {/* Divider */}
              <div className="w-16 h-[1px] bg-[var(--color-border)] my-8" />
              
              {/* Answer Section */}
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-lg text-[var(--color-text-muted)] uppercase tracking-[0.3em] font-medium mb-6">The Wisdom</p>
                <div className="text-[2.75rem] font-serif text-[var(--color-text)] leading-tight markdown-export font-light">
                  <ReactMarkdown>{exportData.answer}</ReactMarkdown>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="h-32 flex flex-col items-center justify-center gap-3 relative z-10 border-t border-[var(--color-border)] mx-16 mb-8">
              <p className="font-serif text-3xl font-light text-[var(--color-text)] tracking-widest">Tukaram's Wisdom</p>
              <p className="text-sm text-[var(--color-text-muted)] uppercase tracking-[0.4em] font-medium">Find Joy in Simplicity</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
