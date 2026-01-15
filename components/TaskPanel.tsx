
import React, { useState, useEffect } from 'react';
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
  Circle
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const startTask = (id: string) => {
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, timerStartedAt: Date.now(), updatedAt: Date.now() } : t)
    }));
  };

  const pauseTask = (id: string) => {
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === id && t.timerStartedAt) {
          const elapsed = Math.floor((Date.now() - t.timerStartedAt) / 60000);
          return { ...t, actualDuration: t.actualDuration + elapsed, timerStartedAt: undefined, updatedAt: Date.now() };
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
          // Manual action only - no automatic triggers
          return { ...t, status: 'completed', actualDuration: finalActual, timerStartedAt: undefined, updatedAt: Date.now() };
        }
        return t;
      })
    }));
  };

  const resumeTask = (id: string) => {
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, status: 'pending', timerStartedAt: undefined, updatedAt: Date.now() } : t)
    }));
  };

  const removeTask = (id: string) => {
    const task = log.tasks.find(t => t.id === id);
    if (!task) return;
    if (userRole === 'user' && task.assignedBy && task.assignedBy !== currentUserId) {
      alert("Policy Restriction: Administrator-assigned tasks cannot be removed locally.");
      return;
    }
    onUpdate(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  };

  const priorityMeta = {
    low: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20' },
    high: { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-500/20' }
  };

  return (
    <div className={`glass-panel border rounded-[2rem] p-4 md:p-6 backdrop-blur-md shadow-2xl flex flex-col ${isFullWidth ? 'min-h-[85vh]' : 'h-full max-h-full overflow-hidden'}`}>
      <div className="flex items-center justify-between mb-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-theme-primary/20 text-theme-primary rounded-xl">
            <CheckSquare size={18} strokeWidth={2.5} />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Workload Hub</h3>
        </div>
      </div>

      <div className="mb-4 p-3 glass-card rounded-2xl border-slate-800/50 shrink-0 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <input type="text" placeholder="Task Objective..." className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-theme-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
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
             <button onClick={addTask} className="bg-theme-primary px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all">Assign</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {log.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-700 opacity-20">
            <Layers size={32} className="mb-2" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Deployment Ready</p>
          </div>
        ) : (
          log.tasks.map(task => {
            const isRunning = !!task.timerStartedAt;
            const liveMinutes = isRunning ? Math.floor((Date.now() - task.timerStartedAt!) / 60000) : 0;
            const currentTotal = task.actualDuration + liveMinutes;
            const progress = Math.min(100, Math.round((currentTotal / task.duration) * 100)) || 0;
            const isCompleted = task.status === 'completed';
            const isAdmin = task.assignedBy && task.assignedBy !== currentUserId;
            const meta = priorityMeta[task.priority || 'low'];

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
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className={`text-[8px] font-black uppercase tracking-tighter ${meta.color}`}>{task.priority}</span>
                       <span className="text-[8px] text-slate-600 font-bold uppercase">• {isRunning ? 'In Progress' : isCompleted ? 'Verified' : 'Ready'}</span>
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
                          <button onClick={() => startTask(task.id)} className="p-2 bg-theme-primary/10 text-theme-primary rounded-lg hover:bg-theme-primary hover:text-white transition-all"><Play size={12} fill="currentColor" /></button>
                        ) : (
                          <button onClick={() => pauseTask(task.id)} className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"><Pause size={12} fill="currentColor" /></button>
                        )}
                        <button onClick={() => completeTask(task.id)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all" title="Complete Module"><Check size={12} strokeWidth={3} /></button>
                      </>
                    ) : (
                      <button onClick={() => resumeTask(task.id)} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-all"><RotateCcw size={12} /></button>
                    )}
                    <button onClick={() => removeTask(task.id)} className="p-2 text-slate-600 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100 hidden md:block"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskPanel;
