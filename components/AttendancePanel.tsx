
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Timer, 
  Zap,
  Coffee,
  Plane
} from 'lucide-react';
import { DayLog, AppState, AttendanceStatus } from '../types';
import { formatTime, diffMinutes, formatMinutesToDisplay, isLate, getTodayStr } from '../utils/time';

interface Props {
  log: DayLog;
  config: AppState['config'];
  onUpdate: (updater: (prev: DayLog) => DayLog) => void;
  logs: Record<string, DayLog>;
  state: AppState;
  isFullWidth?: boolean;
}

const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-[2.5rem] border border-theme-primary/20 shadow-2xl shadow-theme-primary/10 mb-6">
      <p className="text-[10px] font-black text-theme-primary uppercase tracking-[0.4em] mb-2 opacity-80">Live Precision Time</p>
      <div className="text-4xl md:text-5xl font-black tabular-nums text-white tracking-tighter flex items-baseline gap-1">
        {timeStr.split(':').map((part, i) => (
          <React.Fragment key={i}>
            <span className={i === 2 ? 'text-theme-primary opacity-80' : 'text-white'}>{part}</span>
            {i < 2 && <span className="text-slate-700 animate-pulse">:</span>}
          </React.Fragment>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">
        {time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
};

const AttendancePanel: React.FC<Props> = ({ log, config, onUpdate, logs, state, isFullWidth }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewedUserId, setViewedUserId] = useState(state.currentUser?.id || '');

  const isAdmin = state.currentUser?.role === 'admin';
  const targetLogs = useMemo(() => {
    if (viewedUserId === state.currentUser?.id) return logs;
    return state.userLogs[viewedUserId] || {};
  }, [viewedUserId, logs, state.userLogs, state.currentUser]);

  const handleTimeIn = () => {
    if (log.timeIn) return;
    const now = new Date();
    onUpdate(prev => ({ 
      ...prev, 
      timeIn: formatTime(now), 
      status: isLate(formatTime(now), config.officeStartTime) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT 
    }));
  };

  const handleTimeOut = () => {
    if (!log.timeIn || log.timeOut) return;
    onUpdate(prev => ({ ...prev, timeOut: formatTime(new Date()) }));
  };

  const handleLeave = () => {
    if (log.timeIn) return;
    onUpdate(prev => ({ ...prev, status: AttendanceStatus.LEAVE }));
  };

  const workingMinutes = log.timeIn && log.timeOut ? diffMinutes(log.timeIn, log.timeOut) : 0;
  
  const getDayStatus = (dayLog?: DayLog): AttendanceStatus => {
    if (dayLog?.status === AttendanceStatus.LEAVE) return AttendanceStatus.LEAVE;
    if (!dayLog || !dayLog.timeIn) return AttendanceStatus.ABSENT;
    if (!dayLog.timeOut) return AttendanceStatus.INCOMPLETE;
    const mins = diffMinutes(dayLog.timeIn, dayLog.timeOut);
    if (mins < 240) return AttendanceStatus.HALFDAY;
    return isLate(dayLog.timeIn, config.officeStartTime) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
  };

  const monthlyStats = useMemo(() => {
    let present = 0, late = 0, leave = 0, half = 0, totalHours = 0;
    (Object.values(targetLogs) as DayLog[]).forEach(l => {
      const d = new Date(l.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const s = getDayStatus(l);
        if (s === AttendanceStatus.PRESENT) present++;
        if (s === AttendanceStatus.LATE) { late++; present++; }
        if (s === AttendanceStatus.LEAVE) leave++;
        if (s === AttendanceStatus.HALFDAY) half++;
        if (l.timeIn && l.timeOut) totalHours += diffMinutes(l.timeIn, l.timeOut);
      }
    });
    return { present, late, leave, half, totalHours };
  }, [targetLogs, currentMonth, currentYear]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(currentYear, currentMonth));

  return (
    <div className={`glass-panel border rounded-[3rem] p-8 backdrop-blur-md shadow-2xl flex flex-col ${isFullWidth ? 'min-h-[85vh]' : 'h-full max-h-full overflow-hidden'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-theme-primary/20 text-theme-primary rounded-[1.2rem] shadow-lg shadow-theme-primary/10">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Shift Control</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-80">Attendance Logging</p>
          </div>
        </div>

        {isAdmin && isFullWidth && (
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <select 
              value={viewedUserId}
              onChange={(e) => setViewedUserId(e.target.value)}
              className="pl-12 pr-6 py-3 bg-slate-950/40 border border-slate-800/50 rounded-2xl text-xs font-black text-white uppercase tracking-widest outline-none transition-all focus:border-theme-primary/50"
            >
              {config.users.map(u => (
                <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
        <DigitalClock />

        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 rounded-3xl border transition-all duration-500 ${log.timeIn ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950/40 border-slate-800/30'}`}>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><LogIn size={12} /> Entry</p>
            <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{log.timeIn || '— : —'}</p>
          </div>
          <div className={`p-5 rounded-3xl border transition-all duration-500 ${log.timeOut ? 'bg-theme-primary/10 border-theme-primary/30' : 'bg-slate-950/40 border-slate-800/30'}`}>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><LogOut size={12} /> Exit</p>
            <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{log.timeOut || '— : —'}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleTimeIn} disabled={!!log.timeIn || log.status === AttendanceStatus.LEAVE} className={`flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${log.timeIn ? 'bg-slate-800/20 text-slate-600 border-transparent' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/20 active:scale-95'}`}>
            <LogIn size={24} strokeWidth={2.5} /> Entry
          </button>
          <button onClick={handleTimeOut} disabled={!log.timeIn || !!log.timeOut} className={`flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${!log.timeIn || log.timeOut ? 'bg-slate-800/20 text-slate-600 border-transparent' : 'bg-theme-primary hover:opacity-90 text-white border-theme-primary/20 active:scale-95'}`}>
            <LogOut size={24} strokeWidth={2.5} /> Exit
          </button>
        </div>

        <div className="bg-slate-950/40 rounded-[2rem] p-6 border border-slate-800/50">
           <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black text-white uppercase tracking-tighter">{monthName}</h4>
              <div className="flex gap-2">
                 <button onClick={() => setCurrentMonth(m => (m === 0 ? 11 : m - 1))} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"><ChevronLeft size={16} /></button>
                 <button onClick={() => setCurrentMonth(m => (m === 11 ? 0 : m + 1))} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"><ChevronRight size={16} /></button>
              </div>
           </div>
           <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-center text-[8px] font-black text-slate-700 py-1">{d}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayLog = targetLogs[dateStr];
                const s = getDayStatus(dayLog);
                const isToday = dateStr === getTodayStr();

                let style = 'bg-slate-900/40 text-slate-600 border-slate-800/40';
                if (s === AttendanceStatus.PRESENT) style = 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30';
                if (s === AttendanceStatus.LATE) style = 'bg-amber-600/20 text-amber-400 border-amber-500/30';
                if (isToday) style += ' ring-2 ring-theme-primary';

                return (
                  <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-[10px] font-black ${style}`}>
                    {day}
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePanel;
