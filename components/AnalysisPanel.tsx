
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, Info, Zap } from 'lucide-react';
import { DayLog, AppState } from '../types';
import { diffMinutes, diffMinutesFromDate, formatMinutesToDisplay } from '../utils/time';

interface Props {
  log: DayLog;
  config: AppState['config'];
  currentTime: Date;
}

const AnalysisPanel: React.FC<Props> = ({ log, config, currentTime }) => {
  let officeMinutes = 0;
  if (log.timeIn && log.timeOut) {
    officeMinutes = diffMinutes(log.timeIn, log.timeOut);
  } else if (log.timeIn) {
    officeMinutes = diffMinutesFromDate(log.timeIn, currentTime);
  }
  
  const taskMinutes = log.tasks.reduce((sum, t) => {
    const elapsed = t.status === 'pending' && t.timerStartedAt 
      ? Math.floor((Date.now() - t.timerStartedAt) / 60000) 
      : 0;
    return sum + t.actualDuration + elapsed;
  }, 0);

  const effectiveOfficeMinutes = Math.max(officeMinutes, taskMinutes);
  const idleMinutes = Math.max(0, effectiveOfficeMinutes - taskMinutes);

  // Get dynamic primary color from CSS variable
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#6366f1';

  const data = [
    { name: 'Task Execution', value: taskMinutes, color: primaryColor },
    { name: 'Idle / Buffer', value: idleMinutes, color: 'rgba(71, 85, 105, 0.2)' },
  ];

  const utilizationRate = effectiveOfficeMinutes > 0 
    ? Math.round((taskMinutes / effectiveOfficeMinutes) * 100) 
    : 0;

  return (
    <div className="app-card border rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
            <Zap size={20} />
          </div>
          Efficiency Analysis
        </h3>
        {log.timeIn && !log.timeOut && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Live Monitor</span>
          </div>
        )}
      </div>

      <div className="h-44 relative mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={50}
              outerRadius={70}
              paddingAngle={8}
              dataKey="value"
              stroke="none"
              animationDuration={500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '12px' }}
              itemStyle={{ color: 'white', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-3xl font-black text-current leading-none">{utilizationRate}%</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-2">Utilization</span>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/10 p-4 rounded-2xl border border-slate-800/20">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Office Time</p>
            <p className="text-sm font-black text-current tabular-nums">{formatMinutesToDisplay(officeMinutes)}</p>
          </div>
          <div className="bg-black/10 p-4 rounded-2xl border border-slate-800/20">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Worked Time</p>
            <p className="text-sm font-black text-theme-primary tabular-nums">{formatMinutesToDisplay(taskMinutes)}</p>
          </div>
        </div>

        <div className="bg-black/10 p-5 rounded-3xl border border-slate-800/20 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5">
              <Activity size={12} className="text-theme-primary" /> Performance Log
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
              utilizationRate >= 85 ? 'text-emerald-400 bg-emerald-400/10' :
              utilizationRate >= 60 ? 'text-theme-primary bg-theme-primary/10' :
              'text-red-400 bg-red-500/10'
            }`}>
              {utilizationRate >= 85 ? 'Peak Performance' : utilizationRate >= 60 ? 'Optimal' : 'Standard'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800/30 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out bg-theme-primary`} 
              style={{ width: `${Math.min(100, utilizationRate)}%` }}
            ></div>
          </div>
        </div>

        {!log.timeIn && taskMinutes > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
            <Info size={14} className="text-amber-400 shrink-0" />
            <p className="text-[9px] text-amber-500/70 leading-relaxed font-bold italic">
              Formal clock-in required for audit validity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
