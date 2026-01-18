
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Trash2, 
  Layers,
  Play,
  Pause,
  Timer,
  Check,
  Edit3,
  ShieldAlert,
  Target,
  RotateCcw,
  Circle,
  History,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { DayLog, Task, TaskPriority } from '../types';
import { diffMinutes, formatMinutesToDisplay, getTodayStr } from '../utils/time';

interface Props {
  log: DayLog;
  onUpdate: (updater: (prev: DayLog) => DayLog) => void;
  historicalLogs: Record<string, DayLog>;
  isFullWidth?: boolean;
  userRole?: 'admin' | 'user';
  currentUserId?: string;
}

const TaskPanel: React.FC<Props> = ({ log, onUpdate, historicalLogs, isFullWidth, userRole, currentUserId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    allocHours: '1',
    allocMins: '0',
    priority: 'low' as TaskPriority,
    dueDate: getTodayStr()
  });
  const [showArchive, setShowArchive] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // MASTER TASK AGGREGATOR
  const taskGroups = useMemo(() => {
    const todayStr = getTodayStr();
    const active: Array<{task: Task, sourceDate: string}> = [];
    const archived: Array<{task: Task, sourceDate: string}> = [];
    const seenIds = new Set<string>();

    // 1. Process Today's Log
    log.tasks.forEach(t => {
      if (t.status === 'pending') active.push({ task: t, sourceDate: todayStr });
      else archived.push({ task: t, sourceDate: todayStr });
      seenIds.add(t.id);
    });

    // 2. Process Historical Logs
    Object.keys(historicalLogs).forEach(date => {
      if (date === todayStr) return;
      historicalLogs[date].tasks.forEach(t => {
        if (seenIds.has(t.id)) return;
        if (t.status === 'pending') active.push({ task: t, sourceDate: date });
        else archived.push({ task: t, sourceDate: date });
        seenIds.add(t.id);
      });
    });

    return {
      active: active.sort((a, b) => b.task.createdAt - a.task.createdAt),
      archived: archived.sort((a, b) => b.task.createdAt - a.task.createdAt)
    };
  }, [log, historicalLogs]);

  const addTask = () => {
    if (!formData.title) return;
    const totalAllocated = (parseInt(formData.allocHours) || 0) * 60 + (parseInt(formData.allocMins) || 0);
    if (totalAllocated <= 0) {
        alert("Configuration Error: Allocation time is required.");
        return;
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      description: formData.description,
      duration: totalAllocated,
      actualDuration: 0,
      status: 'pending',
      timerStartedAt: undefined, 
      createdAt: Date.now(),
      updatedAt: Date.now(),
      priority: formData.priority,
      dueDate: formData.dueDate
    };
    onUpdate(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    setFormData({ 
      title: '', 
      description: '', 
      allocHours: '1', 
      allocMins: '0', 
      priority: 'low',
      dueDate: getTodayStr() 
    });
  };

  const updateTaskStatus = (id: string, sourceDate: string, updater: (t: Task) => Task) => {
    const todayStr = getTodayStr();
    
    // If updating a task from TODAY
    if (sourceDate === todayStr) {
      onUpdate(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === id ? updater(t) : t)
      }));
    } else {
      // If updating a task from the BACKLOG (historical)
      // We move it to TODAY's log so it appears in the current performance metrics
      onUpdate(prev => {
        const historicalTask = taskGroups.active.find(g => g.task.id === id)?.task;
        if (!historicalTask) return prev;
        
        const updated = updater(historicalTask);
        return {
          ...prev,
          tasks: [updated, ...prev.tasks]
        };
      });
    }
  };

  const startTask = (id: string, date: string) => updateTaskStatus(id, date, t => ({ ...t, timerStartedAt: Date.now(), updatedAt: Date.now() }));
  
  const pauseTask = (id: string, date: string) => updateTaskStatus(id, date, t => {
    if (t.timerStartedAt) {
      const elapsed = Math.floor((Date.now() - t.timerStartedAt) / 60000);
      return { ...t, actualDuration: t.actualDuration + elapsed, timerStartedAt: undefined, updatedAt: Date.now() };
    }
    return t;
  });

  const completeTask = (id: string, date: string) => updateTaskStatus(id, date, t => {
    let finalActual = t.actualDuration;
    if (t.timerStartedAt) {
      finalActual += Math.floor((Date.now() - t.timerStartedAt) / 60000);
    }
    return { ...t, status: 'completed', actualDuration: finalActual, timerStartedAt: undefined, updatedAt: Date.now() };
  });

  const resumeTask = (id: string, date: string) => updateTaskStatus(id, date, t => ({ ...t, status: 'pending', timerStartedAt: undefined, updatedAt: Date.now() }));

  const removeTask = (id: string, date: string) => {
    if (userRole === 'user') {
      const taskObj = taskGroups.active.find(g => g.task.id === id)?.task || taskGroups.archived.find(g => g.task.id === id)?.task;
      if (taskObj?.assignedBy && taskObj.assignedBy !== currentUserId) {
        alert("Policy Restriction: Administrator-assigned tasks cannot be removed.");
        return;
      }
    }
    onUpdate(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  };

  const priorityMeta = {
    low: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20' },
    high: { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-500/20' }
  };

  const renderTask = (task: Task, sourceDate: string) => {
    const isRunning = !!task.timerStartedAt;
    const liveMinutes = isRunning ? Math.floor((Date.now() - task.timerStartedAt!) / 60000) : 0;
    const currentTotal = task.actualDuration + liveMinutes;
    const progress = Math.min(100, Math.round((currentTotal / task.duration) * 100)) || 0;
    const isCompleted = task.status === 'completed';
    const isAdmin = task.assignedBy && task.assignedBy !== currentUserId;
    const meta = priorityMeta[task.priority || 'low'];
    const isHistorical = sourceDate !== getTodayStr();

    return (
      <div key={task.id} className={`group flex flex-col md:flex-row items-center gap-3 p-3 border rounded-2xl transition-all duration-200 ${isCompleted ? 'bg-slate-900/20 border-slate-800/40 opacity-70' : isRunning ? 'bg-theme-primary/10 border-theme-primary/30 shadow-lg shadow-theme-primary/5' : 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700'}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
          <div className={`p-2 rounded-lg shrink-0 transition-all ${isCompleted ? 'text-emerald-500' : isRunning ? 'text-theme-primary animate-pulse' : 'text-slate-600'}`}>
            {isCompleted ? <Check size={14} strokeWidth={3} /> : isRunning ? <Timer size={14} /> : <Circle size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`text-xs font-bold truncate tracking-tight ${isCompleted ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{task.title}</h4>
              {isAdmin && <ShieldAlert size={10} className="text-theme-primary shrink-0" />}
              {isHistorical && !isCompleted && (
                <span className="text-[7px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">Backlog</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
               <span className={`text-[8px] font-black uppercase tracking-tighter ${meta.color}`}>{task.priority}</span>
               <span className="text-[8px] text-slate-600 font-bold uppercase">• {isHistorical ? `Created ${sourceDate}` : 'Today'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 px-2 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800/50 pt-2 md:pt-0">
          <div className="flex flex-col items-end">
            <span className={`text-[11px] font-black tabular-nums ${isCompleted ? 'text-emerald-500' : 'text-theme-primary'}`}>
              {progress}%
            </span>
            <span className="text-[7px] text-slate-600 uppercase font-black tracking-widest">Progress</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">{formatMinutesToDisplay(currentTotal)}</span>
            <span className="text-[7px] text-slate-600 uppercase font-black tracking-widest">Incurred</span>
          </div>

          <div className="flex items-center gap-1">
            {!isCompleted ? (
              <>
                {!isRunning ? (
                  <button onClick={() => startTask(task.id, sourceDate)} className="p-2 bg-theme-primary/10 text-theme-primary rounded-lg hover:bg-theme-primary hover:text-white transition-all"><Play size={12} fill="currentColor" /></button>
                ) : (
                  <button onClick={() => pauseTask(task.id, sourceDate)} className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"><Pause size={12} fill="currentColor" /></button>
                )}
                <button onClick={() => completeTask(task.id, sourceDate)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all" title="Complete Module"><Check size={12} strokeWidth={3} /></button>
              </>
            ) : (
              <button onClick={() => resumeTask(task.id, sourceDate)} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-all"><RotateCcw size={12} /></button>
            )}
            <button onClick={() => removeTask(task.id, sourceDate)} className="p-2 text-slate-600 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100 hidden md:block"><Trash2 size={12} /></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`glass-panel border rounded-[2rem] p-4 md:p-6 backdrop-blur-md shadow-2xl flex flex-col ${isFullWidth ? 'min-h-[85vh]' : 'h-full max-h-full overflow-hidden'}`}>
      <div className="flex items-center justify-between mb-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-theme-primary/20 text-theme-primary rounded-xl">
            <CheckSquare size={18} strokeWidth={2.5} />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Master Task Hub</h3>
        </div>
        <button 
          onClick={() => setShowArchive(!showArchive)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${showArchive ? 'bg-theme-primary text-white' : 'bg-slate-950/60 text-slate-500 border border-slate-800'}`}
        >
          {showArchive ? <EyeOff size={12}/> : <History size={12}/>}
          {showArchive ? 'Hide Archive' : 'View All History'}
        </button>
      </div>

      <div className="mb-4 p-3 glass-card rounded-2xl border-slate-800/50 shrink-0 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <input type="text" placeholder="New Objective..." className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-theme-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <div className="flex gap-2">
             <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2">
                <input type="number" min="0" value={formData.allocHours} onChange={e => setFormData({...formData, allocHours: e.target.value})} className="w-8 bg-transparent text-[10px] text-white text-center outline-none" placeholder="H" />
                <span className="text-slate-600 text-[10px]">:</span>
                <input type="number" min="0" max="59" value={formData.allocMins} onChange={e => setFormData({...formData, allocMins: e.target.value})} className="w-8 bg-transparent text-[10px] text-white text-center outline-none" placeholder="M" />
             </div>
             <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as TaskPriority})} className="bg-slate-950 border border-slate-800 rounded-xl px-2 text-[10px] font-black text-slate-400 uppercase outline-none">
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
             </select>
             <button onClick={addTask} className="bg-theme-primary px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all">Deploy</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        {/* ACTIVE SECTION */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3 px-2 flex items-center gap-2">
            <Target size={12} className="text-theme-primary" /> Current Objectives
          </p>
          {taskGroups.active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-700 opacity-20">
              <Layers size={32} className="mb-2" />
              <p className="text-[9px] font-black uppercase tracking-[0.2em]">All Systems Clear</p>
            </div>
          ) : (
            taskGroups.active.map(g => renderTask(g.task, g.sourceDate))
          )}
        </div>

        {/* ARCHIVE SECTION */}
        {showArchive && (
          <div className="space-y-2 pt-4 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-500">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3 px-2 flex items-center gap-2">
              <History size={12} /> Verified Output (Historical)
            </p>
            {taskGroups.archived.length === 0 ? (
              <p className="text-center text-[9px] text-slate-700 uppercase font-black py-4">No archived data</p>
            ) : (
              taskGroups.archived.map(g => renderTask(g.task, g.sourceDate))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskPanel;
