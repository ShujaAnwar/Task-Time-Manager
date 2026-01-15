
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// Added Clock to the imported icons from lucide-react
import { Activity, Info, Zap, BarChart4, TrendingUp, Clock } from 'lucide-react';
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

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#6366f1';

  const data = [
    { name: 'Active Processing', value: taskMinutes, color: primaryColor },
    { name: 'System Buffer', value: idleMinutes, color: 'rgba(71, 85, 105, 0.15)' },
  ];

  const utilizationRate = effectiveOfficeMinutes > 0 
    ? Math.round((taskMinutes / effectiveOfficeMinutes) * 100) 
    : 0;

  return (
    <div className="glass-panel border rounded-[3rem] p-8 backdrop-blur-md shadow-2xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-theme-primary/20 text-theme-primary rounded-2xl shadow-xl">
            <BarChart4 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Efficiency Hub</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-80">Output Analysis</p>
          </div>
        </div>
        {log.timeIn && !log.timeOut && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 animate-in fade-in zoom-in duration-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]"></span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Node</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="h-60 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={70}
                outerRadius={95}
                paddingAngle={10}
                dataKey="value"
                stroke="none"
                animationDuration={800}
                animationBegin={200}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '16px' }}
                itemStyle={{ color: 'white', fontSize: '11px', fontWeight: 'black', textTransform: 'uppercase' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-4xl font-black text-white tracking-tighter text-glow">{utilizationRate}%</span>
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">Utilization</span>
          </div>
        </div>

        <div className="space-y-6">
           <div className="glass-card p-6 rounded-[2rem] border-slate-800/30 flex items-center justify-between group hover:border-theme-primary/30 transition-all">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Cycle Log</p>
                <p className="text-2xl font-black text-white font-mono">{formatMinutesToDisplay(officeMinutes)}</p>
              </div>
              <div className="p-3 bg-slate-950/50 rounded-2xl text-slate-600 group-hover:text-theme-primary transition-colors">
                <Clock size={20} />
              </div>
           </div>

           <div className="glass-card p-6 rounded-[2rem] border-slate-800/30 flex items-center justify-between group hover:border-theme-primary/30 transition-all">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">Net Execution</p>
                <p className="text-2xl font-black text-theme-primary font-mono">{formatMinutesToDisplay(taskMinutes)}</p>
              </div>
              <div className="p-3 bg-slate-950/50 rounded-2xl text-slate-600 group-hover:text-theme-primary transition-colors">
                <Zap size={20} />
              </div>
           </div>
        </div>
      </div>

      <div className="mt-10 p-8 glass-card rounded-[2.5rem] border-slate-800/30 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <TrendingUp size={80} strokeWidth={3} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-[11px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-2">
            <Activity size={14} className="text-theme-primary" /> Velocity Grade
          </span>
          <span className={`text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-xl ${
            utilizationRate >= 85 ? 'text-emerald-400 bg-emerald-400/10' :
            utilizationRate >= 60 ? 'text-theme-primary bg-theme-primary/10' :
            'text-red-400 bg-red-500/10'
          }`}>
            {utilizationRate >= 85 ? 'Optimum Flux' : utilizationRate >= 60 ? 'Stable Load' : 'Base Rate'}
          </span>
        </div>
        <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div 
            className={`h-full transition-all duration-1500 ease-out bg-theme-primary rounded-full shadow-[0_0_15px_var(--primary-glow)]`} 
            style={{ width: `${Math.min(100, utilizationRate)}%` }}
          ></div>
        </div>
        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-4">Calculated from net node output vs cycle duration.</p>
      </div>
    </div>
  );
};

export default AnalysisPanel;
