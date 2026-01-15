
import React, { useState, useMemo } from 'react';
import { Clock, LogIn, LogOut, AlertCircle, Edit2, Save, Calendar as CalendarIcon, ChevronLeft, ChevronRight, User } from 'lucide-react';
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

const AttendancePanel: React.FC<Props> = ({ log, config, onUpdate, logs, state, isFullWidth }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(isFullWidth);
  const [editIn, setEditIn] = useState(log.timeIn || '');
  const [editOut, setEditOut] = useState(log.timeOut || '');
  
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
    onUpdate(prev => ({ ...prev, timeIn: formatTime(new Date()), status: AttendanceStatus.PRESENT }));
  };

  const handleTimeOut = () => {
    if (!log.timeIn || log.timeOut) return;
    onUpdate(prev => ({ ...prev, timeOut: formatTime(new Date()) }));
  };

  const setStatus = (s: AttendanceStatus) => {
    onUpdate(prev => ({ ...prev, status: s }));
  };

  const handleSaveEdit = () => {
    onUpdate(prev => ({ ...prev, timeIn: editIn || undefined, timeOut: editOut || undefined }));
    setIsEditing(false);
  };

  const workingMinutes = log.timeIn && log.timeOut ? diffMinutes(log.timeIn, log.timeOut) : 0;
  const late = log.timeIn ? isLate(log.timeIn, config.officeStartTime) : false;

  const getDayStatus = (dayLog?: DayLog): AttendanceStatus => {
    if (dayLog?.status === AttendanceStatus.LEAVE) return AttendanceStatus.LEAVE;
    if (!dayLog || !dayLog.timeIn) return AttendanceStatus.ABSENT;
    if (!dayLog.timeOut) return AttendanceStatus.INCOMPLETE;
    const mins = diffMinutes(dayLog.timeIn, dayLog.timeOut);
    if (mins < 240) return AttendanceStatus.HALFDAY;
    return isLate(dayLog.timeIn, config.officeStartTime) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
  };

  const status = getDayStatus(log);

  // Calendar logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(currentYear, currentMonth));

  const changeMonth = (offset: number) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    if (newMonth > 11) { newMonth = 0; newYear += 1; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  return (
    <div className={`app-card border rounded-3xl p-4 md:p-6 backdrop-blur-sm shadow-xl flex flex-col ${isFullWidth ? 'min-h-[80vh]' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Attendance Vault</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Monthly Record Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && isFullWidth && (
            <div className="relative mr-2">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <select 
                value={viewedUserId}
                onChange={(e) => setViewedUserId(e.target.value)}
                className="pl-8 pr-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none"
              >
                {config.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          {!isFullWidth && (
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className={`p-2 rounded-lg transition-colors ${showCalendar ? 'bg-theme-primary text-white' : 'text-slate-500 hover:text-theme-primary'}`}
            >
              <CalendarIcon size={16} />
            </button>
          )}
          {!isEditing && viewedUserId === state.currentUser?.id && (
            <button 
              onClick={() => { setEditIn(log.timeIn || ''); setEditOut(log.timeOut || ''); setIsEditing(true); }}
              className="p-2 text-slate-500 hover:text-theme-primary transition-colors"
            >
              <Edit2 size={16} />
            </button>
          )}
          {isEditing && (
            <button 
              onClick={handleSaveEdit}
              className="p-2 text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              <Save size={18} />
            </button>
          )}
        </div>
      </div>

      {!showCalendar ? (
        <div className="flex-1 space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${log.timeIn ? 'bg-black/20 border-emerald-500/30 shadow-inner' : 'bg-black/5 border-slate-800/20'}`}>
              <p className="text-[9px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em] flex items-center gap-1.5">
                <LogIn size={10} className="text-emerald-500" /> Secure Entry
              </p>
              {isEditing ? (
                <input 
                  type="time" 
                  value={editIn}
                  onChange={(e) => setEditIn(e.target.value)}
                  className="bg-transparent text-xl font-black text-white outline-none w-full"
                />
              ) : (
                <p className="text-2xl font-black text-white tabular-nums">
                  {log.timeIn || '--:--'}
                </p>
              )}
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${log.timeOut ? 'bg-black/20 border-theme-primary/30 shadow-inner' : 'bg-black/5 border-slate-800/20'}`}>
              <p className="text-[9px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em] flex items-center gap-1.5">
                <LogOut size={10} className="text-theme-primary" /> Session Exit
              </p>
              {isEditing ? (
                <input 
                  type="time" 
                  value={editOut}
                  onChange={(e) => setEditOut(e.target.value)}
                  className="bg-transparent text-xl font-black text-white outline-none w-full"
                />
              ) : (
                <p className="text-2xl font-black text-white tabular-nums">
                  {log.timeOut || '--:--'}
                </p>
              )}
            </div>
          </div>

          {viewedUserId === state.currentUser?.id && !isEditing && (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={handleTimeIn} disabled={!!log.timeIn} className={`py-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 ${log.timeIn ? 'bg-slate-800/10 text-slate-600' : 'bg-emerald-600 text-white active:scale-95 transition-all shadow-lg'}`}>
                <LogIn size={18} /> Clock In
              </button>
              <button onClick={handleTimeOut} disabled={!log.timeIn || !!log.timeOut} className={`py-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 ${!log.timeIn || log.timeOut ? 'bg-slate-800/10 text-slate-600' : 'bg-indigo-600 text-white active:scale-95 transition-all shadow-lg'}`}>
                <LogOut size={18} /> Clock Out
              </button>
              <button onClick={() => setStatus(AttendanceStatus.LEAVE)} disabled={!!log.timeIn || log.status === AttendanceStatus.LEAVE} className={`py-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 ${log.timeIn || log.status === AttendanceStatus.LEAVE ? 'bg-slate-800/10 text-slate-600' : 'bg-rose-600 text-white active:scale-95 transition-all shadow-lg'}`}>
                <CalendarIcon size={18} /> Take Leave
              </button>
            </div>
          )}

          <div className="p-5 bg-slate-950/40 rounded-3xl border border-slate-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Status</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                status === AttendanceStatus.PRESENT ? 'bg-emerald-500/10 text-emerald-400' :
                status === AttendanceStatus.LATE ? 'bg-amber-500/10 text-amber-400' :
                status === AttendanceStatus.LEAVE ? 'bg-rose-500/10 text-rose-400' :
                status === AttendanceStatus.ABSENT ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sync Time</span>
              <span className="text-xs font-black text-white">{workingMinutes > 0 ? formatMinutesToDisplay(workingMinutes) : '0h 0m'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 animate-in slide-in-from-right-4 duration-500 overflow-hidden">
           <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">{monthName} {currentYear}</h4>
              <div className="flex gap-1">
                 <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><ChevronLeft size={16} /></button>
                 <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><ChevronRight size={16} /></button>
              </div>
           </div>
           
           <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-center text-[8px] md:text-[10px] font-black text-slate-600 uppercase py-2">{d}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayLog = targetLogs[dateStr];
                const dayStatus = getDayStatus(dayLog);
                const isToday = dateStr === getTodayStr();
                
                let styleClass = 'bg-slate-800/10 text-slate-700 border-slate-800/10';
                if (dayStatus === AttendanceStatus.PRESENT) styleClass = 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30';
                if (dayStatus === AttendanceStatus.LATE) styleClass = 'bg-amber-600/20 text-amber-400 border-amber-500/30';
                if (dayStatus === AttendanceStatus.LEAVE) styleClass = 'bg-rose-600/20 text-rose-400 border-rose-500/30';
                if (dayStatus === AttendanceStatus.HALFDAY) styleClass = 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30';
                if (isToday) styleClass += ' ring-1 ring-white/20 ring-offset-2 ring-offset-slate-950';

                return (
                  <div 
                    key={day} 
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-[10px] md:text-xs font-black transition-all hover:scale-105 border ${styleClass}`}
                    title={dayLog ? `Status: ${dayStatus}` : 'No Record'}
                  >
                    {day}
                  </div>
                );
              })}
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-8 pt-6 border-t border-slate-800/50">
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Present
              </div>
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div> Late
              </div>
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div> Leave
              </div>
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
                <div className="w-2 h-2 rounded-full bg-slate-700"></div> Absent
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePanel;
