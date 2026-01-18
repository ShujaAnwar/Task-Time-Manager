
import React, { useMemo, useState, useEffect } from 'react';
import { Zap, TrendingUp, Target, Award, Sparkles, Loader2 } from 'lucide-react';
import { DayLog, AppState } from '../types';
import { diffMinutes, diffMinutesFromDate } from '../utils/time';
import { GoogleGenAI } from '@google/genai';

interface Props {
  log: DayLog;
  logs: Record<string, DayLog>;
  config: AppState['config'];
  currentTime?: Date;
}

const InsightsPanel: React.FC<Props> = ({ log, logs, config, currentTime }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const officeMinutes = useMemo(() => {
    if (log.timeIn && log.timeOut) return diffMinutes(log.timeIn, log.timeOut);
    else if (log.timeIn && currentTime) return diffMinutesFromDate(log.timeIn, currentTime);
    return 0;
  }, [log, currentTime]);

  const taskMinutes = log.tasks.reduce((sum, t) => {
    const elapsed = t.status === 'pending' && t.timerStartedAt ? Math.floor((Date.now() - t.timerStartedAt) / 60000) : 0;
    return sum + t.actualDuration + elapsed;
  }, 0);

  useEffect(() => {
    const fetchAIInsight = async () => {
      if (!process.env.API_KEY || aiInsight) return;
      setIsLoadingAI(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const summary = log.tasks.map(t => `${t.title} (${t.status})`).join(', ');
        const prompt = `Based on today's work: ${summary}. Total Office Time: ${officeMinutes}m. Active Task Time: ${taskMinutes}m. Provide one ultra-short futuristic productivity tip (max 15 words).`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt
        });
        setAiInsight(response.text);
      } catch (e) {
        console.error("AI Insight failed");
      } finally {
        setIsLoadingAI(false);
      }
    };

    const timer = setTimeout(fetchAIInsight, 2000);
    return () => clearTimeout(timer);
  }, [log.tasks.length, officeMinutes]);

  const productivityScore = useMemo(() => {
    let score = 0;
    if (log.timeIn && log.timeIn <= config.officeStartTime) score += 30;
    if (officeMinutes >= config.targetWorkingHours * 60) score += 30;
    else if (officeMinutes > 0) score += (officeMinutes / (config.targetWorkingHours * 60)) * 30;
    const uti = officeMinutes > 0 ? (taskMinutes / officeMinutes) : 0;
    score += Math.min(40, uti * 40);
    return Math.round(score);
  }, [log, officeMinutes, taskMinutes, config]);

  return (
    <div className="bg-theme-primary border border-theme-primary/20 rounded-3xl p-6 shadow-2xl accent-shadow relative overflow-hidden group transition-all duration-700">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
      
      <h3 className="text-lg font-bold text-white flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 text-white rounded-xl"><Award size={20} /></div>
            Performance Audit
        </div>
        {isLoadingAI && <Loader2 size={16} className="animate-spin text-white/50" />}
      </h3>

      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-6xl font-black text-white tracking-tighter">{productivityScore}</span>
          <span className="text-white/50 ml-1 text-lg font-bold">/100</span>
          <p className="text-[10px] text-white/70 mt-2 uppercase tracking-[0.3em] font-black">Output Index</p>
        </div>
        <div className="h-20 w-20 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-white/10 shadow-xl">
          <TrendingUp className="text-white w-10 h-10" />
        </div>
      </div>

      <div className="space-y-3">
        {aiInsight && (
          <div className="flex gap-4 p-4 bg-indigo-400/20 backdrop-blur-md rounded-2xl border border-white/20 transition-all hover:bg-white/20 group/insight">
            <Sparkles size={18} className="text-amber-300 shrink-0 animate-pulse" />
            <p className="text-[11px] text-white leading-relaxed font-black tracking-tight italic">
              "{aiInsight}"
            </p>
          </div>
        )}
        <div className="flex gap-4 p-4 bg-black/10 backdrop-blur-md rounded-2xl border border-white/5">
          <Target size={18} className="text-white shrink-0" />
          <p className="text-[11px] text-white/90 leading-relaxed font-bold tracking-tight">
            Consistency is the primary driver of organizational velocity. Keep the cycle active.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;
