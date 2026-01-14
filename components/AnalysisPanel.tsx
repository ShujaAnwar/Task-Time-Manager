
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart3, Activity, Info, Zap } from 'lucide-react';
import { DayLog, AppState } from '../types';
import { diffMinutes, diffMinutesFromDate, formatMinutesToDisplay } from '../utils/time';

interface Props {
  log: DayLog;
  config: AppState['config'];
  currentTime: Date;
}

const AnalysisPanel: React.FC<Props> = ({ log, config, currentTime }) => {
  // Calculate office minutes: if clocked out, use fixed duration. If clocked in, use live duration.
  let officeMinutes = 0;
  if (log.timeIn && log.timeOut) {
    officeMinutes = diffMinutes(log.timeIn, log.timeOut);
  } else if (log.timeIn) {
    officeMinutes = diffMinutesFromDate(log.timeIn, currentTime);
  }
  
  // Calculate total task minutes (Actuals + Live running timers)
  const taskMinutes = log.tasks.reduce((sum, t) => {
    const elapsed = t.status === 'pending' && t.timerStartedAt 
      ? Math.floor((Date.now() - t.timerStartedAt) / 60000) 
      : 0;
    return sum + t.actualDuration + elapsed;
  }, 0);

  // If user is working on tasks but forgot to Clock In, 
  // we treat their task time as the "effective" office time to avoid 0% efficiency.
  const effectiveOfficeMinutes = Math.max(officeMinutes, taskMinutes);
  const idleMinutes = Math.max(0, effectiveOfficeMinutes - taskMinutes);

  const data = [
    { name: 'Task Execution', value: taskMinutes, color: '#6366f1' },
    { name: 'Idle / Buffer', value: idleMinutes, color: '#1e293b' },
  ];

  // Efficiency is Task Time / Attendance Time. 
  // If not clocked in, it's 0 until they clock in, unless they are already working.
  const utilizationRate = effectiveOfficeMinutes > 0 
    ? Math.round((taskMinutes / effectiveOfficeMinutes) * 100) 
    : 0;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
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
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
              itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-3xl font-bold text-white leading-none">{utilizationRate}%</span>
          <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">Productivity</span>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Office Time</p>
            <p className="text-sm font-bold text-white tabular-nums">{formatMinutesToDisplay(officeMinutes)}</p>
          </div>
          <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Worked Time</p>
            <p className="text-sm font-bold text-indigo-400 tabular-nums">{formatMinutesToDisplay(taskMinutes)}</p>
          </div>
        </div>

        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1.5">
              <Activity size={12} className="text-indigo-400" /> Output Meter
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              utilizationRate >= 85 ? 'text-emerald-400 bg-emerald-400/10' :
              utilizationRate >= 60 ? 'text-amber-400 bg-amber-400/10' :
              'text-red-400 bg-red-400/10'
            }`}>
              {utilizationRate >= 85 ? 'High Performance' : utilizationRate >= 60 ? 'Active' : 'Idle State'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${
                utilizationRate >= 85 ? 'bg-emerald-500' : 
                utilizationRate >= 60 ? 'bg-amber-500' : 
                'bg-red-500'
              }`} 
              style={{ width: `${Math.min(100, utilizationRate)}%` }}
            ></div>
          </div>
        </div>

        {!log.timeIn && taskMinutes > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
            <Info size={14} className="text-amber-400 shrink-0" />
            <p className="text-[9px] text-amber-300/70 leading-relaxed italic">
              Clock In to properly track efficiency against office hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
