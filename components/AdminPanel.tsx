
import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Database, 
  Eye, 
  EyeOff, 
  Save, 
  UserPlus, 
  Fingerprint, 
  RefreshCw, 
  CheckCircle2, 
  Link2, 
  DatabaseZap, 
  Download, 
  Upload, 
  Trash2,
  Settings,
  FileJson,
  Radio
} from 'lucide-react';
import { AppState, UserProfile } from '../types';

interface Props {
  state: AppState;
  updateConfig: (newConfig: Partial<AppState['config']>) => void;
  restoreFullState?: (newState: Partial<AppState>) => void;
  triggerManualSync?: () => Promise<void>;
  theme?: 'dark' | 'light';
}

const AdminPanel: React.FC<Props> = ({ state, updateConfig, restoreFullState, triggerManualSync, theme = 'dark' }) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const isDark = theme === 'dark';

  const handleGeneralSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      officeStartTime: generalData.officeStartTime,
      targetWorkingHours: parseInt(generalData.targetWorkingHours),
      sheetUrl: generalData.sheetUrl
    });
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionData.newUserId || !provisionData.newPassword) return;
    
    setIsProvisioning(true);
    const newUser: UserProfile = {
      id: provisionData.newUserId,
      name: provisionData.newUserName || provisionData.newUserId,
      password: provisionData.newPassword,
      role: provisionData.role,
      createdAt: Date.now()
    };

    // Update local state
    updateConfig({ users: [...state.config.users, newUser] });
    
    // Attempt immediate manual sync if URL exists
    // Note: React state updates are async, so triggerManualSync might send previous state
    // But the debounced sync in App.tsx will pick up the new user within 2 seconds.
    if (state.config.sheetUrl && triggerManualSync) {
      setTimeout(async () => {
        await triggerManualSync();
      }, 100);
    }

    setTimeout(() => {
      setIsProvisioning(false);
      setProvisionSuccess(true);
      setProvisionData({ newUserId: '', newUserName: '', newPassword: '', role: 'user' });
      setTimeout(() => setProvisionSuccess(false), 3000);
    }, 500);
  };

  const removeUser = (userId: string) => {
    if (userId === state.currentUser?.id) return alert("Cannot remove active admin session.");
    if (confirm(`Are you sure you want to remove ${userId}?`)) {
      updateConfig({ users: state.config.users.filter(u => u.id !== userId) });
    }
  };

  const handleBackup = () => {
    const backupData = {
      userLogs: state.userLogs,
      config: state.config,
      exportDate: new Date().toISOString(),
      version: "2.0.0"
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task_time_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleManualSync = async () => {
    if (!triggerManualSync) return;
    setIsSyncing(true);
    try {
      await triggerManualSync();
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatus('loading');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.userLogs && parsed.config && restoreFullState) {
          restoreFullState(parsed);
          setRestoreStatus('success');
        } else {
          throw new Error("Invalid backup format");
        }
      } catch (err) {
        console.error("Restore failed:", err);
        setRestoreStatus('error');
      } finally {
        setTimeout(() => setRestoreStatus('idle'), 3000);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* System Config */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2.5 text-white">
              <Settings size={20} className="text-indigo-400" /> System Settings
            </h3>
            {state.config.sheetUrl && (
              <button 
                onClick={handleManualSync}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Radio size={14} />}
                Sync Database
              </button>
            )}
          </div>
          <form onSubmit={handleGeneralSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Google Cloud Node URL</label>
              <div className="relative group">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="url" 
                  value={generalData.sheetUrl}
                  onChange={(e) => setGeneralData({...generalData, sheetUrl: e.target.value})}
                  className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Office Start</label>
                <input 
                  type="time" 
                  value={generalData.officeStartTime}
                  onChange={(e) => setGeneralData({...generalData, officeStartTime: e.target.value})}
                  className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Daily Target (Hrs)</label>
                <input 
                  type="number" 
                  value={generalData.targetWorkingHours}
                  onChange={(e) => setGeneralData({...generalData, targetWorkingHours: e.target.value})}
                  className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs shadow-xl transition-all">
              Save Infrastructure Config
            </button>
          </form>
        </div>

        {/* User Provisioning */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-lg font-bold flex items-center gap-2.5 mb-8 text-white">
            <UserPlus size={20} className="text-emerald-400" /> Provision New Account
          </h3>
          <form onSubmit={handleProvision} className="space-y-4">
            <input 
              placeholder="User ID (Login Username)" 
              required
              value={provisionData.newUserId}
              onChange={e => setProvisionData({...provisionData, newUserId: e.target.value})}
              className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
            />
            <input 
              placeholder="Full Name" 
              value={provisionData.newUserName}
              onChange={e => setProvisionData({...provisionData, newUserName: e.target.value})}
              className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
            />
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                placeholder="Password" 
                required
                value={provisionData.newPassword}
                onChange={e => setProvisionData({...provisionData, newPassword: e.target.value})}
                className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <select 
              value={provisionData.role}
              onChange={e => setProvisionData({...provisionData, role: e.target.value as any})}
              className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
            >
              <option value="user">Standard User</option>
              <option value="admin">System Administrator</option>
            </select>
            <button type="submit" disabled={isProvisioning} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs shadow-xl transition-all">
              {isProvisioning ? <RefreshCw className="animate-spin mx-auto" size={16} /> : 'Create & Sync Identity'}
            </button>
            {provisionSuccess && <p className="text-[10px] text-emerald-400 font-bold text-center uppercase tracking-widest animate-pulse">Account Broadcasted Successfully</p>}
          </form>
        </div>
      </div>

      {/* Backup & Restore Utility */}
      <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md transition-all ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-lg font-bold flex items-center gap-2.5 mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            <Database size={20} />
          </div>
          Data Governance & Backups
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Export your entire environment state including all user logs, configuration profiles, and credentials to a single JSON file for offline storage.
            </p>
            <button 
              onClick={handleBackup}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'}`}
            >
              <Download size={16} /> Backup Global Database
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Restore the system to a previous state using a backup file. <span className="text-red-400 font-bold uppercase tracking-tighter">Action irreversible:</span> This will overwrite current live data.
            </p>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
              />
              <button 
                onClick={handleRestoreClick}
                disabled={restoreStatus === 'loading'}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  restoreStatus === 'success' ? 'bg-emerald-500 text-white' :
                  restoreStatus === 'error' ? 'bg-red-500 text-white' :
                  isDark ? 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200'
                }`}
              >
                {restoreStatus === 'loading' ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                {restoreStatus === 'success' ? 'Database Restored' : restoreStatus === 'error' ? 'Invalid Schema' : 'Upload Restoration File'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Directory */}
      <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-lg font-bold mb-6 text-white">User Directory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.config.users.map(u => (
            <div key={u.id} className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <p className="text-sm font-bold text-white">{u.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{u.id} • {u.role}</p>
              </div>
              <button onClick={() => removeUser(u.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
