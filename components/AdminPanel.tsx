
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
  Flag
} from 'lucide-react';
import { AppState, UserProfile, Task, TaskPriority } from '../types';
import { getTodayStr } from '../utils/time';

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
  const [showScript, setShowScript] = useState(false);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UserProfile | null>(null);

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
    
    // Reset form
    setTaskData({
      ...taskData,
      title: '',
      description: '',
      selectedUserIds: []
    });
    alert("Task assigned successfully!");
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
    if (userId === state.currentUser?.id) return alert("Cannot remove active admin session.");
    if (confirm(`Remove ${userId}? This will disconnect their ID from the master directory.`)) {
      const updatedUsers = state.config.users.filter(u => u.id !== userId);
      updateConfig({ users: updatedUsers });
      if (state.config.sheetUrl && triggerManualSync) {
        triggerManualSync('SYNC_DATA', { config: { ...state.config, users: updatedUsers } });
      }
    }
  };

  const GAS_TEMPLATE = `
/**
 * GOOGLE APPS SCRIPT DATABASE ENGINE v10 (Isolated User Sheets)
 * - GLOBAL_DB: Central configuration and master user list.
 * - [USER_NAME]: Every user gets a sheet named after them.
 */
function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid JSON" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = data.action;
  var role = data.role;
  var userId = data.userId;
  var userName = data.userName;

  // 1. Provision New User Sheet
  if (action === "PROVISION_USER" && data.targetUser) {
    var targetId = data.targetUser.id;
    var targetName = data.targetUser.name;
    var sheetName = targetName + " (" + targetId + ")";
    
    if (!ss.getSheetByName(sheetName)) {
      var newSheet = ss.insertSheet(sheetName);
      newSheet.appendRow(["Key", "Blob", "Last_Modified"]);
      upsertValue(newSheet, "LOG_BLOB", "{}");
    }
  }

  // 2. Global Config Sync
  if (data.config) {
    var dbSheet = ss.getSheetByName("GLOBAL_DB") || ss.insertSheet("GLOBAL_DB");
    upsertValue(dbSheet, "MASTER_CONFIG", JSON.stringify(data.config));
  }

  // 3. User Data Routing (Isolated Sheets)
  if (data.userLogs) {
    if (role === "admin") {
      var users = data.config ? data.config.users : [];
      for (var uId in data.userLogs) {
        var userObj = users.filter(function(u){ return u.id == uId })[0];
        var sName = userObj ? (userObj.name + " (" + userObj.id + ")") : ("USER_" + uId);
        var uSheet = ss.getSheetByName(sName) || ss.insertSheet(sName);
        upsertValue(uSheet, "LOG_BLOB", JSON.stringify(data.userLogs[uId]));
      }
    } else if (userId && userName) {
      var sName = userName + " (" + userId + ")";
      var userSheet = ss.getSheetByName(sName) || ss.insertSheet(sName);
      var logs = data.userLogs[userId] || {};
      upsertValue(userSheet, "LOG_BLOB", JSON.stringify(logs));
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userId = e.parameter.userId;
  var role = e.parameter.role;
  var userName = e.parameter.userName;
  
  var dbSheet = ss.getSheetByName("GLOBAL_DB");
  var configBlob = dbSheet ? getValue(dbSheet, "MASTER_CONFIG") : null;
  var config = configBlob ? JSON.parse(configBlob) : null;
  
  var userLogs = {};
  
  if (role === "admin") {
    var sheets = ss.getSheets();
    sheets.forEach(function(s) {
      var name = s.getName();
      if (name !== "GLOBAL_DB") {
        var blob = getValue(s, "LOG_BLOB");
        if (blob) {
          var idMatch = name.match(/\\(([^)]+)\\)$/);
          var uId = idMatch ? idMatch[1] : name;
          userLogs[uId] = JSON.parse(blob);
        }
      }
    });
  } else if (userId && userName) {
    var sName = userName + " (" + userId + ")";
    var s = ss.getSheetByName(sName);
    if (s) {
      var blob = getValue(s, "LOG_BLOB");
      if (blob) userLogs[userId] = JSON.parse(blob);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ config: config, userLogs: userLogs }))
    .setMimeType(ContentService.MimeType.JSON);
}

function upsertValue(sheet, key, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == key) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 3).setValue(new Date());
      return;
    }
  }
  sheet.appendRow([key, value, new Date()]);
}

function getValue(sheet, key) {
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == key) return data[i][1];
  }
  return null;
}
  `.trim();

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
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Task Title</label>
                  <input 
                    required
                    value={taskData.title}
                    onChange={e => setTaskData({...taskData, title: e.target.value})}
                    placeholder="Enter objective title..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Description & Context</label>
                  <textarea 
                    value={taskData.description}
                    onChange={e => setTaskData({...taskData, description: e.target.value})}
                    placeholder="Provide technical details..."
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
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Target Nodes (Select Multiple)</label>
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
                             (p === 'high' ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/20' : 
                              p === 'medium' ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20' : 
                              'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20') : 
                             'bg-slate-950 border-slate-800 text-slate-500'}`}
                         >
                           {p}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Allocated Minutes</label>
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
                     <Send size={16} /> Broadcast Task to {taskData.selectedUserIds.length} Nodes
                   </button>
                </div>
              </div>
           </form>
        </div>

        {/* Database Configuration */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2.5 text-white">
              <Settings size={20} className="text-indigo-400" /> Database Management
            </h3>
            {state.config.sheetUrl && (
              <button 
                onClick={handleManualSync}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Radio size={14} />}
                Cloud Sync
              </button>
            )}
          </div>
          <form onSubmit={handleGeneralSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Google Apps Script Web App URL</label>
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
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Shift Start Time</label>
                <input 
                  type="time" 
                  value={generalData.officeStartTime}
                  onChange={(e) => setGeneralData({...generalData, officeStartTime: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Target Hours</label>
                <input 
                  type="number" 
                  value={generalData.targetWorkingHours}
                  onChange={(e) => setGeneralData({...generalData, targetWorkingHours: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs shadow-xl transition-all active:scale-[0.98]">
              Link and Initialize Cloud
            </button>
          </form>
        </div>

        {/* User Specific Provisioning */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl">
          <h3 className="text-lg font-bold flex items-center gap-2.5 mb-8 text-white">
            <UserPlus size={20} className="text-emerald-400" /> Create User & Dedicated Sheet
          </h3>
          <form onSubmit={handleProvision} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Unique User ID</label>
                <input 
                  placeholder="ID (e.g. EMP01)" 
                  required
                  value={provisionData.newUserId}
                  onChange={e => setProvisionData({...provisionData, newUserId: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Display Name (Used for Sheet Name)</label>
                <input 
                  placeholder="Full Name" 
                  value={provisionData.newUserName}
                  required
                  onChange={e => setProvisionData({...provisionData, newUserName: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1 relative">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Password</label>
              <input 
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••" 
                required
                value={provisionData.newPassword}
                onChange={e => setProvisionData({...provisionData, newPassword: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all"
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-8 text-slate-500">
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Access Level</label>
              <select 
                value={provisionData.role}
                onChange={e => setProvisionData({...provisionData, role: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="user">Standard (Isolated Sheet)</option>
                <option value="admin">Administrator (Global Access)</option>
              </select>
            </div>
            <button type="submit" disabled={isProvisioning || !state.config.sheetUrl} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs transition-all shadow-xl active:scale-[0.98]">
              {isProvisioning ? <div className="flex items-center justify-center gap-2"><RefreshCw className="animate-spin" size={16} /> Provisioning Cloud Sheet...</div> : 'Provision User & Sheet'}
            </button>
            {provisionSuccess && (
              <div className="flex flex-col items-center justify-center gap-1 text-emerald-400 animate-bounce mt-2">
                <Check size={18} strokeWidth={3} />
                <p className="text-[10px] font-black uppercase tracking-widest">Isolated Storage Provisioned Successfully</p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Directory Management */}
      <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 backdrop-blur-md shadow-2xl">
        <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
          <Database size={20} className="text-indigo-400" /> Organizational Registry
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest font-black text-slate-500">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Node Status</th>
                <th className="px-4 py-3">Access Tier</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {state.config.users.map(u => (
                <tr key={u.id} className="group hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-4">
                    {editingUserId === u.id ? (
                      <input 
                        value={editFormData?.name}
                        onChange={e => setEditFormData({...editFormData!, name: e.target.value})}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                      />
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {state.config.sheetUrl ? 'Sheet Active' : 'Unlinked'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {editingUserId === u.id ? (
                      <select 
                        value={editFormData?.role}
                        onChange={e => setEditFormData({...editFormData!, role: e.target.value as any})}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-tighter ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'}`}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingUserId === u.id ? (
                        <>
                          <button onClick={handleSaveUserEdit} className="p-2 bg-emerald-600/10 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"><SaveIcon size={14} /></button>
                          <button onClick={() => setEditingUserId(null)} className="p-2 bg-slate-800 text-slate-400 rounded-lg"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleStartEdit(u)} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => removeUser(u.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </>
                      )}
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
