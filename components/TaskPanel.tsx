
import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Trash2, 
  Copy, 
  Layers,
  Play,
  Pause,
  Timer,
  Check,
  Edit3,
  Calendar,
  ShieldAlert,
  Zap,
  Target,
  ChevronRight,
  Info,
  RotateCcw
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
    startTime: '',
    endTime: '',
    estimated: '60',
    priority: 'low' as TaskPriority,
    dueDate: getTodayStr()
  });
  const [entryMode, setEntryMode] = useState<'picker' | 'estimated'>('estimated');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Task>>({});
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
      startTime: '', 
      endTime: '', 
      estimated: '60', 
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
      alert("Policy Restriction: Administrator-assigned tasks cannot be deleted by standard users.");
      return;
    }
    onUpdate(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  };

  const cloneTask = (task: Task) => {
    const cloned: Task = {
      ...task,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      actualDuration: 0,
      timerStartedAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      assignedBy: undefined 
    };
    onUpdate(prev => ({ ...prev, tasks: [cloned, ...prev.tasks] }));
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditFormData({ ...task });
  };

  const saveEdit = () => {
    if (!editingTaskId || !editFormData.title) return;
    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === editingTaskId ? { ...t, ...editFormData, updatedAt: Date.now() } : t)
    }));
    setEditingTaskId(null);
  };

  const priorityStyles = {
    low: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]',
    high: 'text-rose-400 bg-rose-400/10 border-rose-500/20 shadow-[0_0_15px_-5px_rgba(244,63,94,0.3)]'
  };

  return (
    <div className={`glass-panel border rounded-[2.5rem] md:rounded-[3rem] p-5 md:p-8 backdrop-blur-md shadow-2xl flex flex-col ${isFullWidth ? 'min-h-[85vh]' : 'h-full max-h-full overflow-hidden'}`}>
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-theme-primary/20 text-theme-primary rounded-2xl shadow-xl">
            <CheckSquare size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Activity Board</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-80">Mission Tracking</p>
          </div>
        </div>
      </div>

      {/* Task Entry Section - Fixed Height */}
      <div className="mb-6 p-4 md:p-6 glass-card rounded-[2rem] border-slate-800/50 shrink-0 shadow-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Assign New Objective..." 
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-theme-primary outline-none transition-all placeholder:text-slate-600"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((p) => (
                <button 
                  key={p}
                  type="button"
                  onClick={() => setFormData({...formData, priority: p as TaskPriority})}
                  className={`flex-1 py-3 text-[9px] font-black uppercase rounded-2xl border transition-all ${formData.priority === p ? priorityStyles[p as TaskPriority] + ' border-current scale-105' : 'bg-slate-950/50 border-slate-800/50 text-slate-600 hover:text-slate-400'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button onClick={addTask} className="w-full py-4 bg-theme-primary hover:opacity-90 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl accent-shadow active:scale-[0.98] flex items-center justify-center gap-3">
            <Plus size={18} strokeWidth={3} /> Initialize Objective
          </button>
        </div>
      </div>

      {/* Scrollable Tasks - Fixed Height with custom scrollbar */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 md:pr-2 custom-scrollbar">
        {log.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-700">
            <Layers size={50} className="mb-5 opacity-10 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center px-8">Ready for assignment broadcast.</p>
          </div>
        ) : (
          log.tasks.map(task => {
            const isEditing = editingTaskId === task.id;
            const isRunning = !!task.timerStartedAt;
            const liveMinutes = isRunning ? Math.floor((Date.now() - task.timerStartedAt!) / 60000) : 0;
            const currentTotal = task.actualDuration + liveMinutes;
            const progress = Math.min(100, Math.round((currentTotal / task.duration) * 100)) || 0;
            const isCompleted = task.status === 'completed';
            const isAdminAssigned = task.assignedBy && task.assignedBy !== currentUserId;

            return (
              <div key={task.id} className={`group relative flex flex-col p-5 md:p-6 border rounded-[2rem] transition-all duration-300 shadow-xl ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/10' : isRunning ? 'bg-theme-primary/10 border-theme-primary/40 shadow-theme-primary/10 scale-[1.01]' : 'bg-slate-900/60 border-slate-800/50 hover:border-slate-700'}`}>
                
                {/* Header: Title and Meta */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3.5 rounded-2xl shrink-0 transition-all duration-500 ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : isRunning ? 'bg-theme-primary text-white shadow-lg shadow-theme-primary/20' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                    {isCompleted ? <Check size={20} strokeWidth={3} /> : isRunning ? <Timer size={20} className="animate-spin-slow" /> : <Clock size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                       <div className="flex items-center gap-2">
                         <h4 className={`text-base font-black truncate uppercase tracking-tight ${isCompleted ? 'text-slate-600 line-through' : 'text-white'}`}>{task.title}</h4>
                         {isAdminAssigned && (
                           <ShieldAlert size={14} className="text-theme-primary animate-pulse" />
                         )}
                       </div>
                       <div className="flex items-center gap-2">
                         <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${priorityStyles[task.priority || 'low']}`}>
                           {task.priority || 'low'}
                         </span>
                         <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : isRunning ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                           {isCompleted ? 'Completed' : isRunning ? 'Resumed' : 'Pending'}
                         </span>
                       </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-[11px] text-slate-500 font-medium mb-4 line-clamp-2 leading-relaxed italic opacity-80">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button onClick={() => startEditing(task)} className="p-2 text-slate-500 hover:text-white bg-slate-950/40 rounded-xl transition-all"><Edit3 size={14} /></button>
                      {(!isAdminAssigned || userRole === 'admin') && (
                        <button onClick={() => removeTask(task.id)} className="p-2 text-slate-500 hover:text-rose-400 bg-slate-950/40 rounded-xl transition-all"><Trash2 size={14} /></button>
                      )}
                    </div>
                  )}
                </div>

                {/* Body: Time Stats & Progress Bar */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                   <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Allocated Budget</p>
                      <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                         <Target size={12} className="text-theme-primary" /> {formatMinutesToDisplay(task.duration)}
                      </div>
                   </div>
                   <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Actual Expenditure</p>
                      <div className="flex items-center gap-2 text-xs font-black text-white">
                         <Clock size={12} className="text-indigo-400" /> {formatMinutesToDisplay(currentTotal)}
                      </div>
                   </div>
                </div>

                <div className="relative h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5 mb-6">
                   <div className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-theme-primary shadow-[0_0_10px_var(--primary-glow)]'} ${isRunning ? 'animate-pulse' : ''}`} style={{ width: `${progress}%` }}></div>
                </div>

                {/* Footer: Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div className="flex gap-3 w-full sm:w-auto">
                    {!isCompleted ? (
                      <>
                        {!isRunning ? (
                          <button onClick={() => startTask(task.id)} className="flex-1 sm:flex-none px-6 py-3 bg-theme-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl active:scale-95 shadow-xl shadow-theme-primary/10 flex items-center justify-center gap-2">
                            <Play size={12} fill="currentColor" /> Initiate Work
                          </button>
                        ) : (
                          <button onClick={() => pauseTask(task.id)} className="flex-1 sm:flex-none px-6 py-3 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl active:scale-95 shadow-xl shadow-amber-600/10 flex items-center justify-center gap-2">
                            <Pause size={12} fill="currentColor" /> Suspend Cycle
                          </button>
                        )}
                        <button onClick={() => completeTask(task.id)} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl active:scale-95 shadow-xl shadow-emerald-600/10 flex items-center justify-center gap-2">
                          <Check size={12} strokeWidth={3} /> Finalize Out
                        </button>
                      </>
                    ) : (
                      <button onClick={() => resumeTask(task.id)} className="w-full sm:w-auto px-8 py-3 bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                        <RotateCcw size={12} /> Re-Open Module
                      </button>
                    )}
                  </div>
                  {isRunning && (
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-ping"></span>
                       <span className="text-[9px] font-black text-theme-primary uppercase tracking-widest">Actively Recording Node Output</span>
                    </div>
                  )}
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
