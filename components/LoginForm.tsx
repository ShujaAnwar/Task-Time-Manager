
import React, { useState } from 'react';
import { Lock, User, Clock, ShieldCheck, ChevronRight, Info, Check } from 'lucide-react';

interface Props {
  onLogin: (userId: string, password: string, remember: boolean) => boolean;
  defaultUserId?: string;
}

const LoginForm: React.FC<Props> = ({ onLogin, defaultUserId = '' }) => {
  const [userId, setUserId] = useState(defaultUserId);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(userId, password, rememberMe)) {
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-6">
            <Clock className="text-white w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent text-center tracking-tight uppercase">
            Task & Time <span className="text-indigo-400">Manager</span>
          </h1>
          <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.4em] font-black text-center opacity-60">
            Professional Productivity Suite
          </p>
        </div>

        <form 
          onSubmit={handleSubmit}
          className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-2xl shadow-black/50 overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight">System Login</h2>
              <p className="text-sm text-slate-500 font-medium">Authentication required for access</p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Enter User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm outline-none transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-slate-950/80 border rounded-2xl pl-12 pr-4 py-4 text-white text-sm outline-none transition-all ${error ? 'border-red-500 shake' : 'border-slate-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5'}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950 border-slate-700 group-hover:border-slate-500'}`}>
                    {rememberMe && <Check size={12} className="text-white" strokeWidth={4} />}
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-200 transition-colors">Remember Session</span>
              </label>
              <button type="button" className="text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-colors uppercase tracking-wider">Reset Keys?</button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">Access Denied: Invalid Credentials</p>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-indigo-600/30 group"
            >
              <span>AUTHORIZE ACCESS</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-3">
              <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">Master Identity</p>
                <p className="text-[10px] text-indigo-300/60 font-medium">
                  Default ID: <span className="text-indigo-400 font-bold">ADMIN</span> / Password: <span className="text-indigo-400 font-bold">admin</span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50 flex flex-col items-center gap-3">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Cloud Database Node Connected</p>
            </div>
          </div>
        </form>
      </div>
      
      <style>{`
        .shake { animation: shake 0.5s both; }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default LoginForm;
