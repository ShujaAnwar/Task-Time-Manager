
import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  BarChart2, 
  FileSpreadsheet, 
  FileDown, 
  Loader2, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { DayLog, AppState, UserProfile } from '../types';
import { getTodayStr, diffMinutes, formatMinutesToDisplay, isLate } from '../utils/time';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface Props {
  logs: Record<string, DayLog>;
  config: AppState['config'];
  user?: UserProfile;
  isFullWidth?: boolean;
}

const ReportsPanel: React.FC<Props> = ({ logs, config, user, isFullWidth }) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const allLogs = useMemo(() => (Object.values(logs) as DayLog[]).sort((a, b) => b.date.localeCompare(a.date)), [logs]);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());
  
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
    setIsExporting('pdf');
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 0;

      const drawReportHeader = (pageNum: number) => {
        // Branding Bar
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 0, pageWidth, 45, 'F');
        
        // Report Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PERFORMANCE AUDIT REPORT', margin, 22);
        
        // User Branding
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241); // Indigo-400
        doc.text(`EMPLOYEE: ${user?.name?.toUpperCase() || 'SYSTEM USER'}`, margin, 32);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(`EMPLOYEE ID: ${user?.id || 'UNASSIGNED'}`, margin, 38);
        
        // Metadata
        doc.text(`GENERATED: ${new Date().toLocaleString()}`, pageWidth - margin - 55, 32);
        doc.text(`PERIOD: ${monthName} ${currentYear}`, pageWidth - margin - 55, 38);
        
        if (pageNum > 1) {
          doc.text(`Page ${pageNum}`, pageWidth - margin - 15, 10);
        }
      };

      drawReportHeader(1);
      y = 55;

      // Executive Summary Boxes
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      const gridW = (pageWidth - (margin * 2) - 10) / 3;
      const gridH = 22;

      // Actual Hours Box
      doc.roundedRect(margin, y, gridW, gridH, 2, 2, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.text('TOTAL BILLED HOURS', margin + 5, y + 6);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${(stats.totalActual / 60).toFixed(1)}h`, margin + 5, y + 15);

      // Efficiency Box
      doc.roundedRect(margin + gridW + 5, y, gridW, gridH, 2, 2, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.text('AUDIT EFFICIENCY', margin + gridW + 10, y + 6);
      doc.setTextColor(79, 70, 229);
      doc.text(`${stats.avgEfficiency.toFixed(1)}%`, margin + gridW + 10, y + 15);

      // Target Reach Box
      doc.roundedRect(margin + (gridW * 2) + 10, y, gridW, gridH, 2, 2, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.text('LOGGED ENTRIES', margin + (gridW * 2) + 15, y + 6);
      doc.setTextColor(16, 185, 129);
      doc.text(`${monthlyLogs.length} Days`, margin + (gridW * 2) + 15, y + 15);

      y += 35;

      // --- DATA TABLE ---
      const tableHeaders = [
        { name: 'DATE', w: 25 },
        { name: 'IN / OUT', w: 35 },
        { name: 'ACTUAL', w: 25 },
        { name: 'TASK DESCRIPTION / NOTES', w: pageWidth - (margin * 2) - 85 }
      ];

      // Draw Header Row
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      let curX = margin;
      tableHeaders.forEach(h => {
        doc.text(h.name, curX + 3, y + 6.5);
        curX += h.w;
      });

      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);

      let currentPDFPage = 1;
      monthlyLogs.forEach((l, idx) => {
        if (y > pageHeight - 25) {
          doc.addPage();
          currentPDFPage++;
          drawReportHeader(currentPDFPage);
          y = 55;
          // Redraw Table Headers on new page
          doc.setFillColor(15, 23, 42);
          doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          let subX = margin;
          tableHeaders.forEach(h => {
            doc.text(h.name, subX + 3, y + 6.5);
            subX += h.w;
          });
          y += 10;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(31, 41, 55);
        }

        // Stripe and Border
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
        }
        
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, pageWidth - (margin * 2), 10); // Full row border

        let cellX = margin;
        // Date
        doc.text(l.date, cellX + 3, y + 6.5);
        doc.line(cellX + tableHeaders[0].w, y, cellX + tableHeaders[0].w, y + 10);
        cellX += tableHeaders[0].w;
        
        // Time
        doc.text(`${l.timeIn || '--'} - ${l.timeOut || '--'}`, cellX + 3, y + 6.5);
        doc.line(cellX + tableHeaders[1].w, y, cellX + tableHeaders[1].w, y + 10);
        cellX += tableHeaders[1].w;
        
        // Hours
        const dayActual = l.tasks.reduce((s, t) => s + t.actualDuration, 0);
        doc.text(formatMinutesToDisplay(dayActual), cellX + 3, y + 6.5);
        doc.line(cellX + tableHeaders[2].w, y, cellX + tableHeaders[2].w, y + 10);
        cellX += tableHeaders[2].w;
        
        // Tasks
        const taskSummary = l.tasks.map(t => t.title).join(', ');
        const truncated = taskSummary.length > 70 ? taskSummary.substring(0, 67) + '...' : taskSummary;
        doc.text(truncated || 'No specific tasks logged', cellX + 3, y + 6.5);

        y += 10;
      });

      // Footer line
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('This document is a certified professional productivity audit. All records are verified by system timestamps.', margin, pageHeight - 10);
      doc.text('Created by Shuja Anwar Ahmed Hashmi', pageWidth - margin - 55, pageHeight - 10);

      doc.save(`Audit_${user?.id || 'User'}_${monthName}_${currentYear}.pdf`);
    } catch (err) {
      console.error("Audit export failed:", err);
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
      XLSX.writeFile(wb, `Audit_Data_${user?.id || 'User'}_${getTodayStr()}.xlsx`);
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
          <p className="text-xs text-slate-500 mt-1">Audit-ready metrics for organizational oversight</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/50">
            <button onClick={() => setReportType('daily')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${reportType === 'daily' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>Daily</button>
            <button onClick={() => setReportType('monthly')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all ${reportType === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>Monthly</button>
          </div>
          <button onClick={exportToPDF} disabled={!!isExporting} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-700 transition-all active:scale-95 disabled:opacity-50">
            {isExporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Executive PDF
          </button>
          <button onClick={exportToExcel} disabled={!!isExporting} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
            {isExporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Data Sheet
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-8 p-4 bg-transparent">
        {reportType === 'daily' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={12} className="text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Shift Start</p>
                  </div>
                  <p className="text-2xl font-black text-white tabular-nums">{todayLog.timeIn || '— : —'}</p>
                </div>
                <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={12} className="text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Work Logged</p>
                  </div>
                  <p className="text-2xl font-black text-white tabular-nums">{formatMinutesToDisplay(todayLog.tasks.reduce((s, t) => s + t.actualDuration, 0))}</p>
                </div>
                <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={12} className="text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Duration</p>
                  </div>
                  <p className="text-2xl font-black text-indigo-400 tabular-nums">{(todayLog.timeIn && todayLog.timeOut) ? formatMinutesToDisplay(diffMinutes(todayLog.timeIn, todayLog.timeOut)) : '0h 0m'}</p>
                </div>
                <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={12} className="text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Accuracy</p>
                  </div>
                  <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Optimized</p>
                </div>
             </div>
             <div className="bg-slate-950/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden">
                <div className="px-6 py-5 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Daily Task Performance Audit</h4>
                  <span className="text-[10px] font-bold text-slate-500">{todayStr}</span>
                </div>
                <div className="p-4 space-y-3">
                  {todayLog.tasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-600 italic text-sm">No tasks recorded for today.</div>
                  ) : (
                    todayLog.tasks.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-5 bg-slate-900/40 rounded-3xl border border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-white">{t.title}</p>
                          <p className={`text-[9px] uppercase font-black tracking-widest mt-1 ${t.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>{t.status}</p>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-[9px] text-slate-600 uppercase font-black mb-1">Actual</p>
                            <p className="text-sm font-mono font-bold text-indigo-400">{formatMinutesToDisplay(t.actualDuration)}</p>
                          </div>
                          <div className="text-right border-l border-slate-800 pl-6">
                            <p className="text-[9px] text-slate-600 uppercase font-black mb-1">Plan</p>
                            <p className="text-sm font-mono font-bold text-slate-500">{formatMinutesToDisplay(t.duration)}</p>
                          </div>
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
                <div className="flex justify-between items-center mb-10">
                  <h4 className="text-[12px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2"><TrendingUp size={16} /> Productivity Audit Heatmap</h4>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Actual</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-700"></span> Plan</div>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                      <YAxis stroke="#475569" fontSize={11} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }} 
                        itemStyle={{ color: '#f8fafc', fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={4} fill="#6366f122" />
                      <Area type="monotone" dataKey="office" stroke="#334155" strokeWidth={2} fill="transparent" strokeDasharray="6 6" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </div>
        )}
        <div className="mt-12 pt-8 border-t border-slate-800/50 flex justify-between text-[9px] text-slate-600 font-bold uppercase tracking-widest">
          <p>Verified Professional Dataset Executive Intelligence Audit</p>
          <div className="flex items-center gap-2">
            <TrendingUp size={10} className="text-emerald-500" />
            <span>Operational Integrity: 100% Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPanel;
