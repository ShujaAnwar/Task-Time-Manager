
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
    <div className={`glass-panel border rounded-[3rem] p-8 backdrop-blur-md shadow-2xl flex flex-col ${isFullWidth ? 'min-h-[80vh]' : 'h-full max-h-full overflow-hidden'}`}>
      <div className="flex items-center justify-between mb-8">
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

      {/* Fixed Entry Area */}
      <div className="mb-6 p-6 glass-card rounded-[2.5rem] border-slate-800/50 shrink-0">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Module Identifier..." 
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:border-theme-primary outline-none transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((p) => (
                <button 
                  key={p}
                  type="button"
                  onClick={() => setFormData({...formData, priority: p as TaskPriority})}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-2xl border transition-all ${formData.priority === p ? priorityStyles[p as TaskPriority] + ' border-current scale-105' : 'bg-slate-950/50 border-slate-800/50 text-slate-600 hover:text-slate-400'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button onClick={addTask} className="w-full py-3 bg-theme-primary hover:opacity-90 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl accent-shadow active:scale-[0.98]">
            Assign Module
          </button>
        </div>
      </div>

      {/* Fixed Height Scrollable Task List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {log.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-700">
            <Layers size={48} className="mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 text-center px-6">System ready for assignment broadcast.</p>
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
              <div key={task.id} className={`group relative flex flex-col gap-4 p-5 border rounded-[2rem] transition-all duration-300 ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/10' : isRunning ? 'bg-theme-primary/10 border-theme-primary/40 shadow-lg' : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 transition-all duration-500 ${isCompleted ? 'bg-emerald-500 text-white' : isRunning ? 'bg-theme-primary text-white' : 'bg-slate-950 text-slate-500'}`}>
                    {isCompleted ? <Check size={18} strokeWidth={3} /> : isRunning ? <Timer size={18} className="animate-spin-slow" /> : <Clock size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                         <h4 className={`text-sm font-black truncate uppercase tracking-tight ${isCompleted ? 'text-slate-600 line-through' : 'text-white'}`}>{task.title}</h4>
                         {isAdminAssigned && (
                           <ShieldAlert size={12} className="text-theme-primary" />
                         )}
                       </div>
                       <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${priorityStyles[task.priority || 'low']}`}>
                         {task.priority || 'low'}
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[8px] text-slate-500 font-black uppercase tracking-widest mb-3">
                       <div className="flex items-center gap-1.5"><Target size={10} className="text-theme-primary" /> {formatMinutesToDisplay(task.duration)}</div>
                       <div className="flex items-center gap-1.5"><Clock size={10} className="text-indigo-400" /> {formatMinutesToDisplay(currentTotal)}</div>
                    </div>

                    <div className="relative h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden shadow-inner border border-white/5">
                       <div className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-theme-primary'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button onClick={() => startEditing(task)} className="p-1.5 text-slate-500 hover:text-white"><Edit3 size={14} /></button>
                      {(!isAdminAssigned || userRole === 'admin') && (
                        <button onClick={() => removeTask(task.id)} className="p-1.5 text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex gap-2">
                    {!isCompleted ? (
                      <>
                        {!isRunning ? (
                          <button onClick={() => startTask(task.id)} className="px-4 py-1.5 bg-theme-primary text-white text-[8px] font-black uppercase rounded-lg active:scale-95">Initiate</button>
                        ) : (
                          <button onClick={() => pauseTask(task.id)} className="px-4 py-1.5 bg-amber-600 text-white text-[8px] font-black uppercase rounded-lg active:scale-95">Suspend</button>
                        )}
                        <button onClick={() => completeTask(task.id)} className="px-4 py-1.5 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-lg active:scale-95">Finalize</button>
                      </>
                    ) : (
                      <button onClick={() => resumeTask(task.id)} className="px-4 py-1.5 bg-slate-800 text-slate-400 text-[8px] font-black uppercase rounded-lg">Re-Open</button>
                    )}
                  </div>
                  {isRunning && <span className="text-[8px] font-black text-theme-primary uppercase animate-pulse">Tracking Active</span>}
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
