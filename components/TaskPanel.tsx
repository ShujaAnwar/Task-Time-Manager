
import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Trash2, 
  Copy, 
  Layers,
  CheckCircle2,
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  AlertCircle
} from 'lucide-react';
import { DayLog, Task } from '../types';
import { diffMinutes, formatMinutesToDisplay } from '../utils/time';

interface Props {
  log: DayLog;
  onUpdate: (updater: (prev: DayLog) => DayLog) => void;
  historicalLogs: Record<string, DayLog>;
  isFullWidth?: boolean;
}

const TaskPanel: React.FC<Props> = ({ log, onUpdate, historicalLogs, isFullWidth }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [entryMode, setEntryMode] = useState<'picker' | 'estimated'>('estimated');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    estimated: '60'
  });
  
  // Local state to force re-render for live timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const addTask = () => {
    if (!formData.title) return;

    let duration = 0;
    if (entryMode === 'picker' && formData.startTime && formData.endTime) {
      duration = diffMinutes(formData.startTime, formData.endTime);
    } else {
      duration = parseInt(formData.estimated);
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      description: formData.description,
      startTime: entryMode === 'picker' ? formData.startTime : undefined,
      endTime: entryMode === 'picker' ? formData.endTime : undefined,
      duration,
      actualDuration: 0,
      status: 'pending',
      timerStartedAt: undefined, // Don't auto-start, let user click Play
      createdAt: Date.now()
    };

    onUpdate(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));

    setIsAdding(false);
    setFormData({ title: '', description: '', startTime: '', endTime: '', estimated: '60' });
  };

  const startTask = (id: string) => {
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, timerStartedAt: Date.now() } : t)
    }));
  };

  const pauseTask = (id: string) => {
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === id && t.timerStartedAt) {
          const elapsed = Math.floor((Date.now() - t.timerStartedAt) / 60000);
          return { 
            ...t, 
            actualDuration: t.actualDuration + elapsed, 
            timerStartedAt: undefined 
          };
        }
        return t;
      })
    }));
  };

  const completeTask = (id: string) => {
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === id) {
          let finalActual = t.actualDuration;
          if (t.timerStartedAt) {
            finalActual += Math.floor((Date.now() - t.timerStartedAt) / 60000);
          }
          return { 
            ...t, 
            status: 'completed', 
            actualDuration: finalActual,
            timerStartedAt: undefined 
          };
        }
        return t;
      })
    }));
  };

  const resumeTask = (id: string) => {
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, status: 'pending', timerStartedAt: undefined } : t)
    }));
  };

  const removeTask = (id: string) => {
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  const copyYesterdayTasks = () => {
    const dates = Object.keys(historicalLogs).sort();
    const yesterdayStr = dates[dates.length - 2];
    if (yesterdayStr && historicalLogs[yesterdayStr]) {
      const yesterdayTasks = historicalLogs[yesterdayStr].tasks.map(t => ({
        ...t,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        actualDuration: 0,
        timerStartedAt: undefined,
        createdAt: Date.now()
      })) as Task[];
      onUpdate(prev => ({ ...prev, tasks: [...prev.tasks, ...yesterdayTasks] }));
    }
  };

  const totalTaskTime = log.tasks.reduce((sum, t) => sum + t.duration, 0);
  const totalActualTime = log.tasks.reduce((sum, t) => {
    const live = t.timerStartedAt ? Math.floor((Date.now() - t.timerStartedAt) / 60000) : 0;
    return sum + t.actualDuration + live;
  }, 0);

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col ${isFullWidth ? 'h-full' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <CheckSquare size={20} />
          </div>
          Active Workload
        </h3>
        <div className="flex gap-2">
           <button 
            onClick={copyYesterdayTasks}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 border border-slate-700/50 rounded-lg transition-colors"
          >
            <Copy size={14} /> Duplicate
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/10"
          >
            {isAdding ? 'Cancel' : <><Plus size={14} /> New Task</>}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Work Title *" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <textarea 
                placeholder="Context or Notes (Optional)" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none h-20 resize-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button 
                  onClick={() => setEntryMode('estimated')}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all ${entryMode === 'estimated' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Estimation
                </button>
                <button 
                  onClick={() => setEntryMode('picker')}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all ${entryMode === 'picker' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Time Picker
                </button>
              </div>

              {entryMode === 'estimated' ? (
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={formData.estimated}
                  onChange={e => setFormData({...formData, estimated: e.target.value})}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase ml-1">Est. Start</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      value={formData.startTime}
                      onChange={e => setFormData({...formData, startTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase ml-1">Est. End</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      value={formData.endTime}
                      onChange={e => setFormData({...formData, endTime: e.target.value})}
                    />
                  </div>
                </div>
              )}
              <button 
                onClick={addTask}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-[400px] space-y-3 pr-1">
        {log.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-600">
            <Layers size={48} className="mb-4 opacity-20" />
            <p className="text-sm">No tasks assigned for today.</p>
            <p className="text-xs">Add a task to start tracking your incurred time.</p>
          </div>
        ) : (
          log.tasks.map(task => {
            const isRunning = !!task.timerStartedAt;
            const liveMinutes = isRunning ? Math.floor((Date.now() - task.timerStartedAt!) / 60000) : 0;
            const currentTotal = task.actualDuration + liveMinutes;
            const isOverEstimate = currentTotal > task.duration;

            return (
              <div 
                key={task.id} 
                className={`group relative flex flex-col gap-3 p-4 border rounded-2xl transition-all ${
                  task.status === 'completed' 
                  ? 'bg-slate-900/40 border-emerald-500/20 opacity-80' 
                  : isRunning 
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-600/5' 
                    : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    task.status === 'completed' 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : isRunning ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {task.status === 'completed' ? <CheckCircle2 size={18} /> : isRunning ? <Timer size={18} /> : <Clock size={18} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <h4 className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                          Est: {formatMinutesToDisplay(task.duration)}
                        </span>
                        {(task.status === 'completed' || currentTotal > 0) && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                            isOverEstimate ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            Act: {formatMinutesToDisplay(currentTotal)}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-500 mb-2 line-clamp-1 italic">{task.description}</p>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => removeTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 transition-all rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/50 pt-3">
                  <div className="flex items-center gap-2">
                    {task.status === 'pending' ? (
                      <>
                        {!isRunning ? (
                          <button 
                            onClick={() => startTask(task.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
                          >
                            <Play size={12} fill="currentColor" /> Start
                          </button>
                        ) : (
                          <button 
                            onClick={() => pauseTask(task.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded-lg transition-all"
                          >
                            <Pause size={12} fill="currentColor" /> Pause
                          </button>
                        )}
                        <button 
                          onClick={() => completeTask(task.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition-all"
                        >
                          <Square size={12} fill="currentColor" /> Stop & Finish
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => resumeTask(task.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-all border border-slate-700"
                      >
                        <RotateCcw size={12} /> Reassign / Resume
                      </button>
                    )}
                  </div>

                  {isRunning && (
                    <div className="flex items-center gap-2 text-indigo-400">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-tighter">In Progress...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Planned Duration</p>
          <p className="text-xl font-bold text-white tabular-nums">{formatMinutesToDisplay(totalTaskTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Incurred Time</p>
          <p className={`text-xl font-bold tabular-nums ${totalActualTime > totalTaskTime ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatMinutesToDisplay(totalActualTime)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskPanel;
