
import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  User, 
  Database, 
  Eye, 
  EyeOff, 
  UserPlus, 
  RefreshCw, 
  Link2, 
  Download, 
  Upload, 
  Trash2,
  Settings,
  Code,
  Check,
  Radio
} from 'lucide-react';
import { AppState, UserProfile } from '../types';

interface Props {
  state: AppState;
  updateConfig: (newConfig: Partial<AppState['config']>) => void;
  restoreFullState?: (newState: Partial<AppState>) => void;
  triggerManualSync?: (action?: string, extra?: any) => Promise<void>;
  theme?: 'dark' | 'light';
}

const AdminPanel: React.FC<Props> = ({ state, updateConfig, restoreFullState, triggerManualSync, theme = 'dark' }) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showScript, setShowScript] = useState(false);
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
      id: provisionData.newUserId.toUpperCase().replace(/\s/g, '_'),
      name: provisionData.newUserName || provisionData.newUserId,
      password: provisionData.newPassword,
      role: provisionData.role,
      createdAt: Date.now()
    };

    // Update local state
    updateConfig({ users: [...state.config.users, newUser] });
    
    // Create dedicated sheet in centralized database
    if (state.config.sheetUrl && triggerManualSync) {
      await triggerManualSync('PROVISION_USER', { targetUser: newUser });
    }

    setTimeout(() => {
      setIsProvisioning(false);
      setProvisionSuccess(true);
      setProvisionData({ newUserId: '', newUserName: '', newPassword: '', role: 'user' });
      setTimeout(() => setProvisionSuccess(false), 3000);
    }, 1000);
  };

  const removeUser = (userId: string) => {
    if (userId === state.currentUser?.id) return alert("Cannot remove active admin session.");
    if (confirm(`Are you sure you want to remove ${userId}? This will disconnect their access but maintain their dedicated cloud sheet.`)) {
      updateConfig({ users: state.config.users.filter(u => u.id !== userId) });
    }
  };

  const handleBackup = () => {
    const backupData = {
      userLogs: state.userLogs,
      config: state.config,
      exportDate: new Date().toISOString(),
      version: "2.1.0"
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `centralized_db_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatus('loading');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.userLogs && json.config && restoreFullState) {
          restoreFullState(json);
          setRestoreStatus('success');
          setTimeout(() => setRestoreStatus('idle'), 3000);
        } else {
          throw new Error("Invalid schema");
        }
      } catch (err) {
        setRestoreStatus('error');
        setTimeout(() => setRestoreStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleManualSync = async () => {
    if (!triggerManualSync) return;
    setIsSyncing(true);
    try {
      await triggerManualSync('FULL_DIRECTORY_SYNC');
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const GAS_TEMPLATE = `
/**
 * GOOGLE APPS SCRIPT BACKEND v4 (Centralized Per-User Sync)
 * Deploy as Web App with "Execute as me" and "Access: Anyone".
 */
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = data.action;

  // Provisioning: Create a dedicated sheet for the user
  if (action === "PROVISION_USER") {
    var targetId = data.targetUser.id;
    var sheetName = "USER_DATA_" + targetId;
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (sheet.getLastColumn() === 0) {
      sheet.appendRow(["Key", "Blob", "Modified"]);
    }
    // Update global user directory
    updateSystemConfig(ss, data.config);
  }

  // Data Sync: Store logs in the dedicated user sheet
  if (action === "SYNC_DATA" || action === "MANUAL_SYNC") {
    var userId = data.userId;
    var userSheet = ss.getSheetByName("USER_DATA_" + userId) || ss.insertSheet("USER_DATA_" + userId);
    var logs = data.userLogs[userId] || {};
    upsertValue(userSheet, "STATE_BLOB", JSON.stringify(logs));
    
    if (data.role === "admin") {
      updateSystemConfig(ss, data.config);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userId = e.parameter.userId;
  var role = e.parameter.role;
  var config = getSystemConfig(ss);
  var userLogs = {};

  // Fetch data from dedicated user tab
  if (userId) {
    var userSheet = ss.getSheetByName("USER_DATA_" + userId);
    if (userSheet) {
      var blob = getValue(userSheet, "STATE_BLOB");
      if (blob) userLogs[userId] = JSON.parse(blob);
    }
  }

  // Admin gets global snapshot by aggregating all user tabs
  if (role === "admin") {
    var sheets = ss.getSheets();
    sheets.forEach(function(s) {
      var name = s.getName();
      if (name.indexOf("USER_DATA_") === 0) {
        var uId = name.replace("USER_DATA_", "");
        if (uId !== userId) {
          var blob = getValue(s, "STATE_BLOB");
          if (blob) userLogs[uId] = JSON.parse(blob);
        }
      }
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    config: config, 
    userLogs: userLogs 
  })).setMimeType(ContentService.MimeType.JSON);
}

// Low-level DB helpers
function updateSystemConfig(ss, config) {
  var sheet = ss.getSheetByName("GLOBAL_DB") || ss.insertSheet("GLOBAL_DB");
  upsertValue(sheet, "SYS_CONFIG", JSON.stringify(config));
}
function getSystemConfig(ss) {
  var sheet = ss.getSheetByName("GLOBAL_DB");
  if (!sheet) return null;
  var val = getValue(sheet, "SYS_CONFIG");
  return val ? JSON.parse(val) : null;
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
        {/* System & Centralized DB Config */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2.5 text-white">
              <Settings size={20} className="text-indigo-400" /> Database Management
            </h3>
            {state.config.sheetUrl && (
              <button 
                onClick={handleManualSync}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Radio size={14} />}
                Sync All Nodes
              </button>
            )}
          </div>
          <form onSubmit={handleGeneralSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Centralized Database URL</label>
              <div className="relative group">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="url" 
                  value={generalData.sheetUrl}
                  readOnly
                  className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all cursor-not-allowed opacity-60 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest ml-1">Connected to Google Cloud Engine</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Standard Shift Start</label>
                <input 
                  type="time" 
                  value={generalData.officeStartTime}
                  onChange={(e) => setGeneralData({...generalData, officeStartTime: e.target.value})}
                  className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Target Daily Hours</label>
                <input 
                  type="number" 
                  value={generalData.targetWorkingHours}
                  onChange={(e) => setGeneralData({...generalData, targetWorkingHours: e.target.value})}
                  className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs shadow-xl transition-all active:scale-[0.98]">
              Push Configuration to Directory
            </button>
          </form>
        </div>

        {/* Cloud Identity Provisioning */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-lg font-bold flex items-center gap-2.5 mb-8 text-white">
            <UserPlus size={20} className="text-emerald-400" /> Provision Cloud Identity
          </h3>
          <form onSubmit={handleProvision} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Database ID (Username)</label>
              <input 
                placeholder="e.g. JOHN_DOE" 
                required
                value={provisionData.newUserId}
                onChange={e => setProvisionData({...provisionData, newUserId: e.target.value})}
                className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
              />
            </div>
            <input 
              placeholder="Full Legal Name" 
              value={provisionData.newUserName}
              onChange={e => setProvisionData({...provisionData, newUserName: e.target.value})}
              className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}
            />
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                placeholder="Secure Access Key" 
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
              <option value="user">Standard Identity</option>
              <option value="admin">Root Administrator</option>
            </select>
            <button type="submit" disabled={isProvisioning} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs shadow-xl transition-all">
              {isProvisioning ? <RefreshCw className="animate-spin mx-auto" size={16} /> : 'Create Identity & Cloud Sheet'}
            </button>
            {provisionSuccess && (
              <div className="flex items-center justify-center gap-2 text-emerald-400 animate-pulse mt-2">
                <Check size={14} />
                <p className="text-[10px] font-bold uppercase tracking-widest">Dedicated Cloud Node Linked</p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Cloud Script Template Display */}
      <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md transition-all ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2.5 text-white">
            <Code size={20} className="text-indigo-400" /> Cloud Logic Layer (v4)
          </h3>
          <button 
            onClick={() => setShowScript(!showScript)}
            className="text-xs text-indigo-400 font-bold hover:underline"
          >
            {showScript ? 'Minimize Code' : 'View GAS Backend Logic'}
          </button>
        </div>
        
        {showScript ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Ensure your Google Apps Script matches this template to enable per-user isolated sheets and administrative aggregation.</p>
            <pre className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-[10px] font-mono text-indigo-300 overflow-x-auto whitespace-pre">
              {GAS_TEMPLATE}
            </pre>
          </div>
        ) : (
          <p className="text-xs text-slate-500">The application is configured for per-user sheet isolation. Each employee gets their own dedicated data tab in your centralized Google Spreadsheet.</p>
        )}
      </div>

      {/* Data Sovereignty */}
      <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md transition-all ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-lg font-bold flex items-center gap-2.5 mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            <Database size={20} />
          </div>
          Data Sovereignty & Snapshots
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Export a master JSON state for cold storage. This contains all users and historical task logs.</p>
            <button 
              onClick={handleBackup}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'}`}
            >
              <Download size={16} /> Export Master State
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Restore the system from an existing state file. WARNING: Overwrites current local and cloud identity pointers.</p>
            <div className="flex items-center gap-3">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
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
                {restoreStatus === 'success' ? 'Database Restored' : restoreStatus === 'error' ? 'Invalid Schema' : 'Restore from Snapshot'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Monitor */}
      <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-lg font-bold mb-6 text-white">Centralized Identity Directory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.config.users.map(u => (
            <div key={u.id} className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  {u.name}
                  {u.role === 'admin' && <ShieldCheck size={14} className="text-indigo-400" />}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{u.id} • Cloud Sheet Ready</p>
              </div>
              <button onClick={() => removeUser(u.id)} className="p-2 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
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
