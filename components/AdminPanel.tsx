
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
  CheckCircle2
} from 'lucide-react';
import { AppState } from '../types';

interface Props {
  state: AppState;
  updateConfig: (newConfig: Partial<AppState['config']>) => void;
  theme?: 'dark' | 'light';
}

const AdminPanel: React.FC<Props> = ({ state, updateConfig, theme = 'dark' }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);

  // General Settings Form
  const [generalData, setGeneralData] = useState({
    userName: state.config.userName,
    userId: state.config.userId,
    officeStartTime: state.config.officeStartTime,
    targetWorkingHours: state.config.targetWorkingHours.toString()
  });

  // Provisioning Form
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
      targetWorkingHours: parseInt(generalData.targetWorkingHours)
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionData.newUserId || !provisionData.newPassword) return;
    
    setIsProvisioning(true);
    // Simulate API provisioning delay
    setTimeout(() => {
      updateConfig({
        userId: provisionData.newUserId,
        userName: provisionData.newUserName || provisionData.newUserId,
        systemPassword: provisionData.newPassword
      });
      setIsProvisioning(false);
      setProvisionSuccess(true);
      setProvisionData({ newUserId: '', newUserName: '', newPassword: '' });
      setTimeout(() => setProvisionSuccess(false), 5000);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className={`p-3 rounded-2xl border transition-colors ${isDark ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
          <ShieldCheck size={28} />
        </div>
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>System Administration</h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Enterprise Management & Identity Provisioning</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Core Configuration */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl transition-all ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-lg font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <Settings size={20} />
              </div>
              Environment Config
            </h3>
            {isSaved && (
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 animate-in slide-in-from-right-2">
                <CheckCircle2 size={12} /> Sync Complete
              </span>
            )}
          </div>

          <form onSubmit={handleGeneralSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Assigned Name</label>
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
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Current User ID</label>
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

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Shift Start Time</label>
                <div className="relative group">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="time" 
                    value={generalData.officeStartTime}
                    onChange={(e) => setGeneralData({...generalData, officeStartTime: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Target Duty Hours</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="number" 
                    value={generalData.targetWorkingHours}
                    onChange={(e) => setGeneralData({...generalData, targetWorkingHours: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] uppercase tracking-wider text-xs"
            >
              <Save size={16} /> Update Environment
            </button>
          </form>
        </div>

        {/* Identity Provisioning Section */}
        <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md shadow-2xl transition-all overflow-hidden relative ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <UserPlus size={160} className={isDark ? 'text-white' : 'text-slate-900'} />
          </div>

          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-lg font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <UserPlus size={20} />
              </div>
              Identity Provisioning
            </h3>
            {provisionSuccess && (
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 animate-bounce">
                <CheckCircle2 size={12} /> New User Created
              </span>
            )}
          </div>

          <form onSubmit={handleProvision} className="space-y-6 relative z-10">
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 mb-4">
              <AlertTriangle size={18} className="text-amber-500 shrink-0" />
              <p className="text-[10px] text-amber-600 dark:text-amber-200/60 font-medium leading-relaxed uppercase tracking-tight">
                Warning: Provisioning a new user will overwrite the current system credentials. 
                Record the new User ID and Password before committing.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">New User ID *</label>
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., EMP-101"
                    value={provisionData.newUserId}
                    onChange={(e) => setProvisionData({...provisionData, newUserId: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Full Name (Optional)</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="e.g., Jane Cooper"
                    value={provisionData.newUserName}
                    onChange={(e) => setProvisionData({...provisionData, newUserName: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">System Password *</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    required
                    placeholder="Minimum 4 characters"
                    value={provisionData.newPassword}
                    onChange={(e) => setProvisionData({...provisionData, newPassword: e.target.value})}
                    className={`w-full border rounded-2xl pl-11 pr-12 py-3 text-sm outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isProvisioning}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] uppercase tracking-wider text-xs font-black ${
                isProvisioning 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {isProvisioning ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {isProvisioning ? 'Provisioning Account...' : 'Provision New Identity'}
            </button>
          </form>
        </div>
      </div>

      {/* System Data Explorer */}
      <div className={`rounded-[2.5rem] p-8 border backdrop-blur-md transition-all ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-lg font-bold flex items-center gap-2.5 mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            <Database size={20} />
          </div>
          System Integrity & Privacy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div className="space-y-4">
            <div className={`flex items-center justify-between py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Logs</span>
              <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{Object.keys(state.logs).length} Records</span>
            </div>
            <div className={`flex items-center justify-between py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Storage Node</span>
              <span className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>TASK_TIME_LOCAL_V1</span>
            </div>
            <div className={`flex items-center justify-between py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Auth Protocol</span>
              <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Verified Secure</span>
            </div>
          </div>

          <div className="space-y-3">
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1">Live Metadata Inspector</p>
             <div className={`rounded-3xl p-5 h-32 overflow-y-auto border font-mono text-[10px] leading-relaxed transition-colors ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                {JSON.stringify({ config: state.config, totalLogs: Object.keys(state.logs).length }, null, 2)}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
