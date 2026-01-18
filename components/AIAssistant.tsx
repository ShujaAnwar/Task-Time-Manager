
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2, BrainCircuit, Lightbulb, Zap } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { AppState, DayLog } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC<{ state: AppState }> = ({ state }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "System Initialized. I am the Nexus AI. How can I optimize your workforce output today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const userId = state.currentUser?.id || 'unknown';
      const userLogs = state.userLogs[userId] || {};
      const logSummary = Object.entries(userLogs).map(([date, log]) => {
        const tasks = (log as DayLog).tasks.map(t => `${t.title} (${t.status})`).join(', ');
        return `${date}: ${tasks}`;
      }).join('\n');

      const systemInstruction = `
        You are Nexus AI, a futuristic workforce productivity assistant.
        The current user is ${state.currentUser?.name}.
        User's recent task history:
        ${logSummary}
        
        Provide concise, high-impact, actionable productivity coaching. 
        Focus on flow-state, objective completion, and efficiency. 
        Maintain a futuristic, professional, and highly intelligent persona.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: { systemInstruction }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "Connection to Neural Core lost. Please retry." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: AI Subsystem offline. Verify credentials." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] bg-slate-900/40 border border-slate-800 rounded-[3rem] overflow-hidden backdrop-blur-xl">
      <div className="p-8 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-theme-primary rounded-2xl flex items-center justify-center shadow-2xl accent-shadow animate-pulse">
            <BrainCircuit className="text-white w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Nexus Intelligence</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Neural Coaching Subsystem</p>
          </div>
        </div>
        <div className="flex gap-2">
            {[<Lightbulb size={16}/>, <Zap size={16}/>, <Sparkles size={16}/>].map((icon, i) => (
                <div key={i} className="p-2 bg-slate-900 rounded-lg text-slate-500 border border-slate-800">{icon}</div>
            ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800 border border-slate-700'}`}>
              {msg.role === 'user' ? <User size={18} className="text-white"/> : <Bot size={18} className="text-theme-primary"/>}
            </div>
            <div className={`max-w-[80%] p-6 rounded-3xl text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-950/80 text-slate-200 border border-slate-800/50 rounded-tl-none shadow-xl'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <Bot size={18} className="text-theme-primary"/>
            </div>
            <div className="bg-slate-950/80 p-6 rounded-3xl rounded-tl-none border border-slate-800/50 flex items-center gap-2">
              <Loader2 className="animate-spin text-theme-primary" size={16} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Processing Data...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-slate-950/60 border-t border-slate-800">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Ask Nexus AI about your performance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-6 pr-16 py-4 text-sm text-white outline-none focus:border-theme-primary/50 focus:ring-4 focus:ring-theme-primary/5 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-theme-primary text-white rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg accent-shadow disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.3em] text-center mt-4">AI Subsystem powered by Gemini 3 Flash</p>
      </div>
    </div>
  );
};

export default AIAssistant;
