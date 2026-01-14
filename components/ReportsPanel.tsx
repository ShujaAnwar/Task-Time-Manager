
import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  ChevronRight, 
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  Database,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { DayLog, AppState, Task } from '../types';
import { getTodayStr, diffMinutes, formatMinutesToDisplay, isLate } from '../utils/time';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  logs: Record<string, DayLog>;
  config: AppState['config'];
  isFullWidth?: boolean;
}

const ReportsPanel: React.FC<Props> = ({ logs, config, isFullWidth }) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const todayStr = getTodayStr();
  const todayLog = logs[todayStr] || { date: todayStr, tasks: [] };

  const allLogs = (Object.values(logs) as DayLog[]).sort((a, b) => b.date.localeCompare(a.date));
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyLogs = allLogs.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalActualMinutes = monthlyLogs.reduce((sum, l) => {
    return sum + l.tasks.reduce((tsum, t) => tsum + t.actualDuration, 0);
  }, 0);

  const totalOfficeMinutes = monthlyLogs.reduce((sum, l) => {
    if (l.timeIn && l.timeOut) return sum + diffMinutes(l.timeIn, l.timeOut);
    return sum;
  }, 0);

  const avgEfficiency = totalOfficeMinutes > 0 ? (totalActualMinutes / totalOfficeMinutes) * 100 : 0;
  const lateCount = monthlyLogs.filter(l => l.timeIn && l.timeIn > config.officeStartTime).length;

  const chartData = monthlyLogs.slice().reverse().map(l => ({
    name: l.date.split('-')[2],
    actual: Math.round((l.tasks.reduce((s, t) => s + t.actualDuration, 0) / 60) * 10) / 10,
    office: l.timeIn && l.timeOut ? Math.round((diffMinutes(l.timeIn, l.timeOut) / 60) * 10) / 10 : 0
  }));

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    let csv = "Date,Clock In,Clock Out,Total Tasks,Actual Duration(min),Est Duration(min),Efficiency(%)\n";
    monthlyLogs.forEach(l => {
      const actual = l.tasks.reduce((s, t) => s + t.actualDuration, 0);
      const estimated = l.tasks.reduce((s, t) => s + t.duration, 0);
      const office = l.timeIn && l.timeOut ? diffMinutes(l.timeIn, l.timeOut) : 0;
      const eff = office > 0 ? ((actual / office) * 100).toFixed(1) : "0";
      csv += `${l.date},${l.timeIn || ''},${l.timeOut || ''},${l.tasks.length},${actual},${estimated},${eff}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Performance_Report_${currentYear}_${currentMonth + 1}.csv`;
    a.click();
  };

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col ${isFullWidth ? 'min-h-[600px]' : ''}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <FileText size={20} />
          </div>
          Reports & Analytics
        </h3>
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button 
            onClick={() => setReportType('daily')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${reportType === 'daily' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Daily Log
          </button>
          <button 
            onClick={() => setReportType('monthly')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${reportType === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Monthly Performance
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {reportType === 'daily' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Time In</p>
                  <p className="text-lg font-bold text-white tabular-nums">{todayLog.timeIn || '--:--'}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Actual Work</p>
                  <p className="text-lg font-bold text-indigo-400 tabular-nums">
                    {formatMinutesToDisplay(todayLog.tasks.reduce((s, t) => s + t.actualDuration, 0))}
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Office Hours</p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">
                    {todayLog.timeIn && todayLog.timeOut ? formatMinutesToDisplay(diffMinutes(todayLog.timeIn, todayLog.timeOut)) : '0h 0m'}
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Status</p>
                  <p className="text-sm font-bold text-white mt-1">
                    {todayLog.timeIn ? (isLate(todayLog.timeIn, config.officeStartTime) ? 'LATE' : 'ON TIME') : 'ABSENT'}
                  </p>
                </div>
             </div>

             <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Detailed Task Performance</h4>
                <div className="space-y-3">
                  {todayLog.tasks.map(t => {
                    const accuracy = t.actualDuration > 0 ? Math.round((t.duration / t.actualDuration) * 100) : 0;
                    return (
                      <div key={t.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{t.title}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-xs italic">{t.description || 'No context'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Incurred</p>
                            <p className="text-xs font-mono font-bold text-indigo-400">{formatMinutesToDisplay(t.actualDuration)}</p>
                          </div>
                          <div className="text-right border-l border-slate-800 pl-4">
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Planned</p>
                            <p className="text-xs font-mono font-bold text-slate-400">{formatMinutesToDisplay(t.duration)}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-[9px] font-bold ${
                            accuracy >= 90 ? 'bg-emerald-500/10 text-emerald-400' : 
                            accuracy >= 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {accuracy}% Match
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {todayLog.tasks.length === 0 && <p className="text-xs text-slate-600 text-center py-8 italic">No task activity logged for this report period.</p>}
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-emerald-400" />
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Total Actual</p>
                  </div>
                  <p className="text-xl font-bold text-white">{(totalActualMinutes / 60).toFixed(1)}h</p>
               </div>
               <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-indigo-400" />
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Efficiency</p>
                  </div>
                  <p className="text-xl font-bold text-white">{avgEfficiency.toFixed(0)}%</p>
               </div>
               <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-amber-400" />
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Punctuality</p>
                  </div>
                  <p className="text-xl font-bold text-white">{monthlyLogs.length > 0 ? (100 - (lateCount / monthlyLogs.length * 100)).toFixed(0) : 0}%</p>
               </div>
               <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight size={14} className="text-red-400" />
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Active Days</p>
                  </div>
                  <p className="text-xl font-bold text-white">{monthlyLogs.length}</p>
               </div>
            </div>

            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 h-64">
               <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Incurred Work vs Office Duration</h4>
                 <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><span className="text-[9px] text-slate-400">Actual Work</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700"></div><span className="text-[9px] text-slate-400">Office Time</span></div>
                 </div>
               </div>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={3} fill="url(#colorActual)" />
                    <Area type="monotone" dataKey="office" stroke="#334155" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
        <button 
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-lg active:scale-95"
        >
          <Printer size={16} /> Print Full Review
        </button>
        <button 
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-2xl text-xs font-bold transition-all border border-indigo-500/20 shadow-lg active:scale-95"
        >
          <Download size={16} /> Download CSV Audit
        </button>
      </div>
    </div>
  );
};

export default ReportsPanel;
