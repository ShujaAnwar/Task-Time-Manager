
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  CheckSquare, 
  FileText, 
  ShieldCheck, 
  LogOut, 
  Sun, 
  Moon,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Users as UsersIcon,
  Activity
} from 'lucide-react';
import { DayLog, AppState, Task, UserProfile } from './types';
import { getTodayStr } from './utils/time';
import AttendancePanel from './components/AttendancePanel';
import TaskPanel from './components/TaskPanel';
import AnalysisPanel from './components/AnalysisPanel';
import ReportsPanel from './components/ReportsPanel';
import InsightsPanel from './components/InsightsPanel';
import LoginForm from './components/LoginForm';
import AdminPanel from './components/AdminPanel';
import UserActivityPanel from './components/UserActivityPanel';

const DEFAULT_ADMIN: UserProfile = {
  id: "ADMIN",
  name: "System Administrator",
  password: "admin",
  role: 'admin',
  createdAt: Date.now()
};

const INITIAL_STATE: AppState = {
  isAuthenticated: false,
  currentUser: undefined,
  theme: 'dark',
  rememberMe: true,
  userLogs: {},
  config: {
    officeStartTime: "09:00",
    targetWorkingHours: 8,
    sheetUrl: "",
    users: [DEFAULT_ADMIN]
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('task_time_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure user stays logged in if they were authenticated
        return { ...parsed };
      } catch (e) {
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'tasks' | 'reports' | 'admin' | 'activity'>('overview');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'error'>('idle');

  const isAdmin = state.currentUser?.role === 'admin';

  // Cloud Sync: Fetch Data for Current User
  useEffect(() => {
    const loadFromCloud = async () => {
      if (!state.config.sheetUrl || !state.isAuthenticated || !state.currentUser) return;
      
      setSyncStatus('syncing');
      try {
        const urlWithIdentity = `${state.config.sheetUrl}?userId=${encodeURIComponent(state.currentUser.id)}`;
        const response = await fetch(urlWithIdentity);
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData && cloudData.userLogs) {
             setState(prev => ({
              ...prev,
              userLogs: { ...prev.userLogs, [state.currentUser!.id]: cloudData.userLogs[state.currentUser!.id] || {} },
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
  }, [state.isAuthenticated, state.config.sheetUrl, state.currentUser?.id]);

  // Cloud Sync: Push Data
  useEffect(() => {
    const saveToCloud = async () => {
      if (!state.config.sheetUrl || !state.isAuthenticated || !state.currentUser) return;
      
      setSyncStatus('syncing');
      try {
        await fetch(state.config.sheetUrl, {
          method: 'POST',
          body: JSON.stringify({
            userLogs: state.userLogs,
            config: state.config,
            lastUpdated: new Date().toISOString()
          })
        });
        setSyncStatus('connected');
      } catch (err) {
        setSyncStatus('error');
      }
    };

    const timeoutId = setTimeout(saveToCloud, 2000);
    return () => clearTimeout(timeoutId);
  }, [state.userLogs, state.config, state.isAuthenticated]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Persistence Effect: Always save the whole state to local storage
  useEffect(() => {
    localStorage.setItem('task_time_v2', JSON.stringify(state));
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    document.body.className = state.theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  }, [state]);

  const handleLogin = (userId: string, password: string, remember: boolean) => {
    const user = state.config.users.find(u => (u.id.toUpperCase() === userId.toUpperCase() || u.name.toUpperCase() === userId.toUpperCase()) && u.password === password);
    if (user) {
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: true, 
        rememberMe: remember,
        currentUser: user
      }));
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false, currentUser: undefined }));
  };

  const updateConfig = (newConfig: Partial<AppState['config']>) => {
    setState(prev => ({ ...prev, config: { ...prev.config, ...newConfig } }));
  };

  const updateTodayLog = (updater: (prev: DayLog) => DayLog) => {
    if (!state.currentUser) return;
    const todayStr = getTodayStr();
    const userId = state.currentUser.id;
    
    setState(prev => {
      const userLogs = { ...prev.userLogs };
      if (!userLogs[userId]) userLogs[userId] = {};
      const currentDayLog = userLogs[userId][todayStr] || { date: todayStr, tasks: [] };
      userLogs[userId][todayStr] = updater(currentDayLog);
      return { ...prev, userLogs };
    });
  };

  const restoreFullState = (newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState, isAuthenticated: true }));
  };

  if (!state.isAuthenticated) {
    return <LoginForm onLogin={handleLogin} defaultUserId="" />;
  }

  const todayStr = getTodayStr();
  const currentUserLogs = state.userLogs[state.currentUser!.id] || {};
  const todayLog: DayLog = currentUserLogs[todayStr] || { date: todayStr, tasks: [] };

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'attendance', icon: Clock, label: 'Attendance' },
    { id: 'tasks', icon: CheckSquare, label: 'My Tasks' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    ...(isAdmin ? [
      { id: 'activity', icon: Activity, label: 'User Activity' },
      { id: 'admin', icon: ShieldCheck, label: 'System Admin' }
    ] : [])
  ];

  const isDark = state.theme === 'dark';

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-sans">
      <aside className={`hidden md:flex flex-col w-64 border-r p-6 no-print transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
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
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
              {state.currentUser?.name.substring(0,2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white">{state.currentUser?.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{state.currentUser?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all">
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <h2 className="text-lg font-bold">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800/50 bg-slate-900/50">
              {syncStatus === 'syncing' ? <RefreshCw size={14} className="text-indigo-400 animate-spin" /> : <Cloud size={14} className="text-emerald-400" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{syncStatus}</span>
            </div>
            <button onClick={() => setState(p => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))} className="p-2 rounded-full border border-slate-800">
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AttendancePanel log={todayLog} config={state.config} onUpdate={updateTodayLog} />
              <AnalysisPanel log={todayLog} config={state.config} currentTime={currentTime} />
              <InsightsPanel log={todayLog} logs={currentUserLogs} config={state.config} currentTime={currentTime} />
            </div>
          )}
          {activeTab === 'attendance' && <AttendancePanel log={todayLog} config={state.config} onUpdate={updateTodayLog} isFullWidth />}
          {activeTab === 'tasks' && <TaskPanel log={todayLog} onUpdate={updateTodayLog} historicalLogs={currentUserLogs} isFullWidth />}
          {activeTab === 'reports' && <ReportsPanel logs={currentUserLogs} config={state.config} isFullWidth />}
          {activeTab === 'activity' && isAdmin && <UserActivityPanel state={state} />}
          {activeTab === 'admin' && isAdmin && <AdminPanel state={state} updateConfig={updateConfig} restoreFullState={restoreFullState} />}
        </div>
      </main>
    </div>
  );
};

export default App;
