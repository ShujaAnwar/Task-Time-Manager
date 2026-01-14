
import React, { useMemo } from 'react';
import { Zap, TrendingUp, Target, Award } from 'lucide-react';
import { DayLog, AppState } from '../types';
import { diffMinutes, diffMinutesFromDate } from '../utils/time';

interface Props {
  log: DayLog;
  logs: Record<string, DayLog>;
  config: AppState['config'];
  currentTime?: Date;
}

const InsightsPanel: React.FC<Props> = ({ log, logs, config, currentTime }) => {
  const officeMinutes = useMemo(() => {
    if (log.timeIn && log.timeOut) {
      return diffMinutes(log.timeIn, log.timeOut);
    } else if (log.timeIn && currentTime) {
      return diffMinutesFromDate(log.timeIn, currentTime);
    }
    return 0;
  }, [log, currentTime]);

  const taskMinutes = log.tasks.reduce((sum, t) => {
    const elapsed = t.status === 'pending' && t.timerStartedAt 
      ? Math.floor((Date.now() - t.timerStartedAt) / 60000) 
      : 0;
    return sum + t.actualDuration + elapsed;
  }, 0);
  
  const insights = useMemo(() => {
    const list = [];
    const utilization = officeMinutes > 0 ? (taskMinutes / officeMinutes) : 0;

    if (utilization > 0.9) {
      list.push({ 
        icon: Zap, 
        color: 'text-amber-400', 
        bg: 'bg-white/10',
        text: "You're operating at peak efficiency today! Operational excellence detected." 
      });
    } else if (utilization < 0.5 && officeMinutes > 60) {
      list.push({ 
        icon: Target, 
        color: 'text-white', 
        bg: 'bg-white/10',
        text: "Efficiency currently low. Log active tasks to optimize your audit profile." 
      });
    } else {
      list.push({ 
        icon: Award, 
        color: 'text-emerald-400', 
        bg: 'bg-white/10',
        text: "Sustainable output detected. Maintaining a high standard of consistency." 
      });
    }

    const allLogs = Object.values(logs) as DayLog[];
    if (allLogs.length > 3) {
      const lateCount = allLogs.filter(l => l.timeIn && l.timeIn > config.officeStartTime).length;
      if (lateCount / allLogs.length > 0.3) {
        list.push({
          icon: TrendingUp,
          color: 'text-rose-300',
          bg: 'bg-white/10',
          text: "Punctuality audit: Frequent late entries detected. Improvement recommended."
        });
      } else {
        list.push({
          icon: TrendingUp,
          color: 'text-emerald-300',
          bg: 'bg-white/10',
          text: "Discipline Streaks: Your punctuality is exemplary and highly valued."
        });
      }
    }
    return list;
  }, [log, logs, config, officeMinutes, taskMinutes]);

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
      
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
        <div className="p-2 bg-white/20 text-white rounded-xl">
          <Award size={20} />
        </div>
        Performance Audit
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
        {insights.map((insight, idx) => (
          <div key={idx} className="flex gap-4 p-4 bg-black/10 backdrop-blur-md rounded-2xl border border-white/5 transition-all hover:bg-black/20">
            <insight.icon size={18} className={`${insight.color} shrink-0`} />
            <p className="text-[11px] text-white/90 leading-relaxed font-bold tracking-tight">
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsPanel;
