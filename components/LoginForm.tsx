
import React, { useState } from 'react';
import { Lock, User, Clock, ChevronRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

interface Props {
  onLogin: (userId: string, password: string, remember: boolean) => Promise<boolean>;
  defaultUserId?: string;
}

const LoginForm: React.FC<Props> = ({ onLogin, defaultUserId = '' }) => {
  const [userId, setUserId] = useState(defaultUserId);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); 
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(false);
    
    try {
      const success = await onLogin(userId, password, rememberMe);
      if (!success) {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } catch (err) {
      setError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-6">
            <Clock className="text-white w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent text-center tracking-tight uppercase">
            Workforce <span className="text-indigo-400">OS</span>
          </h1>
          <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.4em] font-black text-center opacity-60">
            Quantum Identity Subsystem
          </p>
        </div>

        <form 
          onSubmit={handleSubmit}
          className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-2xl shadow-black/50 overflow-hidden relative mb-12"
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight">Access Gate</h2>
              <p className="text-sm text-slate-500 font-medium">Provisioned credentials required</p>
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
                  disabled={isVerifying}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm outline-none transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 disabled:opacity-50"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isVerifying}
                  className={`w-full bg-slate-950/80 border rounded-2xl pl-12 pr-12 py-4 text-white text-sm outline-none transition-all ${error ? 'border-red-500 shake' : 'border-slate-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5'} disabled:opacity-50`}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-200 transition-colors">Persistent Session</span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">Unauthorized: Identity Mismatch</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isVerifying}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-indigo-600/30 group disabled:opacity-70"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>AUTHORIZING...</span>
                </>
              ) : (
                <>
                  <span>AUTHORIZE ACCESS</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-1000">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 hover:text-indigo-400/60 transition-colors cursor-default">
            Enterprise Security Core • Shuja Anwar Ahmed Hashmi
          </p>
        </div>
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
