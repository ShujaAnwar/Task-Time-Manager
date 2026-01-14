
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  CheckSquare, 
  FileText, 
  ShieldCheck, 
  Bell, 
  LogOut, 
  Code2, 
  Sun, 
  Moon,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { DayLog, AppState, Task } from './types';
import { getTodayStr } from './utils/time';
import AttendancePanel from './components/AttendancePanel';
import TaskPanel from './components/TaskPanel';
import AnalysisPanel from './components/AnalysisPanel';
import ReportsPanel from './components/ReportsPanel';
import InsightsPanel from './components/InsightsPanel';
import LoginForm from './components/LoginForm';
import AdminPanel from './components/AdminPanel';

const INITIAL_STATE: AppState = {
  isAuthenticated: false,
  theme: 'dark',
  rememberMe: false,
  logs: {},
  config: {
    officeStartTime: "09:00",
    targetWorkingHours: 8,
    userName: "Alex Rivers",
    userId: "ALX-9204",
    systemPassword: "admin",
    sheetUrl: ""
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('task_time_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...parsed, isAuthenticated: parsed.rememberMe ? parsed.isAuthenticated : false };
    }
    return INITIAL_STATE;
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'tasks' | 'reports' | 'admin'>('overview');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'error'>('idle');

  // Cloud Sync: Fetch Data (Identity-Aware)
  useEffect(() => {
    const loadFromCloud = async () => {
      if (!state.config.sheetUrl || !state.isAuthenticated) return;
      
      setSyncStatus('syncing');
      try {
        // Append userId to the URL so Google Script knows which tab to fetch
        const urlWithIdentity = `${state.config.sheetUrl}?userId=${encodeURIComponent(state.config.userId)}`;
        const response = await fetch(urlWithIdentity);
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData && Object.keys(cloudData).length > 0) {
            setState(prev => ({
              ...prev,
              logs: cloudData.logs || prev.logs,
              config: { ...prev.config, ...cloudData.config, sheetUrl: prev.config.sheetUrl }
            }));
            setSyncStatus('connected');
          }
        }
      } catch (err) {
        console.error("Cloud Fetch Error:", err);
        setSyncStatus('error');
      }
    };

    loadFromCloud();
  }, [state.isAuthenticated, state.config.sheetUrl, state.config.userId]);

  // Cloud Sync: Push Data (Triggers on any task or attendance update)
  useEffect(() => {
    const saveToCloud = async () => {
      if (!state.config.sheetUrl || !state.isAuthenticated) return;
      
      setSyncStatus('syncing');
      try {
        const response = await fetch(state.config.sheetUrl, {
          method: 'POST',
          // We send the whole state; Google Script determines where to save based on userId inside config
          body: JSON.stringify({
            logs: state.logs,
            config: state.config,
            lastUpdated: new Date().toISOString()
          })
        });
        if (response.ok) {
          setSyncStatus('connected');
        } else {
          setSyncStatus('error');
        }
      } catch (err) {
        console.error("Cloud Save Error:", err);
        setSyncStatus('error');
      }
    };

    const timeoutId = setTimeout(saveToCloud, 1500); // More aggressive debounce for faster recording
    return () => clearTimeout(timeoutId);
  }, [state.logs, state.config, state.isAuthenticated]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('task_time_v1', JSON.stringify(state));
    if (state.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-slate-50 text-slate-900 min-h-screen transition-colors duration-300';
    } else {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-slate-950 text-slate-100 min-h-screen transition-colors duration-300';
    }
  }, [state.theme, state.rememberMe, state.isAuthenticated]);

  const handleLogin = (userId: string, password: string, remember: boolean) => {
    if (password === state.config.systemPassword && (userId === state.config.userId || userId === state.config.userName)) {
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: true, 
        rememberMe: remember,
        config: { ...prev.config, userId }
      }));
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false, rememberMe: false }));
  };

  const toggleTheme = () => {
    setState(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  };

  const updateConfig = (newConfig: Partial<AppState['config']>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig }
    }));
  };

  if (!state.isAuthenticated) {
    return <LoginForm onLogin={handleLogin} defaultUserId={state.config.userId} />;
  }

  const todayStr = getTodayStr();
  const todayLog: DayLog = state.logs[todayStr] || { date: todayStr, tasks: [] };

  const updateTodayLog = (updater: (prev: DayLog) => DayLog) => {
    setState(prev => ({
      ...prev,
      logs: {
        ...prev.logs,
        [todayStr]: updater(prev.logs[todayStr] || { date: todayStr, tasks: [] })
      }
    }));
  };

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'attendance', icon: Clock, label: 'Attendance' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'admin', icon: ShieldCheck, label: 'Admin Panel' },
  ];

  const isDark = state.theme === 'dark';

  return (
    <div className={`flex flex-col md:flex-row h-screen overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <aside className={`hidden md:flex flex-col w-64 border-r p-6 no-print transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Clock className="text-white w-6 h-6" />
          </div>
          <h1 className={`text-sm font-black leading-tight uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Task & Time <span className="text-indigo-500">Manager</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 font-bold' 
                  : `${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`
              }`}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={`mt-auto pt-6 border-t space-y-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden ring-2 ring-indigo-500/20">
              <img src="https://picsum.photos/seed/user/100/100" alt="user" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{state.config.userName}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{state.config.userId}</p>
            </div>
          </div>
          
          <div className={`px-2 py-3 rounded-xl border transition-colors ${isDark ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] mb-1 flex items-center gap-1.5">
              <Code2 size={10} className="text-indigo-500" /> Multi-Tenant Cloud
            </p>
            <p className={`text-[10px] font-bold truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Tab: {state.config.userId}
            </p>
          </div>

          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scroll-smooth">
        <header className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b no-print backdrop-blur-md transition-colors ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="md:hidden flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Clock className="text-white w-5 h-5" />
             </div>
             <h1 className="text-xs font-bold uppercase tracking-tight">Task & Time Manager</h1>
          </div>

          <div className="hidden md:block">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('Panel', '')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Connected Identity: <span className="font-bold text-indigo-500">{state.config.userId}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800/50 bg-slate-900/50">
              {syncStatus === 'syncing' ? (
                <RefreshCw size={14} className="text-indigo-400 animate-spin" />
              ) : syncStatus === 'connected' ? (
                <Cloud size={14} className="text-emerald-400" />
              ) : syncStatus === 'error' ? (
                <AlertCircle size={14} className="text-red-400" />
              ) : (
                <CloudOff size={14} className="text-slate-500" />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'connected' ? 'Cloud Live' : syncStatus === 'error' ? 'Sync Error' : 'Offline'}
              </span>
            </div>

            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-full border transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'}`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AttendancePanel log={todayLog} config={state.config} onUpdate={updateTodayLog} />
                <AnalysisPanel log={todayLog} config={state.config} currentTime={currentTime} />
                <InsightsPanel log={todayLog} logs={state.logs} config={state.config} currentTime={currentTime} />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <TaskPanel log={todayLog} onUpdate={updateTodayLog} historicalLogs={state.logs} />
                <ReportsPanel logs={state.logs} config={state.config} />
              </div>
            </>
          )}
          {activeTab === 'attendance' && <AttendancePanel log={todayLog} config={state.config} onUpdate={updateTodayLog} isFullWidth />}
          {activeTab === 'tasks' && <TaskPanel log={todayLog} onUpdate={updateTodayLog} historicalLogs={state.logs} isFullWidth />}
          {activeTab === 'reports' && <ReportsPanel logs={state.logs} config={state.config} isFullWidth />}
          {activeTab === 'admin' && <AdminPanel state={state} updateConfig={updateConfig} theme={state.theme} />}
        </div>
      </main>
    </div>
  );
};

export default App;
