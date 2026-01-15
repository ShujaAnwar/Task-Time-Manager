
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
  ClipboardCheck
} from 'lucide-react';
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

  // Comprehensive stats for the current user
  const stats = useMemo(() => {
    const logsToProcess = reportType === 'daily' ? [todayLog] : monthlyLogs;
    
    let totalActual = 0;
    let totalAllocated = 0;
    let totalOffice = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let lateCount = 0;

    logsToProcess.forEach(l => {
      totalActual += l.tasks.reduce((sum, t) => sum + t.actualDuration, 0);
      totalAllocated += l.tasks.reduce((sum, t) => sum + t.duration, 0);
      if (l.timeIn && l.timeOut) {
        totalOffice += diffMinutes(l.timeIn, l.timeOut);
      }
      if (l.timeIn && isLate(l.timeIn, config.officeStartTime)) {
        lateCount++;
      }
      totalTasks += l.tasks.length;
      completedTasks += l.tasks.filter(t => t.status === 'completed').length;
    });

    const avgEfficiency = totalOffice > 0 ? (totalActual / totalOffice) * 100 : 0;
    
    return { 
      totalActual, 
      totalAllocated, 
      totalOffice, 
      lateCount, 
      avgEfficiency, 
      totalTasks, 
      completedTasks 
    };
  }, [reportType, todayLog, monthlyLogs, config.officeStartTime]);

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
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.text(subtitle, margin, 28);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`AUDIT SESSION: ${new Date().toLocaleString()}`, margin, 34);
        doc.text(`SYSTEM NODE: ${config.sheetUrl ? 'CLOUD-CONNECTED' : 'LOCAL-ONLY'}`, pageWidth - margin - 50, 34);
      };

      const subtitle = `${currentUser?.name.toUpperCase()} | NODE ID: ${currentUser?.id} | PERIOD: ${reportType === 'daily' ? getTodayStr() : monthName + ' ' + currentYear}`;
      drawHeader('INDIVIDUAL PERFORMANCE AUDIT', subtitle);

      const headers = ['DATE', 'TASK DESCRIPTION', 'ESTIMATED', 'ACTUAL', 'STATUS'];
      const colWidths = [22, pageWidth - (margin * 2) - 80, 20, 20, 18];
      
      const drawTableHead = (py: number) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, py, pageWidth - (margin * 2), 10, 'F');
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
      const logsToPrint = reportType === 'daily' ? [todayLog] : monthlyLogs;

      logsToPrint.forEach((log) => {
        log.tasks.forEach((task) => {
          if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
            y = drawTableHead(y);
          }
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          let cx = margin + 3;
          doc.text(log.date, cx, y + 6);
          cx += colWidths[0];
          doc.text(task.title.substring(0, 55), cx, y + 6);
          cx += colWidths[1];
          doc.text(formatMinutesToDisplay(task.duration), cx, y + 6);
          cx += colWidths[2];
          doc.text(formatMinutesToDisplay(task.actualDuration), cx, y + 6);
          cx += colWidths[3];
          doc.text(task.status.toUpperCase(), cx, y + 6);
          
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 10, pageWidth - margin, y + 10);
          y += 10;
        });
      });

      // MANDATORY SUMMARY TOTALS FOOTER
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      y += 10;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 35, 3, 3, 'FD');
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AUDIT SUMMARY TOTALS', margin + 5, y + 8);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Allocated Time (Planned):`, margin + 5, y + 16);
      doc.text(formatMinutesToDisplay(stats.totalAllocated), margin + 65, y + 16);
      
      doc.text(`Total Actual Time (Executed):`, margin + 5, y + 22);
      doc.text(formatMinutesToDisplay(stats.totalActual), margin + 65, y + 22);
      
      doc.text(`Total Office Hours (Attendance):`, margin + 5, y + 28);
      doc.text(formatMinutesToDisplay(stats.totalOffice), margin + 65, y + 28);

      // Visual progress in footer
      const efficiency = stats.totalAllocated > 0 ? (stats.totalActual / stats.totalAllocated) * 100 : 0;
      doc.text(`Utilization Efficiency:`, pageWidth / 2 + 5, y + 16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${efficiency.toFixed(1)}%`, pageWidth / 2 + 45, y + 16);
      
      doc.save(`Audit_${currentUser?.id}_${getTodayStr()}.pdf`);
    } finally {
      setIsExporting(null);
    }
  };

  const exportMasterActivityPDF = async () => {
    if (!isAdmin) return;
    setIsExporting('master');
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for consolidated view
      const margin = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 50;

      const drawHeader = () => {
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('MASTER ORGANIZATIONAL ACTIVITY AUDIT', margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.text('CONSOLIDATED WORKFORCE ATTENDANCE & PERFORMANCE SUMMARY', margin, 28);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`SYSTEM GENERATED: ${new Date().toLocaleString()}`, margin, 34);
      };

      drawHeader();

      const headers = ['USER ID', 'NAME', 'DATE', 'TIME IN', 'TIME OUT', 'WORK HOURS', 'TASKS', 'ACTUAL TIME'];
      const colWidths = [20, 45, 25, 20, 20, 30, 20, 30];

      const drawTableHead = (py: number) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, py, pageWidth - (margin * 2), 10, 'F');
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

      let grandTotalWorkingMinutes = 0;
      let grandTotalActualTaskMinutes = 0;
      const userGrandTotals: Record<string, number> = {};

      // Sort users for consistent report
      const sortedUsers = [...config.users].sort((a, b) => a.name.localeCompare(b.name));

      sortedUsers.forEach(user => {
        const logs = userLogs[user.id] || {};
        const dates = Object.keys(logs).sort((a, b) => b.localeCompare(a));
        let userSubtotal = 0;

        dates.forEach(date => {
          const l = logs[date];
          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
            y = drawTableHead(y);
          }

          const dailyMins = (l.timeIn && l.timeOut) ? diffMinutes(l.timeIn, l.timeOut) : 0;
          const taskMins = l.tasks.reduce((s, t) => s + t.actualDuration, 0);
          
          userSubtotal += dailyMins;
          grandTotalWorkingMinutes += dailyMins;
          grandTotalActualTaskMinutes += taskMins;

          let cx = margin + 3;
          doc.text(user.id, cx, y + 6);
          cx += colWidths[0];
          doc.text(user.name.substring(0, 25), cx, y + 6);
          cx += colWidths[1];
          doc.text(date, cx, y + 6);
          cx += colWidths[2];
          doc.text(l.timeIn || '—', cx, y + 6);
          cx += colWidths[3];
          doc.text(l.timeOut || '—', cx, y + 6);
          cx += colWidths[4];
          doc.text(formatMinutesToDisplay(dailyMins), cx, y + 6);
          cx += colWidths[5];
          doc.text(l.tasks.length.toString(), cx, y + 6);
          cx += colWidths[6];
          doc.text(formatMinutesToDisplay(taskMins), cx, y + 6);

          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 10, pageWidth - margin, y + 10);
          y += 10;
        });

        userGrandTotals[user.id] = userSubtotal;
      });

      // GRAND TOTALS SECTION
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }
      y += 10;
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, pageWidth - (margin * 2), 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ORGANIZATIONAL AGGREGATE SUMMARY', margin + 5, y + 8);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`OVERALL WORKFORCE WORKING TIME:`, margin + 5, y + 17);
      doc.setFont('helvetica', 'bold');
      doc.text(formatMinutesToDisplay(grandTotalWorkingMinutes), margin + 65, y + 17);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`OVERALL ACTUAL TASK OUTPUT:`, pageWidth / 2, y + 17);
      doc.setFont('helvetica', 'bold');
      doc.text(formatMinutesToDisplay(grandTotalActualTaskMinutes), pageWidth / 2 + 65, y + 17);

      doc.save(`Master_Organizational_Audit_${getTodayStr()}.pdf`);
    } catch (err) {
      console.error("Master Audit Export Failed:", err);
    } finally {
      setIsExporting(null);
    }
  };

  const exportToExcel = () => {
    setIsExporting('excel');
    try {
      const tasksData: any[] = [];
      const logsToExport = reportType === 'daily' ? [todayLog] : monthlyLogs;
      logsToExport.forEach(l => l.tasks.forEach(t => tasksData.push({
        Date: l.date,
        "Task Title": t.title,
        "Allocated Minutes": t.duration,
        "Actual Minutes": t.actualDuration,
        "Status": t.status,
        "Diff": t.actualDuration - t.duration
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksData), "Task Audit");
      XLSX.writeFile(wb, `Audit_${currentUser?.id}_${getTodayStr()}.xlsx`);
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-slate-950/50 p-4 rounded-[2rem] border border-slate-800">
             <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Total Allocated</p>
             <p className="text-xl font-black text-white tabular-nums">{formatMinutesToDisplay(stats.totalAllocated)}</p>
           </div>
           <div className="bg-slate-950/50 p-4 rounded-[2rem] border border-slate-800">
             <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Total Actual</p>
             <p className="text-xl font-black text-indigo-400 tabular-nums">{formatMinutesToDisplay(stats.totalActual)}</p>
           </div>
           <div className="bg-slate-950/50 p-4 rounded-[2rem] border border-slate-800">
             <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Office Time</p>
             <p className="text-xl font-black text-white tabular-nums">{formatMinutesToDisplay(stats.totalOffice)}</p>
           </div>
           <div className="bg-slate-950/50 p-4 rounded-[2rem] border border-slate-800">
             <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Efficiency</p>
             <p className="text-xl font-black text-emerald-400">{stats.avgEfficiency.toFixed(0)}%</p>
           </div>
        </div>

        {isAdmin && reportType === 'monthly' && (
           <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><ShieldAlert size={24} /></div>
                <div>
                   <h4 className="text-sm font-black text-white uppercase tracking-widest">Master Audit Control</h4>
                   <p className="text-xs text-slate-400">Export high-level organizational logs containing all user activity for this period.</p>
                </div>
             </div>
             <button onClick={exportMasterActivityPDF} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl">Master PDF Export</button>
           </div>
        )}

        {reportType === 'daily' ? (
           <div className="bg-slate-950/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="px-6 py-5 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
                <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2"><ClipboardCheck size={14} /> Output Verification</h4>
                <span className="text-[10px] font-bold text-slate-500">{todayLog.date}</span>
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
        ) : (
          <div className="bg-slate-950/40 p-4 md:p-8 rounded-[3rem] border border-slate-800/50 h-80 animate-in fade-in duration-700">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2"><TrendingUp size={16} /> Productivity Velocity</h4>
              </div>
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
        )}
      </div>
    </div>
  );
};

export default ReportsPanel;
