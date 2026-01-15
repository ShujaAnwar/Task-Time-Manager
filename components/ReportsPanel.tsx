
import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  BarChart2, 
  FileSpreadsheet, 
  FileDown, 
  Loader2, 
  TrendingUp,
  Clock,
  Users,
  ShieldAlert
} from 'lucide-react';
// Added Task to imports to fix type issues in derivation
import { DayLog, AppState, UserProfile, Task } from '../types';
import { getTodayStr, diffMinutes, formatMinutesToDisplay, isLate } from '../utils/time';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface Props {
  state: AppState;
  isFullWidth?: boolean;
}

const ReportsPanel: React.FC<Props> = ({ state, isFullWidth }) => {
  const { userLogs, currentUser, config } = state;
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Derived todayLog to fix missing variable error in daily report section
  const todayLog = useMemo(() => {
    const userId = currentUser?.id || '';
    const logs = userLogs[userId] || {};
    const todayStr = getTodayStr();
    return logs[todayStr] || { date: todayStr, tasks: [] as Task[] };
  }, [userLogs, currentUser]);

  const isAdmin = currentUser?.role === 'admin';
  const myLogs = useMemo(() => userLogs[currentUser?.id || ''] || {}, [userLogs, currentUser]);
  const allLogsList = useMemo(() => (Object.values(myLogs) as DayLog[]).sort((a, b) => b.date.localeCompare(a.date)), [myLogs]);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());
  
  const monthlyLogs = useMemo(() => allLogsList.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [allLogsList, currentMonth, currentYear]);

  const stats = useMemo(() => {
    const totalActual = monthlyLogs.reduce((sum, l) => sum + l.tasks.reduce((tsum, t) => tsum + t.actualDuration, 0), 0);
    const totalAllocated = monthlyLogs.reduce((sum, l) => sum + l.tasks.reduce((asum, t) => asum + t.duration, 0), 0);
    const totalOffice = monthlyLogs.reduce((sum, l) => (l.timeIn && l.timeOut) ? sum + diffMinutes(l.timeIn, l.timeOut) : sum, 0);
    const lateCount = monthlyLogs.filter(l => l.timeIn && isLate(l.timeIn, config.officeStartTime)).length;
    const avgEfficiency = totalOffice > 0 ? (totalActual / totalOffice) * 100 : 0;
    const totalTasks = monthlyLogs.reduce((sum, l) => sum + l.tasks.length, 0);
    const completedTasks = monthlyLogs.reduce((sum, l) => sum + l.tasks.filter(t => t.status === 'completed').length, 0);
    return { totalActual, totalAllocated, totalOffice, lateCount, avgEfficiency, totalTasks, completedTasks };
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
    setIsExporting('pdf');
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 50;

      const drawHeader = (title: string, subtitle: string) => {
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.text(subtitle, margin, 28);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`DATE GENERATED: ${new Date().toLocaleString()}`, margin, 34);
      };

      drawHeader('INDIVIDUAL TASK AUDIT', `EMPLOYEE: ${currentUser?.name.toUpperCase()} (ID: ${currentUser?.id})`);

      // Summary Totals Section
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 25, 2, 2, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('AUDIT PERIOD TOTALS', margin + 5, y + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Total Allocated Time: ${formatMinutesToDisplay(stats.totalAllocated)}`, margin + 5, y + 15);
      doc.text(`Total Actual Time: ${formatMinutesToDisplay(stats.totalActual)}`, margin + 5, y + 20);
      
      const timeDiff = stats.totalActual - stats.totalAllocated;
      doc.setTextColor(timeDiff > 0 ? 220 : 16, timeDiff > 0 ? 38 : 185, timeDiff > 0 ? 38 : 129);
      doc.text(`Variance: ${timeDiff > 0 ? '+' : ''}${formatMinutesToDisplay(timeDiff)}`, pageWidth - margin - 45, y + 17);
      
      y += 35;

      // Table
      const headers = ['DATE', 'TASK TITLE', 'EST', 'ACT', 'STATUS'];
      const colWidths = [25, pageWidth - margin * 2 - 75, 20, 20, 15];
      
      const drawTableHead = (py: number) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, py, pageWidth - margin * 2, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        let cx = margin + 2;
        headers.forEach((h, i) => {
          doc.text(h, cx, py + 5.5);
          cx += colWidths[i];
        });
        return py + 8;
      };

      y = drawTableHead(y);

      monthlyLogs.forEach((l) => {
        l.tasks.forEach((t) => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 15;
            y = drawTableHead(y);
          }
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          let cx = margin + 2;
          doc.text(l.date, cx, y + 5);
          cx += colWidths[0];
          doc.text(t.title.substring(0, 50), cx, y + 5);
          cx += colWidths[1];
          doc.text(formatMinutesToDisplay(t.duration), cx, y + 5);
          cx += colWidths[2];
          doc.text(formatMinutesToDisplay(t.actualDuration), cx, y + 5);
          cx += colWidths[3];
          doc.text(t.status.toUpperCase(), cx, y + 5);
          
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 8, pageWidth - margin, y + 8);
          y += 8;
        });
      });

      doc.save(`Audit_${currentUser?.id}_${monthName}.pdf`);
    } finally {
      setIsExporting(null);
    }
  };

  const exportMasterActivityPDF = async () => {
    if (!isAdmin) return;
    setIsExporting('master');
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more data
      const margin = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 50;

      const drawHeader = () => {
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('ORGANIZATIONAL ACTIVITY MASTER AUDIT', margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.text('ALL USERS DAILY ATTENDANCE & PERFORMANCE SUMMARY', margin, 28);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`DATE GENERATED: ${new Date().toLocaleString()}`, margin, 34);
      };

      drawHeader();

      const headers = ['USER ID', 'EMPLOYEE NAME', 'DATE', 'TIME IN', 'TIME OUT', 'WORK TIME', 'TASKS'];
      const colWidths = [25, 45, 30, 25, 25, 30, 20];

      const drawTableHead = (py: number) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, py, pageWidth - margin * 2, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        let cx = margin + 3;
        headers.forEach((h, i) => {
          doc.text(h, cx, py + 6.5);
          cx += colWidths[i];
        });
        return py + 10;
      };

      y = drawTableHead(y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      let totalGlobalMinutes = 0;

      config.users.forEach(u => {
        const logs = userLogs[u.id] || {};
        const sortedDates = Object.keys(logs).sort((a, b) => b.localeCompare(a));
        
        sortedDates.forEach(date => {
          const l = logs[date];
          if (y > pageHeight - 15) {
            doc.addPage();
            y = 15;
            y = drawTableHead(y);
          }

          const workMins = (l.timeIn && l.timeOut) ? diffMinutes(l.timeIn, l.timeOut) : 0;
          totalGlobalMinutes += workMins;

          let cx = margin + 3;
          doc.text(u.id, cx, y + 6);
          cx += colWidths[0];
          doc.text(u.name, cx, y + 6);
          cx += colWidths[1];
          doc.text(date, cx, y + 6);
          cx += colWidths[2];
          doc.text(l.timeIn || '—', cx, y + 6);
          cx += colWidths[3];
          doc.text(l.timeOut || '—', cx, y + 6);
          cx += colWidths[4];
          doc.text(formatMinutesToDisplay(workMins), cx, y + 6);
          cx += colWidths[5];
          doc.text(l.tasks.length.toString(), cx, y + 6);

          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 10, pageWidth - margin, y + 10);
          y += 10;
        });
      });

      // Master Summary Footer
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 15;
      }
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y + 5, pageWidth - margin * 2, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`GRAND TOTAL WORKFORCE HOURS: ${formatMinutesToDisplay(totalGlobalMinutes)}`, margin + 5, y + 15);

      doc.save(`Master_Organizational_Audit_${getTodayStr()}.pdf`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 backdrop-blur-xl shadow-2xl flex flex-col ${isFullWidth ? 'min-h-screen' : ''}`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-inner">
            <BarChart2 size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Performance Audits</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Data-driven output tracking</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto">
          <div className="flex gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/50 w-full md:w-auto">
            <button onClick={() => setReportType('daily')} className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${reportType === 'daily' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>Daily</button>
            <button onClick={() => setReportType('monthly')} className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${reportType === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>Monthly</button>
          </div>
          
          <button onClick={exportToPDF} disabled={!!isExporting} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-700 transition-all active:scale-95 disabled:opacity-50">
            {isExporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF Report
          </button>

          {isAdmin && (
            <button onClick={exportMasterActivityPDF} disabled={!!isExporting} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50">
              {isExporting === 'master' ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />} Master Audit PDF
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-8 bg-transparent">
        {reportType === 'daily' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-[2rem] border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Allocated</p>
                  <p className="text-xl font-black text-white tabular-nums">{formatMinutesToDisplay(todayLog.tasks.reduce((s, t) => s + t.duration, 0))}</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-[2rem] border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Actual</p>
                  <p className="text-xl font-black text-indigo-400 tabular-nums">{formatMinutesToDisplay(todayLog.tasks.reduce((s, t) => s + t.actualDuration, 0))}</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-[2rem] border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Office Time</p>
                  <p className="text-xl font-black text-white tabular-nums">{(todayLog.timeIn && todayLog.timeOut) ? formatMinutesToDisplay(diffMinutes(todayLog.timeIn, todayLog.timeOut)) : '—'}</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-[2rem] border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Utilization</p>
                  <p className="text-xl font-black text-emerald-400">{stats.avgEfficiency.toFixed(0)}%</p>
                </div>
             </div>
             
             <div className="bg-slate-950/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden">
                <div className="px-6 py-5 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Detailed Task Logs</h4>
                  <span className="text-[10px] font-bold text-slate-500">{getTodayStr()}</span>
                </div>
                <div className="p-4 space-y-3">
                  {todayLog.tasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-600 italic text-sm">No activity recorded for today.</div>
                  ) : (
                    todayLog.tasks.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-4 bg-slate-900/40 rounded-3xl border border-slate-800/50">
                        <div>
                          <p className="text-sm font-bold text-white">{t.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{t.status}</span>
                            <span className="text-[9px] text-slate-600 font-bold">Planned: {formatMinutesToDisplay(t.duration)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-mono font-bold text-indigo-400">{formatMinutesToDisplay(t.actualDuration)}</p>
                           <p className="text-[8px] text-slate-600 uppercase font-black">Actual Used</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-4">Total Output</p>
                  <p className="text-3xl font-black text-white">{(stats.totalActual / 60).toFixed(1)}h</p>
               </div>
               <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-4">Master Efficiency</p>
                  <p className="text-3xl font-black text-indigo-400">{stats.avgEfficiency.toFixed(0)}%</p>
               </div>
               <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-4">Late Count</p>
                  <p className="text-3xl font-black text-white">{stats.lateCount}</p>
               </div>
               <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-4">Completed</p>
                  <p className="text-3xl font-black text-emerald-400">{stats.completedTasks}</p>
               </div>
            </div>
            
            {isAdmin && (
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-600 text-white rounded-2xl"><ShieldAlert size={24} /></div>
                   <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Administrator Master Audit</h4>
                      <p className="text-xs text-slate-400">Generate a comprehensive report of all employee activities across the entire organization.</p>
                   </div>
                </div>
                <button onClick={exportMasterActivityPDF} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl">Generate Master PDF</button>
              </div>
            )}

            <div className="bg-slate-950/40 p-4 md:p-8 rounded-[3rem] border border-slate-800/50 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={11} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                    <YAxis stroke="#475569" fontSize={11} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} 
                      itemStyle={{ color: '#f8fafc', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={4} fill="#6366f122" />
                    <Area type="monotone" dataKey="office" stroke="#334155" strokeWidth={2} fill="transparent" strokeDasharray="6 6" />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPanel;
