
import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  BarChart2, 
  FileSpreadsheet, 
  FileDown, 
  Layout, 
  Star, 
  Zap, 
  Loader2, 
  Target 
} from 'lucide-react';
import { DayLog, AppState } from '../types';
import { getTodayStr, diffMinutes, formatMinutesToDisplay, isLate } from '../utils/time';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

interface Props {
  logs: Record<string, DayLog>;
  config: AppState['config'];
  isFullWidth?: boolean;
}

const ReportsPanel: React.FC<Props> = ({ logs, config, isFullWidth }) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const allLogs = useMemo(() => (Object.values(logs) as DayLog[]).sort((a, b) => b.date.localeCompare(a.date)), [logs]);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyLogs = useMemo(() => allLogs.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [allLogs, currentMonth, currentYear]);

  const stats = useMemo(() => {
    const totalActual = monthlyLogs.reduce((sum, l) => sum + l.tasks.reduce((tsum, t) => tsum + t.actualDuration, 0), 0);
    const totalOffice = monthlyLogs.reduce((sum, l) => (l.timeIn && l.timeOut) ? sum + diffMinutes(l.timeIn, l.timeOut) : sum, 0);
    const lateCount = monthlyLogs.filter(l => l.timeIn && isLate(l.timeIn, config.officeStartTime)).length;
    const avgEfficiency = totalOffice > 0 ? (totalActual / totalOffice) * 100 : 0;
    const totalTasks = monthlyLogs.reduce((sum, l) => sum + l.tasks.length, 0);
    const completedTasks = monthlyLogs.reduce((sum, l) => sum + l.tasks.filter(t => t.status === 'completed').length, 0);
    return { totalActual, totalOffice, lateCount, avgEfficiency, totalTasks, completedTasks };
  }, [monthlyLogs, config.officeStartTime]);

  const chartData = useMemo(() => {
    return monthlyLogs.slice().reverse().map(l => {
      const dayActual = l.tasks.reduce((s, t) => s + t.actualDuration, 0);
      const dayOffice = (l.timeIn && l.timeOut) ? diffMinutes(l.timeIn, l.timeOut) : 0;
      return {
        name: l.date.split('-')[2],
        fullDate: l.date,
        actual: Math.round((dayActual / 60) * 10) / 10,
        office: Math.round((dayOffice / 60) * 10) / 10,
        efficiency: dayOffice > 0 ? Math.round((dayActual / dayOffice) * 100) : 0
      };
    });
  }, [monthlyLogs]);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting('pdf');
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#020617' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TaskTime_Audit_${getTodayStr()}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(null);
    }
  };

  const exportToExcel = () => {
    setIsExporting('excel');
    try {
      const attendanceData = monthlyLogs.map(l => ({
        Date: l.date, "Clock In": l.timeIn || 'N/A', "Clock Out": l.timeOut || 'N/A',
        "Total Hours": (l.timeIn && l.timeOut) ? (diffMinutes(l.timeIn, l.timeOut) / 60).toFixed(2) : 0,
        "Efficiency %": (l.timeIn && l.timeOut) ? ((l.tasks.reduce((s, t) => s + t.actualDuration, 0) / diffMinutes(l.timeIn, l.timeOut)) * 100).toFixed(1) : 0
      }));
      const tasksData: any[] = [];
      monthlyLogs.forEach(l => l.tasks.forEach(t => tasksData.push({
        Date: l.date, "Task Title": t.title, "Est. Minutes": t.duration, "Actual Minutes": t.actualDuration, Status: t.status
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceData), "Attendance");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksData), "Tasks");
      XLSX.writeFile(wb, `TaskTime_Executive_Report_${getTodayStr()}.xlsx`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(null);
    }
  };

  const todayStr = getTodayStr();
  const todayLog = logs[todayStr] || { date: todayStr, tasks: [] };

  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl flex flex-col ${isFullWidth ? 'min-h-screen' : ''}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 no-print">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 text-white">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-inner">
              <BarChart2 size={22} />
            </div>
            Reporting Intelligence
          </h3>
          <p className="text-xs text-slate-500 mt-1">Audit-ready metrics for {config.userName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/50">
            <button onClick={() => setReportType('daily')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${reportType === 'daily' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>Daily</button>
            <button onClick={() => setReportType('monthly')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${reportType === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>Monthly</button>
          </div>
          <button onClick={exportToPDF} disabled={!!isExporting} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-700 transition-all active:scale-95 disabled:opacity-50">
            {isExporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Pro PDF
          </button>
          <button onClick={exportToExcel} disabled={!!isExporting} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
            {isExporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Excel Data
          </button>
        </div>
      </div>

      <div ref={reportRef} className="flex-1 space-y-8 p-4 bg-transparent">
        {reportType === 'daily' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Shift Start</p>
                  <p className="text-2xl font-black text-white tabular-nums">{todayLog.timeIn || '— : —'}</p>
                </div>
                <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Work Logged</p>
                  <p className="text-2xl font-black text-white tabular-nums">{formatMinutesToDisplay(todayLog.tasks.reduce((s, t) => s + t.actualDuration, 0))}</p>
                </div>
                <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Duration</p>
                  <p className="text-2xl font-black text-indigo-400 tabular-nums">{(todayLog.timeIn && todayLog.timeOut) ? formatMinutesToDisplay(diffMinutes(todayLog.timeIn, todayLog.timeOut)) : '0h 0m'}</p>
                </div>
                <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Accuracy</p>
                  <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Optimized</p>
                </div>
             </div>
             <div className="bg-slate-950/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden">
                <div className="px-6 py-5 bg-slate-950/80 border-b border-slate-800">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Daily Task Performance Audit</h4>
                </div>
                <div className="p-4 space-y-3">
                  {todayLog.tasks.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-5 bg-slate-900/40 rounded-3xl border border-slate-800/50">
                      <div><p className="text-sm font-bold text-white">{t.title}</p></div>
                      <div className="flex items-center gap-8">
                        <div className="text-right"><p className="text-[9px] text-slate-600 uppercase font-black">Actual</p><p className="text-sm font-mono font-bold text-indigo-400">{formatMinutesToDisplay(t.actualDuration)}</p></div>
                        <div className="text-right border-l border-slate-800 pl-6"><p className="text-[9px] text-slate-600 uppercase font-black">Plan</p><p className="text-sm font-mono font-bold text-slate-500">{formatMinutesToDisplay(t.duration)}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-4">Monthly Output</p>
                  <p className="text-3xl font-black text-white">{(stats.totalActual / 60).toFixed(1)}h</p>
               </div>
               <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-4">Efficiency</p>
                  <p className="text-3xl font-black text-indigo-400">{stats.avgEfficiency.toFixed(0)}%</p>
               </div>
               <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-4">Discipline</p>
                  <p className="text-3xl font-black text-white">{monthlyLogs.length > 0 ? (100 - (stats.lateCount / monthlyLogs.length * 100)).toFixed(0) : 0}%</p>
               </div>
               <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-4">Completed</p>
                  <p className="text-3xl font-black text-emerald-400">{stats.completedTasks}</p>
               </div>
            </div>
            <div className="bg-slate-950/40 p-8 rounded-[3rem] border border-slate-800/50">
                <h4 className="text-[12px] font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-2"><TrendingUp size={16} /> Productivity Audit Heatmap</h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                      <YAxis stroke="#475569" fontSize={11} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                      <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={4} fill="#6366f122" />
                      <Area type="monotone" dataKey="office" stroke="#334155" strokeWidth={2} fill="transparent" strokeDasharray="6 6" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </div>
        )}
        <div className="mt-12 pt-8 border-t border-slate-800/50 flex justify-between text-[9px] text-slate-600 font-bold uppercase tracking-widest">
          <p>Task & Time Manager Executive Intelligence Audit</p>
          <p>Verified Professional Dataset</p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPanel;
