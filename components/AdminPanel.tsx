
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Settings, 
  User, 
  Database, 
  Eye, 
  EyeOff, 
  Save, 
  AlertTriangle,
  Clock,
  Briefcase,
  UserPlus,
  Fingerprint,
  RefreshCw,
  CheckCircle2,
  Table as TableIcon,
  Link2,
  Globe,
  DatabaseZap
} from 'lucide-react';
import { AppState } from '../types';

interface Props {
  state: AppState;
  updateConfig: (newConfig: Partial<AppState['config']>) => void;
  theme?: 'dark' | 'light';
}

const AdminPanel: React.FC<Props> = ({ state, updateConfig, theme = 'dark' }) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const [generalData, setGeneralData] = useState({
    userName: state.config.userName,
    userId: state.config.userId,
    officeStartTime: state.config.officeStartTime,
    targetWorkingHours: state.config.targetWorkingHours.toString(),
    sheetUrl: state.config.sheetUrl || ''
  });

  const [provisionData, setProvisionData] = useState({
    newUserId: '',
    newUserName: '',
    newPassword: ''
  });

  const [isSaved, setIsSaved] = useState(false);
  const isDark = theme === 'dark';

  const handleGeneralSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      userName: generalData.userName,
      userId: generalData.userId,
      officeStartTime: generalData.officeStartTime,
      targetWorkingHours: parseInt(generalData.targetWorkingHours),
      sheetUrl: generalData.sheetUrl
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const testConnection = async () => {
    if (!generalData.sheetUrl) return;
    setTestStatus('testing');
    try {
      // Test the URL with current identity
      const response = await fetch(`${generalData.sheetUrl}?userId=${state.config.userId}`);
      if (response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (e) {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionData.newUserId || !provisionData.newPassword) return;
    
    setIsProvisioning(true);
    setTimeout(() => {
      // Provisioning updates local state, which the App.tsx Sync Engine 
      // will immediately push to the sheet, creating a new tab automatically.
      updateConfig({
        userId: provisionData.newUserId,
        userName: provisionData.newUserName || provisionData.newUserId,
        systemPassword: provisionData.newPassword
      });
      setIsProvisioning(false);
      setProvisionSuccess(true);
      setProvisionData({ newUserId: '', newUserName: '', newPassword: '' });
      setTimeout(() => setProvisionSuccess(false), 5000);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className={`p-3 rounded-2xl border transition-colors ${isDark ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
          <ShieldCheck size={28} />
        </div>
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Cloud Administration</h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Multi-User Database Management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Cloud Config */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl transition-all ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-lg font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <DatabaseZap size={20} />
              </div>
              Sheet Integration
            </h3>
            {isSaved && (
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 animate-bounce">
                <CheckCircle2 size={12} /> Sync Established
              </span>
            )}
          </div>

          <form onSubmit={handleGeneralSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Apps Script Web App URL</label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="url" 
                    placeholder="https://script.google.com/macros/s/..."
                    value={generalData.sheetUrl}
                    onChange={(e) => setGeneralData({...generalData, sheetUrl: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                </div>
                <button 
                  type="button"
                  onClick={testConnection}
                  className={`px-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                    testStatus === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/10' :
                    testStatus === 'error' ? 'bg-red-500/10 text-red-500 border-red-500' :
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {testStatus === 'testing' ? <RefreshCw size={14} className="animate-spin" /> : 
                   testStatus === 'success' ? 'Live' : 
                   testStatus === 'error' ? 'Fail' : 'Test'}
                </button>
              </div>
              <p className="text-[9px] text-slate-500 font-medium px-1 italic">Every unique User ID will automatically create its own tab in this sheet.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Active User Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    value={generalData.userName}
                    onChange={(e) => setGeneralData({...generalData, userName: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Active User ID (Tab Name)</label>
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    value={generalData.userId}
                    onChange={(e) => setGeneralData({...generalData, userId: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] uppercase tracking-wider text-xs"
            >
              <Save size={16} /> Commit Cloud Sync
            </button>
          </form>
        </div>

        {/* Identity Provisioning */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl transition-all overflow-hidden relative ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-lg font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <UserPlus size={20} />
              </div>
              Provision New User
            </h3>
            {provisionSuccess && (
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 size={12} /> Account Initialized
              </span>
            )}
          </div>

          <form onSubmit={handleProvision} className="space-y-6">
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-3 mb-4">
              <TableIcon size={18} className="text-indigo-400 shrink-0" />
              <p className="text-[10px] text-indigo-300 font-medium leading-relaxed uppercase tracking-tight">
                New accounts instantly trigger the creation of a private tab in the connected Google Sheet for isolated data storage.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">New User ID (Unique Identifier)</label>
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., EMP-402"
                    value={provisionData.newUserId}
                    onChange={(e) => setProvisionData({...provisionData, newUserId: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    required
                    value={provisionData.newPassword}
                    onChange={(e) => setProvisionData({...provisionData, newPassword: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-12 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isProvisioning}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl font-black uppercase tracking-wider text-xs ${
                isProvisioning 
                ? 'bg-slate-800 text-slate-500' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {isProvisioning ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {isProvisioning ? 'Creating Sheet...' : 'Provision Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
