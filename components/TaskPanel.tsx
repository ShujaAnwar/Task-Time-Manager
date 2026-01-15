
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
  RotateCcw,
  Timer,
  Check,
  Edit3,
  X,
  Save,
  BarChart4,
  Flag,
  Calendar,
  ShieldAlert
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
    
    // Policy: Users cannot delete tasks assigned by Admin
    if (userRole === 'user' && task.assignedBy && task.assignedBy !== currentUserId) {
      alert("Policy Restriction: Administrator-assigned tasks cannot be deleted by standard users.");
      return;
    }

    onUpdate(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
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
      assignedBy: undefined // Cloning resets assignment origin
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

  const totalTaskTime = log.tasks.reduce((sum, t) => sum + t.duration, 0);
  const totalActualTime = log.tasks.reduce((sum, t) => {
    const live = t.timerStartedAt ? Math.floor((Date.now() - t.timerStartedAt) / 60000) : 0;
    return sum + t.actualDuration + live;
  }, 0);

  const priorityColors = {
    low: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
    high: 'text-rose-400 bg-rose-400/10 border-rose-500/20'
  };

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-3xl p-4 md:p-6 backdrop-blur-sm shadow-xl flex flex-col ${isFullWidth ? 'h-full' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <CheckSquare size={20} />
          </div>
          <span className="hidden sm:inline">Active Workload</span>
          <span className="sm:hidden">Tasks</span>
        </h3>
      </div>

      <div className="mb-6 p-4 bg-slate-800/40 border border-indigo-500/20 rounded-2xl">
        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mb-3">Self-Assigned Task</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Objective Title *" 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((p) => (
                <button 
                  key={p}
                  onClick={() => setFormData({...formData, priority: p as TaskPriority})}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg border transition-all ${formData.priority === p ? priorityColors[p as TaskPriority] : 'bg-slate-950 border-slate-800 text-slate-600'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button onClick={() => setEntryMode('estimated')} className={`flex-1 py-2 text-[9px] uppercase tracking-wider font-black rounded-md transition-all ${entryMode === 'estimated' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Est</button>
              <button onClick={() => setEntryMode('picker')} className={`flex-1 py-2 text-[9px] uppercase tracking-wider font-black rounded-md transition-all ${entryMode === 'picker' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Pick</button>
            </div>
            {entryMode === 'estimated' ? (
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none" value={formData.estimated} onChange={e => setFormData({...formData, estimated: e.target.value})}>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input type="time" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                <input type="time" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
              </div>
            )}
            <button onClick={addTask} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl">Activate Task</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[400px] space-y-4 pr-1">
        {log.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-600">
            <Layers size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">No active modules.</p>
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
              <div key={task.id} className={`group relative flex flex-col gap-3 p-5 border rounded-3xl transition-all duration-300 ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/10' : isRunning ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-slate-800/20 border-slate-800'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-2xl shrink-0 ${isCompleted ? 'bg-emerald-500 text-white' : isRunning ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-950 text-slate-500'}`}>
                    {isCompleted ? <Check size={20} strokeWidth={3} /> : isRunning ? <Timer size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-3 animate-in fade-in">
                        <input value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg">Save</button>
                          <button onClick={() => setEditingTaskId(null)} className="px-4 py-2 bg-slate-800 text-white text-[10px] font-black uppercase rounded-lg">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <h4 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-white'}`}>{task.title}</h4>
                             {isAdminAssigned && <ShieldAlert size={12} className="text-indigo-400" title="Assigned by Administrator" />}
                           </div>
                           <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${priorityColors[task.priority || 'low']}`}>
                             {task.priority || 'low'}
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-tighter mb-3">
                           <div className="flex items-center gap-1"><Clock size={10} /> {formatMinutesToDisplay(task.duration)}</div>
                           {task.dueDate && <div className="flex items-center gap-1 text-rose-400/80"><Calendar size={10} /> Due {task.dueDate}</div>}
                           {isAdminAssigned && <div className="text-indigo-400">ID: {task.assignedBy}</div>}
                        </div>

                        <div className="relative h-1.5 w-full bg-slate-950 rounded-full overflow-hidden shadow-inner">
                           <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditing(task)} className="p-1.5 text-slate-500 hover:text-indigo-400"><Edit3 size={14} /></button>
                      <button onClick={() => cloneTask(task)} className="p-1.5 text-slate-500 hover:text-emerald-400"><Copy size={14} /></button>
                      {(!isAdminAssigned || userRole === 'admin') && (
                        <button onClick={() => removeTask(task.id)} className="p-1.5 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                      )}
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-800/50">
                    <div className="flex gap-2">
                      {!isCompleted ? (
                        <>
                          {!isRunning ? (
                            <button onClick={() => startTask(task.id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg">Start</button>
                          ) : (
                            <button onClick={() => pauseTask(task.id)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg">Pause</button>
                          )}
                          <button onClick={() => completeTask(task.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg">Finish</button>
                        </>
                      ) : (
                        <button onClick={() => resumeTask(task.id)} className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg">Resume</button>
                      )}
                    </div>
                    {isRunning && <span className="text-[8px] font-black text-indigo-400 uppercase animate-pulse">Live</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Planned</p>
          <p className="text-lg font-black text-white">{formatMinutesToDisplay(totalTaskTime)}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Actual Incurred</p>
          <p className={`text-lg font-black ${totalActualTime > totalTaskTime ? 'text-rose-400' : 'text-emerald-400'}`}>{formatMinutesToDisplay(totalActualTime)}</p>
        </div>
      </div>
    </div>
  );
};

export default TaskPanel;
