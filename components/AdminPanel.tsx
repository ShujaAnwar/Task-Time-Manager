
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
  Briefcase
} from 'lucide-react';
import { AppState } from '../types';

interface Props {
  state: AppState;
  updateConfig: (newConfig: Partial<AppState['config']>) => void;
}

const AdminPanel: React.FC<Props> = ({ state, updateConfig }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    userName: state.config.userName,
    officeStartTime: state.config.officeStartTime,
    targetWorkingHours: state.config.targetWorkingHours.toString(),
    systemPassword: state.config.systemPassword
  });
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      userName: formData.userName,
      officeStartTime: formData.officeStartTime,
      targetWorkingHours: parseInt(formData.targetWorkingHours),
      systemPassword: formData.systemPassword
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">System Administration</h2>
          <p className="text-slate-500 text-sm">Manage enterprise records and privacy configurations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Configuration */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="p-2 bg-slate-800 text-slate-400 rounded-xl">
                <Settings size={20} />
              </div>
              System Config
            </h3>
            {isSaved && (
              <span className="text-xs font-bold text-emerald-400 animate-in fade-in slide-in-from-right-2">
                Configurations Updated
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Employee Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="text" 
                    value={formData.userName}
                    onChange={(e) => setFormData({...formData, userName: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Daily Target (Hours)</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="number" 
                    value={formData.targetWorkingHours}
                    onChange={(e) => setFormData({...formData, targetWorkingHours: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">Standard Start Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="time" 
                    value={formData.officeStartTime}
                    onChange={(e) => setFormData({...formData, officeStartTime: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">System Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={formData.systemPassword}
                    onChange={(e) => setFormData({...formData, systemPassword: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/10"
            >
              <Save size={18} />
              Commit System Changes
            </button>
          </form>
        </div>

        {/* Security & Data Dump */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-xl flex flex-col">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
            <div className="p-2 bg-slate-800 text-slate-400 rounded-xl">
              <Database size={20} />
            </div>
            Data Persistence & Privacy
          </h3>

          <div className="flex-1 space-y-6">
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-4">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-200">Security Notice</p>
                <p className="text-[11px] text-amber-100/60 leading-relaxed">
                  System logs and passwords are stored in local storage for this session. 
                  Ensure your local device is secure before entering sensitive corporate data.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">Total Logged Records</span>
                <span className="text-xs font-mono text-white">{Object.keys(state.logs).length} Days</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">Storage Version</span>
                <span className="text-xs font-mono text-white">CHRONOS_V1.4.2</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">Data Encryption State</span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Active (Mock)</span>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Raw Data Inspector</p>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 h-40 overflow-y-auto">
                <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify({ config: state.config, logCount: Object.keys(state.logs).length }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
