
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
  ShieldAlert,
  ClipboardCheck,
  Award,
  Flag
} from 'lucide-react';
import { DayLog, AppState, UserProfile, Task, AttendanceStatus } from '../types';
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

  const isAdmin = currentUser?.role === 'admin';
  const userId = currentUser?.id || '';
  const myLogs = useMemo(() => userLogs[userId] || {}, [userLogs, userId]);
  
  const todayLog = useMemo(() => {
    const todayStr = getTodayStr();
    return myLogs[todayStr] || { date: todayStr, tasks: [] as Task[] };
  }, [myLogs]);

  const allLogsList = useMemo(() => (Object.values(myLogs) as DayLog[]).sort((a, b) => b.date.localeCompare(a.date)), [myLogs]);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());
  
  const monthlyLogs = useMemo(() => allLogsList.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [allLogsList, currentMonth, currentYear]);

  // Combined metrics for the active report
  const metrics = useMemo(() => {
    const logsToProcess = reportType === 'daily' ? [todayLog] : monthlyLogs;
    
    let actualMins = 0;
    let plannedMins = 0;
    let attendanceMins = 0;
    let tasksCompleted = 0;
    let penaltyLate = 0;

    logsToProcess.forEach(l => {
      actualMins += l.tasks.reduce((s, t) => s + t.actualDuration, 0);
      plannedMins += l.tasks.reduce((s, t) => s + t.duration, 0);
      if (l.timeIn && l.timeOut) attendanceMins += diffMinutes(l.timeIn, l.timeOut);
      if (l.timeIn && isLate(l.timeIn, config.officeStartTime)) penaltyLate++;
      tasksCompleted += l.tasks.filter(t => t.status === 'completed').length;
    });

    const efficiency = attendanceMins > 0 ? (actualMins / attendanceMins) * 100 : 0;
    
    return { actualMins, plannedMins, attendanceMins, tasksCompleted, penaltyLate, efficiency };
  }, [reportType, todayLog, monthlyLogs, config.officeStartTime]);

  const chartData = useMemo(() => {
    return monthlyLogs.slice().reverse().map(l => {
      const dayActual = l.tasks.reduce((s, t) => s + t.actualDuration, 0);
      const dayOffice = (l.timeIn && l.timeOut) ? diffMinutes(l.timeIn, l.timeOut) : 0;
      return {
        name: l.date.split('-')[2],
        actual: Math.round((dayActual / 60) * 10) / 10,
        office: Math.round((dayOffice / 60) * 10) / 10
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
      
      const drawHeader = () => {
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('PERFORMANCE ANALYTICS REPORT', margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.text(`EMPLOYEE: ${currentUser?.name.toUpperCase()} (ID: ${currentUser?.id})`, margin, 28);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`AUDIT CYCLE: ${reportType === 'daily' ? getTodayStr() : monthName + ' ' + currentYear}`, margin, 34);
        doc.text(`TIMESTAMP: ${new Date().toLocaleString()}`, pageWidth - margin - 60, 34);
      };

      drawHeader();
      let y = 55;

      // Table Setup
      const headers = ['DATE', 'TASK DESCRIPTION', 'PRIORITY', 'PLAN', 'ACTUAL', 'STATUS'];
      const widths = [22, pageWidth - margin * 2 - 95, 20, 18, 18, 17];
      
      const drawTableHead = (py: number) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, py, pageWidth - margin * 2, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        let cx = margin + 3;
        headers.forEach((h, i) => {
          doc.text(h, cx, py + 6.5);
          cx += widths[i];
        });
        return py + 10;
      };

      y = drawTableHead(y);
      const targetLogs = reportType === 'daily' ? [todayLog] : monthlyLogs;

      targetLogs.forEach(l => {
        l.tasks.forEach(t => {
          if (y > pageHeight - 50) {
            doc.addPage();
            y = 20;
            y = drawTableHead(y);
          }
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'normal').setFontSize(7);
          let cx = margin + 3;
          doc.text(l.date, cx, y + 6);
          cx += widths[0];
          doc.text(t.title.substring(0, 45), cx, y + 6);
          cx += widths[1];
          doc.text(t.priority?.toUpperCase() || 'LOW', cx, y + 6);
          cx += widths[2];
          doc.text(formatMinutesToDisplay(t.duration), cx, y + 6);
          cx += widths[3];
          doc.text(formatMinutesToDisplay(t.actualDuration), cx, y + 6);
          cx += widths[4];
          doc.text(t.status.toUpperCase(), cx, y + 6);
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 10, pageWidth - margin, y + 10);
          y += 10;
        });
      });

      // SUMMARY TOTALS FOOTER
      if (y > pageHeight - 65) {
        doc.addPage();
        y = 20;
      }
      y += 15;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 38, 3, 3, 'FD');
      
      doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
      doc.text('AUDIT PERIOD CONSOLIDATION', margin + 5, y + 8);
      
      doc.setFont('helvetica', 'normal').setFontSize(9);
      doc.text(`TOTAL PLANNED TIME:`, margin + 5, y + 17);
      doc.text(formatMinutesToDisplay(metrics.plannedMins), margin + 70, y + 17);
      
      doc.text(`TOTAL EXECUTED TIME:`, margin + 5, y + 24);
      doc.setFont('helvetica', 'bold');
      doc.text(formatMinutesToDisplay(metrics.actualMins), margin + 70, y + 24);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`TOTAL ATTENDANCE RECORDED:`, margin + 5, y + 31);
      doc.text(formatMinutesToDisplay(metrics.attendanceMins), margin + 70, y + 31);

      const score = Math.min(100, Math.round(metrics.efficiency));
      doc.setFontSize(22).setFont('helvetica', 'black').setTextColor(99, 102, 241);
      doc.text(`${score}%`, pageWidth - margin - 35, y + 22);
      doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(100, 116, 139);
      doc.text('EFFICIENCY INDEX', pageWidth - margin - 35, y + 28);

      doc.save(`Audit_${currentUser?.id}_${getTodayStr()}.pdf`);
    } finally {
      setIsExporting(null);
    }
  };

  const exportMasterPDF = async () => {
    if (!isAdmin) return;
    setIsExporting('master');
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const margin = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const drawHeader = () => {
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setTextColor(255, 255, 255).setFontSize(24).setFont('helvetica', 'bold');
        doc.text('MASTER ORGANIZATIONAL AUDIT', margin, 20);
        doc.setFontSize(10).setTextColor(99, 102, 241);
        doc.text('ENTERPRISE-WIDE ATTENDANCE & PERFORMANCE CONSOLIDATION', margin, 28);
        doc.setFontSize(8).setTextColor(148, 163, 184);
        doc.text(`SYSTEM DATA VERIFIED: ${new Date().toLocaleString()}`, margin, 34);
      };

      drawHeader();
      let y = 55;

      const headers = ['USER ID', 'EMPLOYEE NAME', 'DATE', 'PLAN TIME', 'ACTUAL TIME', 'ATTENDANCE', 'TASKS', 'PRIORITY (H/M/L)'];
      const widths = [25, 45, 25, 30, 30, 30, 20, 40];

      const drawTableHead = (py: number) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, py, pageWidth - margin * 2, 12, 'F');
        doc.setTextColor(255, 255, 255).setFontSize(9).setFont('helvetica', 'bold');
        let cx = margin + 3;
        headers.forEach((h, i) => {
          doc.text(h, cx, py + 8);
          cx += widths[i];
        });
        return py + 12;
      };

      y = drawTableHead(y);
      let grandTotalWork = 0, grandTotalTask = 0, grandTotalPlan = 0;

      const sortedUsers = [...config.users].sort((a, b) => a.name.localeCompare(b.name));
      sortedUsers.forEach(u => {
        const logs = userLogs[u.id] || {};
        const dates = Object.keys(logs).sort((a, b) => b.localeCompare(a));
        
        dates.forEach(d => {
          const l = logs[d];
          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
            y = drawTableHead(y);
          }

          const officeMins = (l.timeIn && l.timeOut) ? diffMinutes(l.timeIn, l.timeOut) : 0;
          const actualMins = l.tasks.reduce((s, t) => s + t.actualDuration, 0);
          const planMins = l.tasks.reduce((s, t) => s + t.duration, 0);
          const highP = l.tasks.filter(t => t.priority === 'high').length;
          const medP = l.tasks.filter(t => t.priority === 'medium').length;
          const lowP = l.tasks.filter(t => t.priority === 'low').length;

          grandTotalWork += officeMins;
          grandTotalTask += actualMins;
          grandTotalPlan += planMins;

          doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(15, 23, 42);
          let cx = margin + 3;
          doc.text(u.id, cx, y + 7);
          cx += widths[0];
          doc.text(u.name.substring(0, 25), cx, y + 7);
          cx += widths[1];
          doc.text(d, cx, y + 7);
          cx += widths[2];
          doc.text(formatMinutesToDisplay(planMins), cx, y + 7);
          cx += widths[3];
          doc.text(formatMinutesToDisplay(actualMins), cx, y + 7);
          cx += widths[4];
          doc.text(formatMinutesToDisplay(officeMins), cx, y + 7);
          cx += widths[5];
          doc.text(l.tasks.length.toString(), cx, y + 7);
          cx += widths[6];
          doc.text(`${highP} / ${medP} / ${lowP}`, cx, y + 7);

          doc.setDrawColor(226, 232, 240).line(margin, y + 11, pageWidth - margin, y + 11);
          y += 11;
        });
      });

      // GRAND TOTALS
      if (y > pageHeight - 40) { doc.addPage(); y = 20; }
      y += 10;
      doc.setFillColor(15, 23, 42).rect(margin, y, pageWidth - margin * 2, 20, 'F');
      doc.setTextColor(255, 255, 255).setFontSize(9).setFont('helvetica', 'bold');
      doc.text(`GRAND PLAN TIME: ${formatMinutesToDisplay(grandTotalPlan)}`, margin + 5, y + 12);
      doc.text(`GRAND ACTUAL OUTPUT: ${formatMinutesToDisplay(grandTotalTask)}`, pageWidth / 2 - 20, y + 12);
      doc.text(`GRAND ATTENDANCE TIME: ${formatMinutesToDisplay(grandTotalWork)}`, pageWidth - margin - 70, y + 12);

      doc.save(`Master_Audit_${getTodayStr()}.pdf`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 backdrop-blur-xl shadow-2xl flex flex-col ${isFullWidth ? 'min-h-screen' : ''}`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10 no-print">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-lg">
            <BarChart2 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Report Intelligence</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-80">Autonomous Data Aggregation</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/50 w-full md:w-auto">
            <button onClick={() => setReportType('daily')} className={`flex-1 md:flex-none px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${reportType === 'daily' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-300'}`}>Daily</button>
            <button onClick={() => setReportType('monthly')} className={`flex-1 md:flex-none px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${reportType === 'monthly' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-300'}`}>Monthly</button>
          </div>
          
          <button onClick={exportToPDF} disabled={!!isExporting} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all active:scale-95 disabled:opacity-50">
            {isExporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Individual PDF
          </button>

          {isAdmin && (
            <button onClick={exportMasterPDF} disabled={!!isExporting} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
              {isExporting === 'master' ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Master Audit PDF
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-8 animate-in fade-in duration-1000">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-inner">
             <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-3">Planned Cycle</p>
             <p className="text-2xl font-black text-white tabular-nums">{formatMinutesToDisplay(metrics.plannedMins)}</p>
           </div>
           <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-inner">
             <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-3">Actual Execution</p>
             <p className="text-2xl font-black text-theme-primary tabular-nums">{formatMinutesToDisplay(metrics.actualMins)}</p>
           </div>
           <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-inner">
             <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-3">Office Presence</p>
             <p className="text-2xl font-black text-white tabular-nums">{formatMinutesToDisplay(metrics.attendanceMins)}</p>
           </div>
           <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-inner">
             <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-3">Efficiency Grade</p>
             <p className="text-2xl font-black text-emerald-400">{metrics.efficiency.toFixed(0)}%</p>
           </div>
        </div>

        {reportType === 'daily' ? (
           <div className="bg-slate-950/30 rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
              <div className="px-8 py-6 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
                <h4 className="text-[12px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-theme-primary" /> Daily Output Audit
                </h4>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{todayLog.date}</span>
              </div>
              <div className="p-6 space-y-4">
                {todayLog.tasks.length === 0 ? (
                  <div className="p-16 text-center text-slate-600 italic font-medium uppercase tracking-widest opacity-30">Null records found for cycle.</div>
                ) : (
                  todayLog.tasks.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-6 bg-slate-900/40 rounded-[2rem] border border-slate-800/50 hover:bg-slate-800/60 transition-all group">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-base font-black text-white group-hover:text-theme-primary transition-colors">{t.title}</p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                            t.priority === 'high' ? 'text-rose-400 bg-rose-400/10 border-rose-500/20' : 
                            t.priority === 'medium' ? 'text-amber-400 bg-amber-400/10 border-amber-500/20' : 
                            'text-emerald-400 bg-emerald-400/10 border-emerald-500/20'
                          }`}>{t.priority}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`text-[9px] uppercase font-black px-2 py-1 rounded-lg ${t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>{t.status}</span>
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Budgeted: {formatMinutesToDisplay(t.duration)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black text-theme-primary tabular-nums">{formatMinutesToDisplay(t.actualDuration)}</p>
                         <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mt-1">Incurred Time</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        ) : (
          <div className="bg-slate-950/40 p-10 rounded-[4rem] border border-slate-800/50 h-[450px] shadow-2xl">
              <div className="flex justify-between items-center mb-12">
                <h4 className="text-[12px] font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                  <TrendingUp size={20} className="text-theme-primary" /> Productivity Velocity Metrics
                </h4>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="10 10" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: '900'}} />
                  <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: '900'}} />
                  <Tooltip 
                    contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '24px', padding: '16px' }} 
                    itemStyle={{ color: '#f8fafc', fontSize: '11px', fontWeight: 'black', textTransform: 'uppercase' }}
                  />
                  <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorActual)" />
                  <Area type="monotone" dataKey="office" stroke="#334155" strokeWidth={2} fill="transparent" strokeDasharray="10 10" />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPanel;
