
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
  Radio,
  Edit2,
  X,
  Save as SaveIcon,
  ExternalLink
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
  
  // User Editing State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UserProfile | null>(null);

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

  const handleGeneralSave = async (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      officeStartTime: generalData.officeStartTime,
      targetWorkingHours: parseInt(generalData.targetWorkingHours),
      sheetUrl: generalData.sheetUrl
    });
    
    // Immediately sync the directory to the new URL
    if (generalData.sheetUrl && triggerManualSync) {
      setIsSyncing(true);
      await triggerManualSync('SYNC_DATA', { config: { ...state.config, sheetUrl: generalData.sheetUrl } });
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
    
    // 1. Update local config
    updateConfig({ users: updatedUsers });
    
    // 2. Trigger Cloud Provisioning (Creates the tab)
    if (state.config.sheetUrl && triggerManualSync) {
      try {
        await triggerManualSync('PROVISION_USER', { 
          targetUser: newUser, 
          config: { ...state.config, users: updatedUsers } 
        });
        setProvisionSuccess(true);
      } catch (err) {
        console.error("Cloud provisioning failed:", err);
      }
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
    if (confirm(`Are you sure you want to delete ${userId}? Their identity will be removed from the master directory.`)) {
      const updatedUsers = state.config.users.filter(u => u.id !== userId);
      updateConfig({ users: updatedUsers });
      
      if (state.config.sheetUrl && triggerManualSync) {
        triggerManualSync('SYNC_DATA', { config: { ...state.config, users: updatedUsers } });
      }
    }
  };

  const GAS_TEMPLATE = `
/**
 * GOOGLE APPS SCRIPT DATABASE ENGINE v6 (Master Directory + User Nodes)
 * 1. Open Google Sheet
 * 2. Extensions -> Apps Script
 * 3. Paste this code and click Deploy -> New Deployment
 * 4. Select "Web App", Execute as "Me", Access "Anyone"
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

  // 1. Directory Sync & Provisioning (CREATES THE NEW TAB)
  if (action === "PROVISION_USER") {
    var targetId = data.targetUser.id;
    var sheetName = "USER_DATA_" + targetId;
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (sheet.getLastColumn() === 0) {
      sheet.appendRow(["Key", "Blob", "Last_Modified"]);
    }
  }

  // 2. State Persistence
  if (action === "SYNC_DATA" || action === "PROVISION_USER" || action === "MANUAL_SYNC") {
    // Update Master Directory (The sheet containing User IDs and Passwords)
    if (data.config) {
      var dbSheet = ss.getSheetByName("GLOBAL_DB") || ss.insertSheet("GLOBAL_DB");
      upsertValue(dbSheet, "MASTER_CONFIG", JSON.stringify(data.config));
    }

    // Update individual user data logs if present
    if (data.userLogs && data.userId) {
      var userSheet = ss.getSheetByName("USER_DATA_" + data.userId) || ss.insertSheet("USER_DATA_" + data.userId);
      var logs = data.userLogs[data.userId] || {};
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
  
  // Fetch master directory for authentication and UI
  var dbSheet = ss.getSheetByName("GLOBAL_DB");
  var config = dbSheet ? JSON.parse(getValue(dbSheet, "MASTER_CONFIG")) : null;
  
  var userLogs = {};
  if (userId) {
    var userSheet = ss.getSheetByName("USER_DATA_" + userId);
    if (userSheet) {
      var blob = getValue(userSheet, "LOG_BLOB");
      if (blob) userLogs[userId] = JSON.parse(blob);
    }
  }

  // Admin Aggregator: Collect all user nodes
  if (role === "admin") {
    var sheets = ss.getSheets();
    sheets.forEach(function(s) {
      var name = s.getName();
      if (name.indexOf("USER_DATA_") === 0) {
        var uId = name.replace("USER_DATA_", "");
        if (uId !== userId) {
          var blob = getValue(s, "LOG_BLOB");
          if (blob) userLogs[uId] = JSON.parse(blob);
        }
      }
    });
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
        {/* System & Centralized DB Config */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2.5 text-white">
              <Settings size={20} className="text-indigo-400" /> Cloud Database Configuration
            </h3>
            {state.config.sheetUrl && (
              <button 
                onClick={handleManualSync}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Radio size={14} />}
                Sync Everything
              </button>
            )}
          </div>
          <form onSubmit={handleGeneralSave} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Google Apps Script Web App URL</label>
                <a href="https://script.google.com/" target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400 font-bold hover:underline flex items-center gap-1">
                  Apps Script Console <ExternalLink size={10} />
                </a>
              </div>
              <div className="relative group">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="url" 
                  value={generalData.sheetUrl}
                  onChange={(e) => setGeneralData({...generalData, sheetUrl: e.target.value})}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
              <p className="text-[9px] text-slate-500 mt-2 px-1">Must be deployed as a "Web App" with access set to "Anyone".</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Shift Start Time</label>
                <input 
                  type="time" 
                  value={generalData.officeStartTime}
                  onChange={(e) => setGeneralData({...generalData, officeStartTime: e.target.value})}
                  className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Daily Target (Hours)</label>
                <input 
                  type="number" 
                  value={generalData.targetWorkingHours}
                  onChange={(e) => setGeneralData({...generalData, targetWorkingHours: e.target.value})}
                  className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs shadow-xl transition-all">
              Save & Link Cloud Database
            </button>
          </form>
        </div>

        {/* Provisioning Form */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-lg font-bold flex items-center gap-2.5 mb-8 text-white">
            <UserPlus size={20} className="text-emerald-400" /> Create New Employee Node
          </h3>
          <form onSubmit={handleProvision} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Unique User ID (Login Name)</label>
              <input 
                placeholder="e.g. EM001" 
                required
                value={provisionData.newUserId}
                onChange={e => setProvisionData({...provisionData, newUserId: e.target.value})}
                className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200'}`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Full Legal Name</label>
              <input 
                placeholder="e.g. John Doe" 
                value={provisionData.newUserName}
                required
                onChange={e => setProvisionData({...provisionData, newUserName: e.target.value})}
                className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200'}`}
              />
            </div>
            <div className="space-y-1 relative">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Access Security Key</label>
              <input 
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••" 
                required
                value={provisionData.newPassword}
                onChange={e => setProvisionData({...provisionData, newPassword: e.target.value})}
                className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200'}`}
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-8 text-slate-500">
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Access Tier</label>
              <select 
                value={provisionData.role}
                onChange={e => setProvisionData({...provisionData, role: e.target.value as any})}
                className={`w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200'}`}
              >
                <option value="user">Standard (Employee)</option>
                <option value="admin">Administrator (Manager)</option>
              </select>
            </div>
            <button type="submit" disabled={isProvisioning || !state.config.sheetUrl} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs transition-all shadow-xl shadow-emerald-900/20 active:scale-[0.98]">
              {isProvisioning ? <div className="flex items-center justify-center gap-2"><RefreshCw className="animate-spin" size={16} /> Creating Cloud Tab...</div> : 'Finalize & Create Cloud Sheet'}
            </button>
            {!state.config.sheetUrl && <p className="text-[9px] text-red-400 font-bold uppercase text-center mt-2">Error: Setup Database URL First</p>}
            {provisionSuccess && (
              <div className="flex flex-col items-center justify-center gap-1 text-emerald-400 animate-bounce mt-2">
                <Check size={18} strokeWidth={3} />
                <p className="text-[10px] font-black uppercase tracking-widest">Success: User & Sheet Created!</p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Directory & CRUD */}
      <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
          <Database size={20} className="text-indigo-400" /> Workforce Identity Directory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest font-black text-slate-500">
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">ID / Database Node</th>
                <th className="px-4 py-3">Access Level</th>
                <th className="px-4 py-3">Security Key</th>
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
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-indigo-500 outline-none"
                      />
                    ) : (
                      <span className="text-sm font-bold text-white">{u.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tabular-nums">{u.id}</span>
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
                  <td className="px-4 py-4">
                    {editingUserId === u.id ? (
                      <input 
                        value={editFormData?.password}
                        onChange={e => setEditFormData({...editFormData!, password: e.target.value})}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-indigo-500 outline-none"
                      />
                    ) : (
                      <span className="text-xs font-mono text-slate-600">••••••••</span>
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

      {/* GAS Template Block */}
      <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md transition-all ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold flex items-center gap-2.5 text-white">
              <Code size={20} className="text-indigo-400" /> Cloud Database Engine (v6)
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Paste this code into Google Apps Script</p>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(GAS_TEMPLATE);
              alert("Template copied to clipboard!");
              setShowScript(true);
            }} 
            className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-indigo-500/20"
          >
            Copy Template
          </button>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl mb-6">
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            <span className="font-black text-amber-400">CRITICAL:</span> After pasting the code into Apps Script, you MUST click <strong>Deploy</strong> -> <strong>New Deployment</strong> and set <strong>"Who has access"</strong> to <strong>"Anyone"</strong>. If you do not do this, the application cannot create the user sheets.
          </p>
        </div>
        <button onClick={() => setShowScript(!showScript)} className="text-xs text-indigo-400 font-bold hover:underline mb-4">
          {showScript ? 'Hide Technical Details' : 'View Code Breakdown'}
        </button>
        {showScript && (
          <pre className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-[10px] font-mono text-indigo-300 overflow-x-auto whitespace-pre">
            {GAS_TEMPLATE}
          </pre>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
