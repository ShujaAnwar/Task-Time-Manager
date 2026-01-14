
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

    // Daily Insight
    if (utilization > 0.9) {
      list.push({ 
        icon: Zap, 
        color: 'text-amber-400', 
        bg: 'bg-amber-400/10',
        text: "You're operating at peak efficiency today! Make sure to take short breaks to avoid burnout." 
      });
    } else if (utilization < 0.5 && officeMinutes > 60) {
      list.push({ 
        icon: Target, 
        color: 'text-indigo-400', 
        bg: 'bg-indigo-400/10',
        text: "Low execution time relative to office duration. Try documenting active tasks." 
      });
    } else {
      list.push({ 
        icon: Award, 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-400/10',
        text: "Balanced output detected. Keep up the consistent pace!" 
      });
    }

    // Historical Logic
    const allLogs = Object.values(logs) as DayLog[];
    if (allLogs.length > 3) {
      const lateCount = allLogs.filter(l => l.timeIn && l.timeIn > config.officeStartTime).length;
      if (lateCount / allLogs.length > 0.3) {
        list.push({
          icon: TrendingUp,
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          text: "Frequent late entries detected recently. Try to stabilize your clock-in time."
        });
      } else {
        list.push({
          icon: TrendingUp,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10',
          text: "Great punctuality streak! Management values your attendance discipline."
        });
      }
    }

    return list;
  }, [log, logs, config, officeMinutes, taskMinutes]);

  const productivityScore = useMemo(() => {
    let score = 0;
    // 30 points for punctuality
    if (log.timeIn && log.timeIn <= config.officeStartTime) score += 30;
    // 30 points for hitting target hours
    if (officeMinutes >= config.targetWorkingHours * 60) score += 30;
    else if (officeMinutes > 0) score += (officeMinutes / (config.targetWorkingHours * 60)) * 30;
    
    // 40 points for efficiency (utilization)
    const uti = officeMinutes > 0 ? (taskMinutes / officeMinutes) : 0;
    score += Math.min(40, uti * 40);
    
    return Math.round(score);
  }, [log, officeMinutes, taskMinutes, config]);

  return (
    <div className="bg-indigo-600 border border-indigo-500 rounded-3xl p-6 shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
      
      <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
        <div className="p-2 bg-white/20 text-white rounded-xl">
          <Award size={20} />
        </div>
        Performance Score
      </h3>

      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-5xl font-bold text-white tracking-tight">{productivityScore}</span>
          <span className="text-indigo-200 ml-1">/100</span>
          <p className="text-xs text-indigo-100/70 mt-1 uppercase tracking-widest font-bold">Productivity Index</p>
        </div>
        <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center">
          <TrendingUp className="text-white w-8 h-8" />
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex gap-3 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 transition-transform hover:scale-[1.02]">
            <insight.icon size={18} className={`${insight.color} shrink-0`} />
            <p className="text-xs text-indigo-50 text-opacity-90 leading-relaxed font-medium">
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsPanel;
