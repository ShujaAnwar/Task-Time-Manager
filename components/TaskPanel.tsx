
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
  Target
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

  const totalActualTime = log.tasks.reduce((sum, t) => {
    const live = t.timerStartedAt ? Math.floor((Date.now() - t.timerStartedAt) / 60000) : 0;
    return sum + t.actualDuration + live;
  }, 0);

  const priorityStyles = {
    low: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
    high: 'text-rose-400 bg-rose-400/10 border-rose-500/20 glow-rose'
  };

  return (
    <div className={`glass-panel border rounded-[3rem] p-8 backdrop-blur-md shadow-2xl flex flex-col ${isFullWidth ? 'min-h-[80vh]' : 'h-full'}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-theme-primary/20 text-theme-primary rounded-2xl shadow-xl">
            <CheckSquare size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Active Modules</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-80">Mission Control</p>
          </div>
        </div>
      </div>

      <div className="mb-8 p-6 glass-card rounded-[2.5rem] border-slate-800/50">
        <div className="flex items-center gap-3 mb-6">
           <Zap size={16} className="text-theme-primary" />
           <p className="text-[10px] text-theme-primary font-black uppercase tracking-[0.3em]">Quick Entry Portal</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Objective Identifier *" 
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:border-theme-primary outline-none transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((p) => (
                <button 
                  key={p}
                  type="button"
                  onClick={() => setFormData({...formData, priority: p as TaskPriority})}
                  className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl border transition-all ${formData.priority === p ? priorityStyles[p as TaskPriority] + ' border-current scale-105' : 'bg-slate-950/50 border-slate-800/50 text-slate-600 hover:text-slate-400'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="flex gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
                <button onClick={() => setEntryMode('estimated')} className={`flex-1 py-2 text-[9px] uppercase tracking-[0.2em] font-black rounded-xl transition-all ${entryMode === 'estimated' ? 'bg-theme-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Est</button>
                <button onClick={() => setEntryMode('picker')} className={`flex-1 py-2 text-[9px] uppercase tracking-[0.2em] font-black rounded-xl transition-all ${entryMode === 'picker' ? 'bg-theme-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Pick</button>
             </div>
             {entryMode === 'estimated' ? (
              <select className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3 text-xs text-white outline-none" value={formData.estimated} onChange={e => setFormData({...formData, estimated: e.target.value})}>
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="60">1.0 Hour</option>
                <option value="120">2.0 Hours</option>
                <option value="240">4.0 Hours</option>
              </select>
             ) : (
              <div className="grid grid-cols-2 gap-2">
                <input type="time" className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                <input type="time" className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
              </div>
             )}
          </div>
          <button onClick={addTask} className="w-full py-5 bg-theme-primary hover:opacity-90 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] transition-all shadow-xl accent-shadow active:scale-[0.98] flex items-center justify-center gap-3">
            <Plus size={18} strokeWidth={3} /> Activate New Module
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {log.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-700">
            <Layers size={64} className="mb-6 opacity-10 animate-pulse" />
            <p className="text-xs font-black uppercase tracking-[0.5em] opacity-30">Null Stack Activity</p>
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
              <div key={task.id} className={`group relative flex flex-col gap-4 p-6 border rounded-[2.5rem] transition-all duration-500 float-anim ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/10' : isRunning ? 'bg-theme-primary/10 border-theme-primary/40 shadow-xl scale-[1.02]' : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-2xl shrink-0 transition-all duration-500 ${isCompleted ? 'bg-emerald-500 text-white' : isRunning ? 'bg-theme-primary text-white shadow-[0_0_20px_var(--primary-glow)]' : 'bg-slate-950 text-slate-500'}`}>
                    {isCompleted ? <Check size={22} strokeWidth={3} /> : isRunning ? <Timer size={22} className="animate-spin-slow" /> : <Clock size={22} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-3">
                         <h4 className={`text-base font-black truncate uppercase tracking-tight ${isCompleted ? 'text-slate-600 line-through' : 'text-white'}`}>{task.title}</h4>
                         {isAdminAssigned && (
                           <span title="Administrator Link" className="text-theme-primary">
                             <ShieldAlert size={14} />
                           </span>
                         )}
                       </div>
                       <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${priorityStyles[task.priority || 'low']}`}>
                         {task.priority || 'low'}
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">
                       <div className="flex items-center gap-2"><Target size={12} className="text-theme-primary" /> Budget: {formatMinutesToDisplay(task.duration)}</div>
                       <div className="flex items-center gap-2"><Clock size={12} className="text-indigo-400" /> Spent: {formatMinutesToDisplay(currentTotal)}</div>
                    </div>

                    <div className="relative h-2 w-full bg-slate-950/80 rounded-full overflow-hidden shadow-inner border border-white/5">
                       <div className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-theme-primary'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => startEditing(task)} className="p-2 text-slate-500 hover:text-white bg-slate-950/40 rounded-xl transition-all"><Edit3 size={16} /></button>
                      {(!isAdminAssigned || userRole === 'admin') && (
                        <button onClick={() => removeTask(task.id)} className="p-2 text-slate-500 hover:text-rose-400 bg-slate-950/40 rounded-xl transition-all"><Trash2 size={16} /></button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex gap-3">
                    {!isCompleted ? (
                      <>
                        {!isRunning ? (
                          <button onClick={() => startTask(task.id)} className="px-6 py-2.5 bg-theme-primary hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest rounded-[1.2rem] transition-all shadow-lg active:scale-95">Initiate</button>
                        ) : (
                          <button onClick={() => pauseTask(task.id)} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-[1.2rem] transition-all shadow-lg active:scale-95">Suspend</button>
                        )}
                        <button onClick={() => completeTask(task.id)} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-[1.2rem] transition-all shadow-lg active:scale-95">Finalize</button>
                      </>
                    ) : (
                      <button onClick={() => resumeTask(task.id)} className="px-6 py-2.5 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-[1.2rem] transition-all hover:text-white">Re-Open</button>
                    )}
                  </div>
                  {isRunning && <span className="text-[10px] font-black text-theme-primary uppercase tracking-[0.2em] animate-pulse">Node Syncing...</span>}
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
