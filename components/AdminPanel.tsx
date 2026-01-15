
import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Eye, 
  EyeOff, 
  UserPlus, 
  RefreshCw, 
  Settings,
  Check,
  Edit2,
  X,
  Trash2,
  Layers,
  Send,
  Search,
  CheckCircle2,
  User,
  Key,
  ShieldAlert,
  UserCog
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
  const [showProvisionPassword, setShowProvisionPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

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
        setTaskData({ ...taskData, title: '', description: '', selectedUserIds: [] });
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

    if (state.config.users.some(u => u.id === newUser.id)) {
      alert("Conflict Error: User ID already exists.");
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
        alert("Sync Error: Failed to provision user to cloud.");
      }
    } else {
      updateConfig({ users: updatedUsers });
      setProvisionSuccess(true);
    }

    setIsProvisioning(false);
    setProvisionData({ newUserId: '', newUserName: '', newPassword: '', role: 'user', status: 'active' });
    setTimeout(() => setProvisionSuccess(false), 5000);
  };

  const startEditing = (user: UserProfile) => {
    setEditingUser({ ...user });
    setShowEditPassword(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedUsers = state.config.users.map(u => u.id === editingUser.id ? editingUser : u);
    updateConfig({ users: updatedUsers });

    if (state.config.sheetUrl && triggerManualSync) {
      await triggerManualSync('SYNC_DATA', { config: { ...state.config, users: updatedUsers } });
      alert("Identity Update: User credentials synchronized with cloud.");
    }
    setEditingUser(null);
  };

  const removeUser = (userId: string) => {
    if (userId === state.currentUser?.id) return alert("Security Violation: Cannot remove self.");
    if (confirm(`Deprovision node ${userId}? Access will be revoked immediately.`)) {
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
      if (taskFilter.searchTerm) {
        const term = taskFilter.searchTerm.toLowerCase();
        return item.task.title.toLowerCase().includes(term) || item.uName.toLowerCase().includes(term);
      }
      return true;
    }).sort((a, b) => b.task.createdAt - a.task.createdAt);
  }, [state.userLogs, state.config.users, taskFilter]);

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Provisioning & Editing Forms */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl space-y-8">
           
           {!editingUser ? (
             <>
               <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      <UserPlus size={24} className="text-emerald-400" /> Identity Provisioning
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Create new node access credentials</p>
                  </div>
               </div>

               <form onSubmit={handleProvision} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Full Name</label>
                      <input required value={provisionData.newUserName} onChange={e => setProvisionData({...provisionData, newUserName: e.target.value})} placeholder="Full Name" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">User ID</label>
                      <input required value={provisionData.newUserId} onChange={e => setProvisionData({...provisionData, newUserId: e.target.value})} placeholder="USER_ID" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 uppercase" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Password</label>
                      <div className="relative">
                        <input required type={showProvisionPassword ? "text" : "password"} value={provisionData.newPassword} onChange={e => setProvisionData({...provisionData, newPassword: e.target.value})} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-10 py-3 text-sm text-white outline-none focus:border-emerald-500" />
                        <button type="button" onClick={() => setShowProvisionPassword(!showProvisionPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          {showProvisionPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Role</label>
                        <select value={provisionData.role} onChange={e => setProvisionData({...provisionData, role: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none">
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Status</label>
                        <select value={provisionData.status} onChange={e => setProvisionData({...provisionData, status: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none">
                          <option value="active">ACTIVE</option>
                          <option value="inactive">INACTIVE</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={isProvisioning} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                    {isProvisioning ? <RefreshCw className="animate-spin" size={16} /> : <UserPlus size={16} />}
                    Create Identity
                  </button>

                  {provisionSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">User Provisioned Successfully</p>
                    </div>
                  )}
               </form>
             </>
           ) : (
             <>
               <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      <UserCog size={24} className="text-indigo-400" /> Identity Editor
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Modify node: {editingUser.id}</p>
                  </div>
                  <button onClick={() => setEditingUser(null)} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
               </div>

               <form onSubmit={handleSaveEdit} className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Display Name</label>
                    <input required value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Update Password</label>
                      <div className="relative">
                        <input required type={showEditPassword ? "text" : "password"} value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-10 py-3 text-sm text-white outline-none focus:border-indigo-500" />
                        <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                          {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Account Status</label>
                      <select value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none">
                        <option value="active">ACTIVE</option>
                        <option value="inactive">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Check size={16} /> Update Credentials
                  </button>
               </form>
             </>
           )}
        </div>

        {/* Global Directory List */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl h-full flex flex-col">
           <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
             <Database size={24} className="text-indigo-400" /> Global Directory
           </h3>

           <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {state.config.users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800 rounded-2xl group hover:border-slate-600 transition-all">
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditing(u)} className="p-2 text-slate-400 hover:text-indigo-400" title="Edit Identity"><Edit2 size={14} /></button>
                    <button onClick={() => removeUser(u.id)} className="p-2 text-slate-400 hover:text-rose-400" title="Revoke Access"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Task Distribution (Consolidated for layout) */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl xl:col-span-2">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Send size={24} className="text-indigo-400" /> Task Deployment
              </h3>
           </div>
           <form onSubmit={handleTaskAssign} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <input required value={taskData.title} onChange={e => setTaskData({...taskData, title: e.target.value})} placeholder="Objective Title" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" />
                <textarea value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} placeholder="Technical scope..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 h-24 resize-none" />
              </div>
              <div className="space-y-6">
                <div className="max-h-32 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-2 custom-scrollbar">
                  {state.config.users.map(u => (
                    <label key={u.id} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${taskData.selectedUserIds.includes(u.id) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-900/50 border-slate-800'}`}>
                      <input type="checkbox" checked={taskData.selectedUserIds.includes(u.id)} onChange={() => {
                        const newIds = taskData.selectedUserIds.includes(u.id) ? taskData.selectedUserIds.filter(id => id !== u.id) : [...taskData.selectedUserIds, u.id];
                        setTaskData({...taskData, selectedUserIds: newIds});
                      }} className="sr-only" />
                      <span className="text-[10px] font-bold text-white truncate">{u.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-500 uppercase font-black mb-1 block">Allocated Time (H:M)</label>
                    <div className="flex gap-1">
                      <input type="number" min="0" value={allocHours} onChange={e => setAllocHours(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white text-center" />
                      <input type="number" min="0" max="59" value={allocMins} onChange={e => setAllocMins(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white text-center" />
                    </div>
                  </div>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all">Broadcast Task</button>
                </div>
              </div>
           </form>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
