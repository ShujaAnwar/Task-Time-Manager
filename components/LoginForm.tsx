
import React, { useState } from 'react';
import { Lock, User, Clock, ShieldCheck, ChevronRight, Info } from 'lucide-react';

interface Props {
  onLogin: (password: string) => boolean;
}

const LoginForm: React.FC<Props> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(password)) {
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-4 animate-bounce duration-[2000ms]">
            <Clock className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            CHRONOS
          </h1>
          <p className="text-slate-500 text-sm mt-2 uppercase tracking-[0.2em] font-medium">Enterprise Suite</p>
        </div>

        <form 
          onSubmit={handleSubmit}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-black/50"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">System Login</h2>
              <p className="text-sm text-slate-500">Access your productivity dashboard</p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value="Alex Rivers (Auto-filled)"
                  disabled
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-slate-400 text-sm outline-none cursor-not-allowed"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  placeholder="System Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-2xl pl-12 pr-4 py-4 text-white text-sm outline-none transition-all ${error ? 'border-red-500 shake' : 'border-slate-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5'}`}
                />
              </div>
            </div>

            {/* Credential Hint */}
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center gap-3">
              <Info size={14} className="text-indigo-400 shrink-0" />
              <p className="text-[10px] text-indigo-300/70 font-medium">
                Default Access Key: <span className="text-indigo-400 font-bold tracking-widest">admin</span>
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center animate-in fade-in slide-in-from-top-1">
                Invalid system credentials. Please try again.
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20"
            >
              Authorize Access
              <ChevronRight size={18} />
            </button>

            <div className="pt-4 border-t border-slate-800/50 flex items-center justify-center gap-2 text-slate-500">
              <ShieldCheck size={14} />
              <span className="text-[10px] uppercase tracking-widest">End-to-End Encrypted Session</span>
            </div>
          </div>
        </form>

        <p className="mt-10 text-center text-slate-600 text-xs">
          Copyright © 2024 Chronos Systems. Secure Terminal v2.4.1
        </p>
      </div>
      
      <style>{`
        .shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
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
