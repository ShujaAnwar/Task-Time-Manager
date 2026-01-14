
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart3, Activity, Info } from 'lucide-react';
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

  const idleMinutes = Math.max(0, officeMinutes - taskMinutes);

  const data = [
    { name: 'Task Execution', value: taskMinutes, color: '#6366f1' },
    { name: 'Idle / Buffer', value: idleMinutes, color: '#1e293b' },
  ];

  const utilizationRate = officeMinutes > 0 ? Math.round((taskMinutes / officeMinutes) * 100) : 0;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <BarChart3 size={20} />
          </div>
          Efficiency status
        </h3>
        {log.timeIn && !log.timeOut && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Live Monitor</span>
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
          <span className="text-[10px] text-slate-500 uppercase font-bold mt-1">Utilization</span>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Office Time</p>
            <p className="text-sm font-bold text-white tabular-nums">{formatMinutesToDisplay(officeMinutes)}</p>
          </div>
          <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Productive</p>
            <p className="text-sm font-bold text-indigo-400 tabular-nums">{formatMinutesToDisplay(taskMinutes)}</p>
          </div>
        </div>

        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Health Meter</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              utilizationRate >= 80 ? 'text-emerald-400 bg-emerald-400/10' :
              utilizationRate >= 50 ? 'text-amber-400 bg-amber-400/10' :
              'text-red-400 bg-red-400/10'
            }`}>
              {utilizationRate >= 80 ? 'Peak Output' : utilizationRate >= 50 ? 'Steady' : 'Idle Heavy'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${
                utilizationRate >= 80 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 
                utilizationRate >= 50 ? 'bg-amber-500' : 
                'bg-red-500'
              }`} 
              style={{ width: `${Math.min(100, utilizationRate)}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
          <Info size={14} className="text-indigo-400 shrink-0" />
          <p className="text-[9px] text-indigo-300/70 leading-relaxed italic">
            Efficiency is calculated by comparing actual task duration against total clocked-in office hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;
