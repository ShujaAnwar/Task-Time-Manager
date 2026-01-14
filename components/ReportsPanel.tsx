
import React, { useState, useMemo } from 'react';
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
  ArrowUpRight,
  BarChart2,
  PieChart as PieIcon,
  Layout
} from 'lucide-react';
import { DayLog, AppState, Task } from '../types';
import { getTodayStr, diffMinutes, formatMinutesToDisplay, isLate } from '../utils/time';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Props {
  logs: Record<string, DayLog>;
  config: AppState['config'];
  isFullWidth?: boolean;
}

const ReportsPanel: React.FC<Props> = ({ logs, config, isFullWidth }) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const todayStr = getTodayStr();
  const todayLog = logs[todayStr] || { date: todayStr, tasks: [] };

  const allLogs = useMemo(() => (Object.values(logs) as DayLog[]).sort((a, b) => b.date.localeCompare(a.date)), [logs]);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyLogs = useMemo(() => allLogs.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [allLogs, currentMonth, currentYear]);

  const stats = useMemo(() => {
    const totalActual = monthlyLogs.reduce((sum, l) => {
      return sum + l.tasks.reduce((tsum, t) => tsum + t.actualDuration, 0);
    }, 0);

    const totalOffice = monthlyLogs.reduce((sum, l) => {
      if (l.timeIn && l.timeOut) return sum + diffMinutes(l.timeIn, l.timeOut);
      return sum;
    }, 0);

    const lateCount = monthlyLogs.filter(l => l.timeIn && isLate(l.timeIn, config.officeStartTime)).length;
    const avgEfficiency = totalOffice > 0 ? (totalActual / totalOffice) * 100 : 0;
    const totalTasks = monthlyLogs.reduce((sum, l) => sum + l.tasks.length, 0);

    return { totalActual, totalOffice, lateCount, avgEfficiency, totalTasks };
  }, [monthlyLogs, config.officeStartTime]);

  const chartData = useMemo(() => {
    // Show last 7 days of the month or just all days in current month
    return monthlyLogs.slice().reverse().map(l => {
      const dayActual = l.tasks.reduce((s, t) => s + t.actualDuration, 0);
      const dayOffice = l.timeIn && l.timeOut ? diffMinutes(l.timeIn, l.timeOut) : 0;
      return {
        name: l.date.split('-')[2],
        actual: Math.round((dayActual / 60) * 10) / 10,
        office: Math.round((dayOffice / 60) * 10) / 10,
        efficiency: dayOffice > 0 ? Math.round((dayActual / dayOffice) * 100) : 0
      };
    });
  }, [monthlyLogs]);

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
    a.download = `TaskTimeManager_Report_${currentYear}_${currentMonth + 1}.csv`;
    a.click();
  };

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col ${isFullWidth ? 'min-h-[700px]' : ''}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <BarChart2 size={20} />
          </div>
          Performance Reports
        </h3>
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button 
            onClick={() => setReportType('daily')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${reportType === 'daily' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Daily View
          </button>
          <button 
            onClick={() => setReportType('monthly')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${reportType === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Monthly Trends
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {reportType === 'daily' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 group hover:border-indigo-500/30 transition-colors">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Entry Time</p>
                  <p className="text-lg font-bold text-white tabular-nums">{todayLog.timeIn || '--:--'}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 group hover:border-indigo-500/30 transition-colors">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Work Incurred</p>
                  <p className="text-lg font-bold text-indigo-400 tabular-nums">
                    {formatMinutesToDisplay(todayLog.tasks.reduce((s, t) => s + t.actualDuration, 0))}
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 group hover:border-indigo-500/30 transition-colors">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Attendance</p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">
                    {todayLog.timeIn && todayLog.timeOut ? formatMinutesToDisplay(diffMinutes(todayLog.timeIn, todayLog.timeOut)) : '0h 0m'}
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 group hover:border-indigo-500/30 transition-colors">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Shift Status</p>
                  <p className={`text-sm font-bold mt-1 ${todayLog.timeIn && isLate(todayLog.timeIn, config.officeStartTime) ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {todayLog.timeIn ? (isLate(todayLog.timeIn, config.officeStartTime) ? 'LATE ENTRY' : 'ON TIME') : 'PENDING'}
                  </p>
                </div>
             </div>

             <div className="bg-slate-950/30 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Task Performance Breakdown</h4>
                  <div className="flex items-center gap-2">
                    <Layout size={12} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600 font-bold uppercase">{todayLog.tasks.length} Assigned</span>
                  </div>
                </div>
                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                  {todayLog.tasks.length === 0 ? (
                    <div className="py-12 text-center text-slate-600 italic text-sm">No activity recorded for today.</div>
                  ) : (
                    todayLog.tasks.map(t => {
                      const accuracy = t.actualDuration > 0 ? Math.round((t.duration / t.actualDuration) * 100) : 0;
                      return (
                        <div key={t.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-900/40 rounded-xl border border-slate-800/50 gap-4 group hover:bg-slate-900 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {t.status === 'completed' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Clock size={14} className="text-amber-500" />}
                              <p className="text-sm font-semibold text-white">{t.title}</p>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate max-w-xs italic pl-5">{t.description || 'No context provided'}</p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Incurred</p>
                              <p className="text-xs font-mono font-bold text-indigo-400">{formatMinutesToDisplay(t.actualDuration)}</p>
                            </div>
                            <div className="text-right border-l border-slate-800 pl-4">
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Estimated</p>
                              <p className="text-xs font-mono font-bold text-slate-400">{formatMinutesToDisplay(t.duration)}</p>
                            </div>
                            <div className={`hidden sm:flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[70px] ${
                              accuracy >= 90 ? 'bg-emerald-500/10 border border-emerald-500/20' : 
                              accuracy >= 60 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20'
                            }`}>
                              <span className={`text-[9px] font-bold ${accuracy >= 90 ? 'text-emerald-400' : accuracy >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                {accuracy}% Accuracy
                              </span>
                            </div>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-emerald-400" />
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Month Incurred</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{(stats.totalActual / 60).toFixed(1)}h</p>
               </div>
               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-indigo-400" />
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Avg Efficiency</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.avgEfficiency.toFixed(0)}%</p>
               </div>
               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-amber-400" />
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Punctuality</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{monthlyLogs.length > 0 ? (100 - (stats.lateCount / monthlyLogs.length * 100)).toFixed(0) : 0}%</p>
               </div>
               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <Database size={14} className="text-red-400" />
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Task Volume</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.totalTasks}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                <div className="flex justify-between items-center mb-8">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowUpRight size={14} className="text-indigo-400" /> Trend Analysis
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><span className="text-[9px] text-slate-500">Work</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700"></div><span className="text-[9px] text-slate-500">Office</span></div>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorActualRep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={3} fill="url(#colorActualRep)" />
                      <Area type="monotone" dataKey="office" stroke="#334155" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Efficiency Distribution</h4>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.slice(-10)}>
                        <XAxis dataKey="name" fontSize={9} stroke="#475569" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} cursor={{fill: '#1e293b'}} />
                        <Bar dataKey="efficiency" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-4 italic">Showing last 10 tracked days efficiency percentage.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 no-print border-t border-slate-800 pt-8">
        <button 
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-md active:scale-95"
        >
          <Printer size={16} /> Print Full Audit
        </button>
        <button 
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-2xl text-xs font-bold transition-all border border-indigo-500/20 shadow-md active:scale-95"
        >
          <Download size={16} /> Export Data (.CSV)
        </button>
      </div>
    </div>
  );
};

export default ReportsPanel;
