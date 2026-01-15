
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
  Clock,
  User,
  Key
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
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UserProfile | null>(null);

  const [taskFilter, setTaskFilter] = useState({
    userId: 'ALL',
    status: 'ALL',
    priority: 'ALL',
    searchTerm: ''
  });

  const [allocHours, setAllocHours] = useState('1');
  const [allocMins, setAllocMins] = useState('0');

  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    startDate: getTodayStr(),
    dueDate: getTodayStr(),
    dueTime: '18:00',
    priority: 'medium' as TaskPriority,
    selectedUserIds: [] as string[]
  });

  const [provisionData, setProvisionData] = useState({
    newUserId: '',
    newUserName: '',
    newPassword: '',
    role: 'user' as 'admin' | 'user',
    status: 'active' as 'active' | 'inactive'
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

  const handleTaskAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAllocated = (parseInt(allocHours) || 0) * 60 + (parseInt(allocMins) || 0);
    
    if (!taskData.title) {
        alert("Policy Violation: Task Title is mandatory.");
        return;
    }
    if (taskData.selectedUserIds.length === 0) {
        alert("Network Error: No target nodes selected for broadcast.");
        return;
    }
    if (totalAllocated <= 0) {
        alert("Configuration Error: Allocation time must be greater than zero.");
        return;
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: taskData.title,
      description: taskData.description,
      duration: totalAllocated,
      actualDuration: 0,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      dueTime: taskData.dueTime,
      assignedBy: state.currentUser?.id
    };

    if (onAssignTask) {
        onAssignTask(taskData.selectedUserIds, taskData.startDate, newTask);
        setTaskData({
          ...taskData,
          title: '',
          description: '',
          selectedUserIds: []
        });
        setAllocHours('1');
        setAllocMins('0');
        alert("Broadcast Success: Work module deployed to nodes.");
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionData.newUserId || !provisionData.newPassword) {
      alert("Validation Error: User ID and Password are required.");
      return;
    }
    
    setIsProvisioning(true);
    const newUser: UserProfile = {
      id: provisionData.newUserId.toUpperCase().replace(/\s/g, '_'),
      name: provisionData.newUserName || provisionData.newUserId,
      password: provisionData.newPassword,
      role: provisionData.role,
      status: provisionData.status,
      createdAt: Date.now()
    };

    // Check for collision
    if (state.config.users.some(u => u.id === newUser.id)) {
      alert("Conflict Error: User ID already exists in the local directory.");
      setIsProvisioning(false);
      return;
    }

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
        alert("Sync Error: Failed to provision user to cloud database.");
      }
    } else {
      updateConfig({ users: updatedUsers });
      setProvisionSuccess(true);
    }

    setIsProvisioning(false);
    setProvisionData({ newUserId: '', newUserName: '', newPassword: '', role: 'user', status: 'active' });
    setTimeout(() => setProvisionSuccess(false), 5000);
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
      {/* Task Distribution Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
                  <input required value={taskData.title} onChange={e => setTaskData({...taskData, title: e.target.value})} placeholder="Enter objective title..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Technical Description</label>
                  <textarea value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} placeholder="Provide detailed instructions..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 h-32 resize-none" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Target Nodes ({taskData.selectedUserIds.length} Selected)</label>
                  <div className="max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-2 custom-scrollbar">
                    {state.config.users.map(u => (
                      <label key={u.id} className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${taskData.selectedUserIds.includes(u.id) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
                        <input type="checkbox" checked={taskData.selectedUserIds.includes(u.id)} onChange={() => {
                          const newIds = taskData.selectedUserIds.includes(u.id) ? taskData.selectedUserIds.filter(id => id !== u.id) : [...taskData.selectedUserIds, u.id];
                          setTaskData({...taskData, selectedUserIds: newIds});
                        }} className="sr-only" />
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
                         <button key={p} type="button" onClick={() => setTaskData({...taskData, priority: p as TaskPriority})} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border transition-all ${taskData.priority === p ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{p}</button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Allocation (H : M)</label>
                    <div className="flex gap-2">
                       <input type="number" min="0" max="23" value={allocHours} onChange={e => setAllocHours(e.target.value)} placeholder="Hr" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm text-white text-center" />
                       <input type="number" min="0" max="59" value={allocMins} onChange={e => setAllocMins(e.target.value)} placeholder="Min" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-sm text-white text-center" />
                    </div>
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

        {/* User Provisioning Section */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl">
           <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <UserPlus size={24} className="text-emerald-400" /> User Provisioning
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Create and manage workforce identities</p>
              </div>
           </div>

           <form onSubmit={handleProvision} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">User Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input required value={provisionData.newUserName} onChange={e => setProvisionData({...provisionData, newUserName: e.target.value})} placeholder="e.g. John Doe" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">User ID (Unique Key)</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input required value={provisionData.newUserId} onChange={e => setProvisionData({...provisionData, newUserId: e.target.value})} placeholder="e.g. jdoe_01" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500 uppercase" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Identity Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input required type="password" value={provisionData.newPassword} onChange={e => setProvisionData({...provisionData, newPassword: e.target.value})} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Role</label>
                    <select value={provisionData.role} onChange={e => setProvisionData({...provisionData, role: e.target.value as 'admin'|'user'})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 appearance-none">
                      <option value="user">USER</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Status</label>
                    <select value={provisionData.status} onChange={e => setProvisionData({...provisionData, status: e.target.value as 'active'|'inactive'})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 appearance-none">
                      <option value="active">ACTIVE</option>
                      <option value="inactive">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isProvisioning} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3">
                {isProvisioning ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />} 
                {isProvisioning ? 'Synchronizing with Neural Database...' : 'Finalize Identity Provisioning'}
              </button>

              {provisionSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Success: New node identity deployed to workforce OS.</p>
                </div>
              )}
           </form>
        </div>

        {/* Global Directory List */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl">
           <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Database size={24} className="text-indigo-400" /> Global Directory
                </h3>
              </div>
           </div>

           <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {state.config.users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800 rounded-2xl group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {u.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-tight">{u.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-600 font-black uppercase">{u.id}</span>
                        <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {u.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => removeUser(u.id)} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Operational Board List - Full Width */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl xl:col-span-2">
           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Layers size={24} className="text-indigo-400" /> Operational Task Board
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input placeholder="Search title/user..." value={taskFilter.searchTerm} onChange={e => setTaskFilter({...taskFilter, searchTerm: e.target.value})} className="pl-9 pr-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest outline-none" />
                 </div>
                 <select value={taskFilter.userId} onChange={e => setTaskFilter({...taskFilter, userId: e.target.value})} className="px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest outline-none">
                   <option value="ALL">All Nodes</option>
                   {state.config.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>
              </div>
           </div>

           <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
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
                           <span className="text-indigo-400">{item.uName}</span>
                           <span>{item.date}</span>
                           <span className={item.task.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}>{item.task.status.toUpperCase()}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-white tabular-nums">{formatMinutesToDisplay(item.task.actualDuration)} / {formatMinutesToDisplay(item.task.duration)}</p>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
