
import React, { useState } from 'react';
import { Clock, LogIn, LogOut, AlertCircle, Edit2, Save } from 'lucide-react';
import { DayLog, AppState, AttendanceStatus } from '../types';
import { formatTime, diffMinutes, formatMinutesToDisplay, isLate } from '../utils/time';

interface Props {
  log: DayLog;
  config: AppState['config'];
  onUpdate: (updater: (prev: DayLog) => DayLog) => void;
  isFullWidth?: boolean;
}

const AttendancePanel: React.FC<Props> = ({ log, config, onUpdate, isFullWidth }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editIn, setEditIn] = useState(log.timeIn || '');
  const [editOut, setEditOut] = useState(log.timeOut || '');

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

  const getStatus = (): AttendanceStatus => {
    if (!log.timeIn) return AttendanceStatus.ABSENT;
    if (!log.timeOut) return AttendanceStatus.INCOMPLETE;
    const mins = diffMinutes(log.timeIn, log.timeOut);
    if (mins < 240) return AttendanceStatus.HALFDAY;
    return isLate(log.timeIn, config.officeStartTime) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
  };

  const status = getStatus();

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col ${isFullWidth ? 'h-full' : ''}`}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Clock size={20} />
          </div>
          Attendance
        </h3>
        {!isEditing ? (
          <button 
            onClick={() => { setEditIn(log.timeIn || ''); setEditOut(log.timeOut || ''); setIsEditing(true); }}
            className="p-2 text-slate-500 hover:text-white transition-colors"
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

      <div className="flex-1 space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border transition-all ${log.timeIn ? 'bg-slate-800/50 border-emerald-500/30' : 'bg-slate-900 border-slate-800 shadow-inner'}`}>
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <LogIn size={12} className="text-emerald-500" /> Time In
            </p>
            {isEditing ? (
              <input 
                type="time" 
                value={editIn}
                onChange={(e) => setEditIn(e.target.value)}
                className="bg-transparent text-xl font-bold text-white outline-none w-full"
              />
            ) : (
              <p className="text-2xl font-bold text-white tabular-nums">
                {log.timeIn || '--:--'}
              </p>
            )}
            {late && <span className="text-[10px] text-amber-500 font-semibold uppercase mt-1 block">Late Entry</span>}
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${log.timeOut ? 'bg-slate-800/50 border-indigo-500/30' : 'bg-slate-900 border-slate-800 shadow-inner'}`}>
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <LogOut size={12} className="text-indigo-500" /> Time Out
            </p>
            {isEditing ? (
              <input 
                type="time" 
                value={editOut}
                onChange={(e) => setEditOut(e.target.value)}
                className="bg-transparent text-xl font-bold text-white outline-none w-full"
              />
            ) : (
              <p className="text-2xl font-bold text-white tabular-nums">
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
              className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                log.timeIn 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
              }`}
            >
              <LogIn size={18} />
              Clock In
            </button>
            <button
              onClick={handleTimeOut}
              disabled={!log.timeIn || !!log.timeOut}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                !log.timeIn || log.timeOut
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
              }`}
            >
              <LogOut size={18} />
              Clock Out
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Current Status</span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${
              status === AttendanceStatus.PRESENT ? 'bg-emerald-500/10 text-emerald-400' :
              status === AttendanceStatus.LATE ? 'bg-amber-500/10 text-amber-400' :
              status === AttendanceStatus.ABSENT ? 'bg-red-500/10 text-red-400' : 'bg-slate-700/50 text-slate-400'
            }`}>
              {status}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">Working Hours</span>
            <span className="text-sm font-bold text-white">
              {workingMinutes > 0 ? formatMinutesToDisplay(workingMinutes) : '0h 0m'}
            </span>
          </div>
        </div>
      </div>

      {!log.timeIn && (
        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Ready to start? Remember to Clock In to begin tracking your productive hours and attendance status.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendancePanel;
