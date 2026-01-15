
import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Eye, 
  EyeOff, 
  UserPlus, 
  RefreshCw, 
  Link2, 
  Settings,
  Code,
  Check,
  Radio,
  Edit2,
  X,
  Save as SaveIcon,
  Trash2,
  Layers,
  Send,
  Calendar,
  Clock as ClockIcon,
  Flag,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { AppState, UserProfile, Task, TaskPriority, DayLog } from '../types';
import { getTodayStr, formatMinutesToDisplay } from '../utils/time';

interface Props {
  state: AppState;
  updateConfig: (newConfig: Partial<AppState['config']>) => void;
  restoreFullState?: (newState: Partial<AppState>) => void;
  triggerManualSync?: (action?: string, extra?: any) => Promise<void>;
  onAssignTask?: (userIds: string[], date: string, task: Task) => void;
}

const AdminPanel: React.FC<Props> = ({ state, updateConfig, triggerManualSync, onAssignTask }) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UserProfile | null>(null);

  // Global Task Filter State
  const [taskFilter, setTaskFilter] = useState({
    userId: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    searchTerm: ''
  });

  // Task Assignment State
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    startDate: getTodayStr(),
    dueDate: getTodayStr(),
    dueTime: '18:00',
    allocatedTime: '60',
    priority: 'medium' as TaskPriority,
    selectedUserIds: [] as string[]
  });

  const [provisionData, setProvisionData] = useState({
    newUserId: '',
    newUserName: '',
    newPassword: '',
    role: 'user' as 'admin' | 'user'
  });

  const [generalData, setGeneralData] = useState({
    officeStartTime: state.config.officeStartTime,
    targetWorkingHours: state.config.targetWorkingHours.toString(),
    sheetUrl: state.config.sheetUrl || ''
  });

  const handleGeneralSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig = {
      officeStartTime: generalData.officeStartTime,
      targetWorkingHours: parseInt(generalData.targetWorkingHours),
      sheetUrl: generalData.sheetUrl
    };
    updateConfig(updatedConfig);
    
    if (generalData.sheetUrl && triggerManualSync) {
      setIsSyncing(true);
      await triggerManualSync('SYNC_DATA', { config: { ...state.config, ...updatedConfig } });
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!triggerManualSync) return;
    setIsSyncing(true);
    try {
      await triggerManualSync('MANUAL_SYNC');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTaskAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskData.title || taskData.selectedUserIds.length === 0 || !onAssignTask) return;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: taskData.title,
      description: taskData.description,
      duration: parseInt(taskData.allocatedTime),
      actualDuration: 0,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      dueTime: taskData.dueTime,
      assignedBy: state.currentUser?.id
    };

    onAssignTask(taskData.selectedUserIds, taskData.startDate, newTask);
    
    setTaskData({
      ...taskData,
      title: '',
      description: '',
      selectedUserIds: []
    });
    alert("Broadcast Complete: Task assigned to selected nodes.");
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionData.newUserId || !provisionData.newPassword) return;
    
    setIsProvisioning(true);
    const newUser: UserProfile = {
      id: provisionData.newUserId.toUpperCase().replace(/\s/g, '_'),
      name: provisionData.newUserName || provisionData.newUserId,
      password: provisionData.newPassword,
      role: provisionData.role,
      createdAt: Date.now()
    };

    const updatedUsers = [...state.config.users, newUser];
    
    if (state.config.sheetUrl && triggerManualSync) {
      try {
        await triggerManualSync('PROVISION_USER', { 
          targetUser: newUser,
          targetUserName: newUser.name,
          config: { ...state.config, users: updatedUsers } 
        });
        updateConfig({ users: updatedUsers });
        setProvisionSuccess(true);
      } catch (err) {
        console.error("Cloud provisioning failed:", err);
      }
    } else {
      updateConfig({ users: updatedUsers });
      setProvisionSuccess(true);
    }

    setIsProvisioning(false);
    setProvisionData({ newUserId: '', newUserName: '', newPassword: '', role: 'user' });
    setTimeout(() => setProvisionSuccess(false), 5000);
  };

  const handleStartEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditFormData({ ...user });
  };

  const handleSaveUserEdit = async () => {
    if (!editFormData || !editingUserId) return;
    const updatedUsers = state.config.users.map(u => u.id === editingUserId ? editFormData : u);
    updateConfig({ users: updatedUsers });
    if (state.config.sheetUrl && triggerManualSync) {
      await triggerManualSync('SYNC_DATA', { config: { ...state.config, users: updatedUsers } });
    }
    setEditingUserId(null);
    setEditFormData(null);
  };

  const removeUser = (userId: string) => {
    if (userId === state.currentUser?.id) return alert("Security Violation: Cannot remove self-session.");
    if (confirm(`Deprovision node ${userId}? All associated storage access will be revoked.`)) {
      const updatedUsers = state.config.users.filter(u => u.id !== userId);
      updateConfig({ users: updatedUsers });
      if (state.config.sheetUrl && triggerManualSync) {
        triggerManualSync('SYNC_DATA', { config: { ...state.config, users: updatedUsers } });
      }
    }
  };

  // Advanced Global Task List aggregation
  const globalTasks = useMemo(() => {
    const all: Array<{uName: string, uId: string, date: string, task: Task}> = [];
    Object.entries(state.userLogs).forEach(([uId, dates]) => {
      const user = state.config.users.find(u => u.id === uId);
      Object.entries(dates).forEach(([date, log]) => {
        (log as DayLog).tasks.forEach(task => {
          all.push({ uName: user?.name || uId, uId, date, task });
        });
      });
    });

    return all.filter(item => {
      if (taskFilter.userId !== 'ALL' && item.uId !== taskFilter.userId) return false;
      if (taskFilter.status !== 'ALL' && item.task.status !== taskFilter.status) return false;
      if (taskFilter.priority !== 'ALL' && item.task.priority !== taskFilter.priority) return false;
      if (taskFilter.searchTerm) {
        const term = taskFilter.searchTerm.toLowerCase();
        return item.task.title.toLowerCase().includes(term) || item.uName.toLowerCase().includes(term);
      }
      return true;
    }).sort((a, b) => b.task.createdAt - a.task.createdAt);
  }, [state.userLogs, state.config.users, taskFilter]);

  const priorityColors = {
    low: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
    high: 'text-rose-400 bg-rose-400/10 border-rose-500/20'
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Task Assignment Section */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl xl:col-span-2">
           <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Send size={24} className="text-indigo-400" /> Advanced Task Distribution
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Assign work modules to single or multiple nodes</p>
              </div>
           </div>

           <form onSubmit={handleTaskAssign} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Objective Key</label>
                  <input 
                    required
                    value={taskData.title}
                    onChange={e => setTaskData({...taskData, title: e.target.value})}
                    placeholder="Enter objective title..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Technical Description</label>
                  <textarea 
                    value={taskData.description}
                    onChange={e => setTaskData({...taskData, description: e.target.value})}
                    placeholder="Provide detailed instructions..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 h-32 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Due Date</label>
                      <input 
                        type="date"
                        value={taskData.dueDate}
                        onChange={e => setTaskData({...taskData, dueDate: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Due Time</label>
                      <input 
                        type="time"
                        value={taskData.dueTime}
                        onChange={e => setTaskData({...taskData, dueTime: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white"
                      />
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Target Nodes ({taskData.selectedUserIds.length} Selected)</label>
                  <div className="max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-2">
                    {state.config.users.map(u => (
                      <label key={u.id} className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${taskData.selectedUserIds.includes(u.id) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
                        <input 
                          type="checkbox"
                          checked={taskData.selectedUserIds.includes(u.id)}
                          onChange={() => {
                            const newIds = taskData.selectedUserIds.includes(u.id) 
                              ? taskData.selectedUserIds.filter(id => id !== u.id)
                              : [...taskData.selectedUserIds, u.id];
                            setTaskData({...taskData, selectedUserIds: newIds});
                          }}
                          className="sr-only"
                        />
                        <div className={`w-3 h-3 rounded-full border ${taskData.selectedUserIds.includes(u.id) ? 'bg-white border-transparent' : 'border-slate-700'}`}></div>
                        <span className="text-[10px] font-bold text-white truncate">{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Priority Flag</label>
                    <div className="flex gap-2">
                       {['low', 'medium', 'high'].map((p) => (
                         <button 
                           key={p}
                           type="button"
                           onClick={() => setTaskData({...taskData, priority: p as TaskPriority})}
                           className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border transition-all ${taskData.priority === p ? 
                             (p === 'high' ? 'bg-rose-600 border-rose-500 text-white shadow-lg' : 
                              p === 'medium' ? 'bg-amber-600 border-amber-500 text-white shadow-lg' : 
                              'bg-emerald-600 border-emerald-500 text-white shadow-lg') : 
                             'bg-slate-950 border-slate-800 text-slate-500'}`}
                         >
                           {p}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Time Budget (Mins)</label>
                    <input 
                      type="number"
                      value={taskData.allocatedTime}
                      onChange={e => setTaskData({...taskData, allocatedTime: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                   <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3">
                     <Send size={16} /> Deploy Module to Workforce
                   </button>
                </div>
              </div>
           </form>
        </div>

        {/* Global Task Tracker Board */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl xl:col-span-2">
           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Layers size={24} className="text-indigo-400" /> Operational Task Board
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Global workforce task audit and monitoring</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      placeholder="Search title/user..." 
                      value={taskFilter.searchTerm}
                      onChange={e => setTaskFilter({...taskFilter, searchTerm: e.target.value})}
                      className="pl-9 pr-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest outline-none"
                    />
                 </div>
                 <select 
                   value={taskFilter.userId}
                   onChange={e => setTaskFilter({...taskFilter, userId: e.target.value})}
                   className="px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest outline-none"
                 >
                   <option value="ALL">All Nodes</option>
                   {state.config.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>
                 <select 
                   value={taskFilter.priority}
                   onChange={e => setTaskFilter({...taskFilter, priority: e.target.value})}
                   className="px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest outline-none"
                 >
                   <option value="ALL">All Priority</option>
                   <option value="high">High</option>
                   <option value="medium">Medium</option>
                   <option value="low">Low</option>
                 </select>
              </div>
           </div>

           <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
              {globalTasks.length === 0 ? (
                <div className="py-20 text-center text-slate-600 font-black uppercase tracking-widest opacity-30">No matching objectives found.</div>
              ) : (
                globalTasks.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 p-5 border border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-slate-800/20 transition-all">
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                           <h4 className="text-sm font-black text-white truncate">{item.task.title}</h4>
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${priorityColors[item.task.priority]}`}>{item.task.priority}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                           <span className="text-indigo-400">Node: {item.uName}</span>
                           <span>Cycle: {item.date}</span>
                           <span className={item.task.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}>{item.task.status.toUpperCase()}</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className="text-[10px] font-black text-white tabular-nums">{formatMinutesToDisplay(item.task.actualDuration)} / {formatMinutesToDisplay(item.task.duration)}</p>
                           <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest">Actual vs Budget</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="p-2 text-slate-500 hover:text-indigo-400" title="Reassign"><RefreshCw size={14} /></button>
                           <button className="p-2 text-slate-500 hover:text-rose-400" title="Terminate"><Trash2 size={14} /></button>
                        </div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* System Settings */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl">
          <h3 className="text-lg font-bold flex items-center gap-2.5 mb-8 text-white">
            <Settings size={20} className="text-indigo-400" /> Database Management
          </h3>
          <form onSubmit={handleGeneralSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Master Cloud Node URL</label>
              <div className="relative group">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="url" 
                  value={generalData.sheetUrl}
                  onChange={(e) => setGeneralData({...generalData, sheetUrl: e.target.value})}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Shift Start</label>
                <input type="time" value={generalData.officeStartTime} onChange={e => setGeneralData({...generalData, officeStartTime: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Target Hours</label>
                <input type="number" value={generalData.targetWorkingHours} onChange={e => setGeneralData({...generalData, targetWorkingHours: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs shadow-xl transition-all active:scale-[0.98]">Update Core Configuration</button>
          </form>
        </div>

        {/* Provisioning */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl">
          <h3 className="text-lg font-bold flex items-center gap-2.5 mb-8 text-white">
            <UserPlus size={20} className="text-emerald-400" /> Provision Node
          </h3>
          <form onSubmit={handleProvision} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Node ID" required value={provisionData.newUserId} onChange={e => setProvisionData({...provisionData, newUserId: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
              <input placeholder="Display Name" value={provisionData.newUserName} required onChange={e => setProvisionData({...provisionData, newUserName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
            </div>
            <input type={showNewPassword ? "text" : "password"} placeholder="Access Key" required value={provisionData.newPassword} onChange={e => setProvisionData({...provisionData, newPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
            <select value={provisionData.role} onChange={e => setProvisionData({...provisionData, role: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white">
              <option value="user">User Node</option>
              <option value="admin">Administrator Node</option>
            </select>
            <button type="submit" disabled={isProvisioning || !state.config.sheetUrl} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs transition-all shadow-xl active:scale-[0.98]">Provision New Entity</button>
            {provisionSuccess && <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest text-center mt-2 animate-bounce">Provisioning Complete</p>}
          </form>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl">
        <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
          <Database size={20} className="text-indigo-400" /> Organizational Registry
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest font-black text-slate-500">
                <th className="px-4 py-3">Employee Node</th>
                <th className="px-4 py-3">Sync Status</th>
                <th className="px-4 py-3">Access Tier</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {state.config.users.map(u => (
                <tr key={u.id} className="group hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-4">
                    {editingUserId === u.id ? (
                      <input value={editFormData?.name} onChange={e => setEditFormData({...editFormData!, name: e.target.value})} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none" />
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-white">{u.name}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{u.id}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${state.config.sheetUrl ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingUserId === u.id ? (
                        <button onClick={handleSaveUserEdit} className="p-2 text-emerald-400"><SaveIcon size={14} /></button>
                      ) : (
                        <button onClick={() => handleStartEdit(u)} className="p-2 text-slate-500 hover:text-indigo-400"><Edit2 size={14} /></button>
                      )}
                      <button onClick={() => removeUser(u.id)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
