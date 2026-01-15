
import React, { useState } from 'react';
import { Clock, LogIn, LogOut, AlertCircle, Edit2, Save, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayLog, AppState, AttendanceStatus } from '../types';
import { formatTime, diffMinutes, formatMinutesToDisplay, isLate } from '../utils/time';

interface Props {
  log: DayLog;
  config: AppState['config'];
  onUpdate: (updater: (prev: DayLog) => DayLog) => void;
  logs: Record<string, DayLog>;
  isFullWidth?: boolean;
}

const AttendancePanel: React.FC<Props> = ({ log, config, onUpdate, logs, isFullWidth }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(isFullWidth);
  const [editIn, setEditIn] = useState(log.timeIn || '');
  const [editOut, setEditOut] = useState(log.timeOut || '');
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const handleTimeIn = () => {
    if (log.timeIn) return;
    onUpdate(prev => ({ ...prev, timeIn: formatTime(new Date()) }));
  };

  const handleTimeOut = () => {
    if (!log.timeIn || log.timeOut) return;
    onUpdate(prev => ({ ...prev, timeOut: formatTime(new Date()) }));
  };

  const handleSaveEdit = () => {
    onUpdate(prev => ({ ...prev, timeIn: editIn || undefined, timeOut: editOut || undefined }));
    setIsEditing(false);
  };

  const workingMinutes = log.timeIn && log.timeOut ? diffMinutes(log.timeIn, log.timeOut) : 0;
  const late = log.timeIn ? isLate(log.timeIn, config.officeStartTime) : false;

  const getDayStatus = (dayLog?: DayLog): AttendanceStatus => {
    if (!dayLog || !dayLog.timeIn) return AttendanceStatus.ABSENT;
    if (dayLog.status === AttendanceStatus.LEAVE) return AttendanceStatus.LEAVE;
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
    <div className={`app-card border rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col ${isFullWidth ? 'min-h-[80vh]' : ''}`}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
            <Clock size={20} />
          </div>
          Attendance
        </h3>
        <div className="flex items-center gap-2">
          {!isFullWidth && (
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className={`p-2 rounded-lg transition-colors ${showCalendar ? 'bg-theme-primary text-white' : 'text-slate-500 hover:text-theme-primary'}`}
            >
              <CalendarIcon size={16} />
            </button>
          )}
          {!isEditing ? (
            <button 
              onClick={() => { setEditIn(log.timeIn || ''); setEditOut(log.timeOut || ''); setIsEditing(true); }}
              className="p-2 text-slate-500 hover:text-theme-primary transition-colors"
            >
              <Edit2 size={16} />
            </button>
          ) : (
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
        <div className="flex-1 space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${log.timeIn ? 'bg-black/10 border-emerald-500/30' : 'bg-black/5 border-slate-800/20 shadow-inner'}`}>
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <LogIn size={12} className="text-emerald-500" /> Time In
              </p>
              {isEditing ? (
                <input 
                  type="time" 
                  value={editIn}
                  onChange={(e) => setEditIn(e.target.value)}
                  className="bg-transparent text-xl font-bold text-current outline-none w-full"
                />
              ) : (
                <p className="text-2xl font-black text-current tabular-nums">
                  {log.timeIn || '--:--'}
                </p>
              )}
              {late && <span className="text-[10px] text-amber-500 font-semibold uppercase mt-1 block">Late Entry</span>}
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${log.timeOut ? 'bg-black/10 border-theme-primary/30' : 'bg-black/5 border-slate-800/20 shadow-inner'}`}>
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <LogOut size={12} className="text-theme-primary" /> Time Out
              </p>
              {isEditing ? (
                <input 
                  type="time" 
                  value={editOut}
                  onChange={(e) => setEditOut(e.target.value)}
                  className="bg-transparent text-xl font-bold text-current outline-none w-full"
                />
              ) : (
                <p className="text-2xl font-black text-current tabular-nums">
                  {log.timeOut || '--:--'}
                </p>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="flex gap-3">
              <button
                onClick={handleTimeIn}
                disabled={!!log.timeIn}
                className={`flex-1 py-4 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center justify-center gap-2 transition-all ${
                  log.timeIn 
                    ? 'bg-slate-800/10 text-slate-500 cursor-not-allowed border border-slate-800/20' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
                }`}
              >
                <LogIn size={20} />
                Clock In
              </button>
              <button
                onClick={handleTimeOut}
                disabled={!log.timeIn || !!log.timeOut}
                className={`flex-1 py-4 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center justify-center gap-2 transition-all ${
                  !log.timeIn || log.timeOut
                    ? 'bg-slate-800/10 text-slate-500 cursor-not-allowed border border-slate-800/20' 
                    : 'bg-theme-primary hover:opacity-90 text-white shadow-lg accent-shadow active:scale-95'
                }`}
              >
                <LogOut size={20} />
                Clock Out
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/20">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Current Status</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                status === AttendanceStatus.PRESENT ? 'bg-emerald-500/10 text-emerald-400' :
                status === AttendanceStatus.LATE ? 'bg-amber-500/10 text-amber-400' :
                status === AttendanceStatus.ABSENT ? 'bg-red-500/10 text-red-400' : 'bg-slate-700/50 text-slate-400'
              }`}>
                {status}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800/20">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Working Hours</span>
              <span className="text-sm font-black text-current">
                {workingMinutes > 0 ? formatMinutesToDisplay(workingMinutes) : '0h 0m'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 animate-in slide-in-from-right-4 duration-500">
           <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">{monthName} {currentYear}</h4>
              <div className="flex gap-2">
                 <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><ChevronLeft size={18} /></button>
                 <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
              </div>
           </div>
           
           <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-center text-[9px] font-black text-slate-600 uppercase py-2">{d}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayLog = logs[dateStr];
                const dayStatus = getDayStatus(dayLog);
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                
                let colorClass = 'bg-slate-800/20 text-slate-700';
                if (dayStatus === AttendanceStatus.PRESENT) colorClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
                if (dayStatus === AttendanceStatus.LATE) colorClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/20';
                if (dayStatus === AttendanceStatus.HALFDAY) colorClass = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20';
                if (dayStatus === AttendanceStatus.LEAVE) colorClass = 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20';
                if (isToday && !dayLog) colorClass = 'bg-theme-primary/10 text-theme-primary border border-theme-primary/30';

                return (
                  <div 
                    key={day} 
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-bold transition-all hover:scale-105 cursor-pointer ${colorClass}`}
                    title={dayLog ? `In: ${dayLog.timeIn || 'N/A'} Out: ${dayLog.timeOut || 'N/A'}` : 'No Record'}
                  >
                    {day}
                  </div>
                );
              })}
           </div>
           
           <div className="grid grid-cols-2 gap-2 mt-6">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                <div className="w-2 h-2 rounded bg-emerald-500"></div> Present
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                <div className="w-2 h-2 rounded bg-amber-500"></div> Late
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                <div className="w-2 h-2 rounded bg-indigo-500"></div> Half Day
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                <div className="w-2 h-2 rounded bg-fuchsia-500"></div> Leave
              </div>
           </div>
        </div>
      )}

      {!log.timeIn && !showCalendar && (
        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">
            System ready. Initiate secure "Clock In" to begin tracking operational output.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendancePanel;
