
import React, { useState, useEffect } from 'react';
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
  Activity,
  Loader2,
  Palette,
  Check
} from 'lucide-react';
import { DayLog, AppState, UserProfile, ThemeType } from './types';
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

const BUILTIN_SHEET_URL = "https://script.google.com/macros/s/AKfycbw19O0PcbtKUuseQ_3vy_JyBvkGeO-GZ8s3iFFCKxQQ1_h2BwbFnZhhastQlRpO9tDLjQ/exec";

const INITIAL_STATE: AppState = {
  isAuthenticated: false,
  currentUser: undefined,
  theme: 'executive',
  rememberMe: true,
  userLogs: {},
  config: {
    officeStartTime: "09:00",
    targetWorkingHours: 8,
    sheetUrl: BUILTIN_SHEET_URL,
    users: [DEFAULT_ADMIN]
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('task_time_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const shouldAuth = parsed.rememberMe && parsed.currentUser;
        return { 
          ...parsed, 
          isAuthenticated: shouldAuth, 
          currentUser: shouldAuth ? parsed.currentUser : undefined,
          config: { 
            ...parsed.config, 
            sheetUrl: parsed.config.sheetUrl || BUILTIN_SHEET_URL 
          }
        };
      } catch (e) {
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'tasks' | 'reports' | 'admin' | 'activity'>('overview');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'hydrating' | 'syncing' | 'connected' | 'error'>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [showThemeGallery, setShowThemeGallery] = useState(false);

  const isAdmin = state.currentUser?.role === 'admin';

  useEffect(() => {
    const loadFromCloud = async () => {
      if (!state.config.sheetUrl || !state.isAuthenticated || !state.currentUser || isHydrated) return;
      
      setSyncStatus('hydrating');
      try {
        const url = `${state.config.sheetUrl}?userId=${encodeURIComponent(state.currentUser.id)}&role=${state.currentUser.role}&t=${Date.now()}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const cloudData = await response.json();
          setState(prev => {
            const updatedUserLogs = { ...prev.userLogs };
            if (cloudData.userLogs) {
              if (isAdmin) {
                Object.assign(updatedUserLogs, cloudData.userLogs);
              } else {
                const myLogs = cloudData.userLogs[state.currentUser!.id];
                if (myLogs) updatedUserLogs[state.currentUser!.id] = myLogs;
              }
            }
            return {
              ...prev,
              userLogs: updatedUserLogs,
              config: { 
                ...prev.config, 
                ...(cloudData.config || {}),
                sheetUrl: prev.config.sheetUrl
              }
            };
          });
          setIsHydrated(true);
          setSyncStatus('connected');
        } else {
          setSyncStatus('error');
          if (response.status === 404) setIsHydrated(true);
        }
      } catch (err) {
        setSyncStatus('error');
      }
    };

    if (state.isAuthenticated && !isHydrated) {
      loadFromCloud();
    }
  }, [state.isAuthenticated, isHydrated, state.currentUser, state.config.sheetUrl, isAdmin]);

  useEffect(() => {
    const saveToCloud = async () => {
      if (!state.config.sheetUrl || !state.isAuthenticated || !state.currentUser || !isHydrated) return;
      setSyncStatus('syncing');
      try {
        const payload = {
          action: 'SYNC_DATA',
          userId: state.currentUser.id,
          role: state.currentUser.role,
          userLogs: isAdmin ? state.userLogs : { [state.currentUser.id]: state.userLogs[state.currentUser.id] || {} },
          config: state.config,
          lastUpdated: new Date().toISOString()
        };
        await fetch(state.config.sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload)
        });
        setSyncStatus('connected');
      } catch (err) {
        setSyncStatus('error');
      }
    };
    const timeoutId = setTimeout(saveToCloud, 5000);
    return () => clearTimeout(timeoutId);
  }, [state.userLogs, state.config, state.isAuthenticated, isHydrated, state.currentUser, isAdmin]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('task_time_v2', JSON.stringify(state));
    
    // Apply theme classes to body
    const themes: ThemeType[] = ['executive', 'cyberpunk', 'emerald', 'crimson', 'nordic', 'light'];
    document.body.classList.remove(...themes.map(t => `theme-${t}`));
    document.body.classList.add(`theme-${state.theme}`);
  }, [state]);

  const handleLogin = (userId: string, password: string, remember: boolean) => {
    const user = state.config.users.find(u => (u.id.toUpperCase() === userId.toUpperCase() || u.name.toUpperCase() === userId.toUpperCase()) && u.password === password);
    if (user) {
      setIsHydrated(false);
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
    setIsHydrated(false);
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

  const triggerManualSync = async (specialAction?: string, extraData?: any) => {
    if (!state.config.sheetUrl || !state.currentUser) return;
    setSyncStatus('syncing');
    try {
      const payload = {
        action: specialAction || 'MANUAL_SYNC',
        userId: state.currentUser.id,
        role: state.currentUser.role,
        userLogs: state.userLogs,
        config: state.config,
        ...extraData
      };
      await fetch(state.config.sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });
      setSyncStatus('connected');
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const restoreFullState = (newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState, isAuthenticated: true }));
    setIsHydrated(true);
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

  const themes: {id: ThemeType, label: string, color: string}[] = [
    { id: 'executive', label: 'Executive Indigo', color: 'bg-indigo-600' },
    { id: 'cyberpunk', label: 'Neon Cyberpunk', color: 'bg-fuchsia-500' },
    { id: 'emerald', label: 'Green Emerald', color: 'bg-emerald-500' },
    { id: 'crimson', label: 'Modern Crimson', color: 'bg-rose-600' },
    { id: 'nordic', label: 'Blue Nordic', color: 'bg-sky-400' },
    { id: 'light', label: 'Professional Light', color: 'bg-slate-100 border border-slate-300' }
  ];

  return (
    <div className={`flex flex-col md:flex-row h-screen overflow-hidden font-sans transition-colors duration-500 app-bg`}>
      <aside className={`hidden md:flex flex-col w-64 border-r p-6 no-print transition-colors app-card`}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-theme-primary rounded-xl flex items-center justify-center shadow-lg accent-shadow">
            <Clock className="text-white w-6 h-6" />
          </div>
          <h1 className="text-sm font-black leading-tight uppercase tracking-tight text-current">
            Task & Time <span className="text-theme-primary">Manager</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-theme-primary/10 text-theme-primary border border-theme-primary/20 font-bold' 
                  : 'text-slate-500 hover:text-current hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/20 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-white text-[10px] font-bold">
              {state.currentUser?.name.substring(0,2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{state.currentUser?.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{state.currentUser?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all">
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-slate-800/20 backdrop-blur-md bg-transparent">
          <h2 className="text-lg font-bold">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800/20 bg-black/10`}>
              {syncStatus === 'hydrating' || syncStatus === 'syncing' ? (
                <Loader2 size={14} className="text-theme-primary animate-spin" />
              ) : syncStatus === 'error' ? (
                <CloudOff size={14} className="text-red-400" />
              ) : (
                <Cloud size={14} className="text-emerald-400" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-widest ${syncStatus === 'error' ? 'text-red-400' : 'text-slate-500'}`}>
                {syncStatus}
              </span>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowThemeGallery(!showThemeGallery)}
                className="p-2 rounded-full border border-slate-800/20 bg-black/10 hover:bg-black/20 transition-all text-slate-400 hover:text-theme-primary"
              >
                <Palette size={18} />
              </button>
              
              {showThemeGallery && (
                <div className="absolute right-0 mt-3 w-64 p-4 rounded-3xl app-card border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-1">Visual Environment</p>
                  <div className="grid grid-cols-2 gap-3">
                    {themes.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => { setState(p => ({...p, theme: t.id})); setShowThemeGallery(false); }}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${state.theme === t.id ? 'border-theme-primary bg-theme-primary/10' : 'border-slate-800/10 hover:border-slate-800/30 bg-black/10'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg shadow-inner ${t.color} flex items-center justify-center`}>
                          {state.theme === t.id && <Check size={14} className={t.id === 'light' ? 'text-indigo-600' : 'text-white'} />}
                        </div>
                        <span className="text-[9px] font-bold text-center leading-tight uppercase tracking-tighter opacity-70 group-hover:opacity-100">
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {!isHydrated && state.isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-24 animate-pulse">
              <RefreshCw size={48} className="text-theme-primary animate-spin mb-4" />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Syncing Cloud Database...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <AttendancePanel log={todayLog} config={state.config} onUpdate={updateTodayLog} />
                  <AnalysisPanel log={todayLog} config={state.config} currentTime={currentTime} />
                  <InsightsPanel log={todayLog} logs={currentUserLogs} config={state.config} currentTime={currentTime} />
                </div>
              )}
              {activeTab === 'attendance' && <AttendancePanel log={todayLog} config={state.config} onUpdate={updateTodayLog} isFullWidth />}
              {activeTab === 'tasks' && <TaskPanel log={todayLog} onUpdate={updateTodayLog} historicalLogs={currentUserLogs} isFullWidth />}
              {activeTab === 'reports' && <ReportsPanel logs={currentUserLogs} config={state.config} user={state.currentUser} isFullWidth />}
              {activeTab === 'activity' && isAdmin && <UserActivityPanel state={state} />}
              {activeTab === 'admin' && isAdmin && <AdminPanel state={state} updateConfig={updateConfig} restoreFullState={restoreFullState} triggerManualSync={triggerManualSync} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
