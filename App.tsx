
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  CheckSquare, 
  FileText, 
  ShieldCheck, 
  LogOut, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Activity, 
  Loader2, 
  Palette, 
  Check,
  Target,
  Zap,
  Sparkles
} from 'lucide-react';
import { DayLog, AppState, UserProfile, ThemeType, Task, TaskPriority } from './types';
import { getTodayStr, diffMinutes } from './utils/time';
import AttendancePanel from './components/AttendancePanel';
import TaskPanel from './components/TaskPanel';
import AnalysisPanel from './components/AnalysisPanel';
import ReportsPanel from './components/ReportsPanel';
import InsightsPanel from './components/InsightsPanel';
import LoginForm from './components/LoginForm';
import AdminPanel from './components/AdminPanel';
import UserActivityPanel from './components/UserActivityPanel';
import AIAssistant from './components/AIAssistant';

const DEFAULT_ADMIN: UserProfile = {
  id: "ADMIN",
  name: "System Administrator",
  password: "admin",
  role: 'admin',
  status: 'active',
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

const DashboardSummary: React.FC<{ tasks: Task[], totalMins: number }> = ({ tasks, totalMins }) => {
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    
    return {
      total: tasks.length,
      completed,
      pending,
      hours: (totalMins / 60).toFixed(1)
    };
  }, [tasks, totalMins]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="glass-panel p-6 rounded-[2rem] border-pulse transition-all hover:translate-y-[-4px]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Target size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Today</span>
        </div>
        <p className="text-3xl font-black text-white">{stats.total}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Total Modules</p>
      </div>

      <div className="glass-panel p-6 rounded-[2rem] transition-all hover:translate-y-[-4px]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <Activity size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending</span>
        </div>
        <p className="text-3xl font-black text-white">{stats.pending}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Active Objectives</p>
      </div>

      <div className="glass-panel p-6 rounded-[2rem] transition-all hover:translate-y-[-4px]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Check size={20} className="text-emerald-500" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Done</span>
        </div>
        <p className="text-3xl font-black text-white">{stats.completed}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Verified Output</p>
      </div>

      <div className="glass-panel p-6 rounded-[2rem] transition-all hover:translate-y-[-4px]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Clock size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Log</span>
        </div>
        <p className="text-3xl font-black text-white">{stats.hours}<span className="text-sm font-bold ml-1 opacity-50">hrs</span></p>
        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Production Time</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('task_time_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const shouldAuth = parsed.rememberMe && parsed.currentUser && parsed.currentUser.status !== 'inactive';
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
  
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'tasks' | 'reports' | 'admin' | 'activity' | 'nexus'>('overview');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'hydrating' | 'syncing' | 'connected' | 'error'>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [showThemeGallery, setShowThemeGallery] = useState(false);

  const isAdmin = state.currentUser?.role === 'admin';

  const loadFromCloud = useCallback(async (isSilent = false) => {
    if (!state.config.sheetUrl || !state.isAuthenticated || !state.currentUser) return;
    
    if (!isSilent) setSyncStatus('hydrating');
    try {
      const url = `${state.config.sheetUrl}?userId=${encodeURIComponent(state.currentUser.id)}&userName=${encodeURIComponent(state.currentUser.name)}&role=${state.currentUser.role}&t=${Date.now()}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const cloudData = await response.json();
        setState(prev => {
          const updatedUserLogs = { ...prev.userLogs };
          if (cloudData.userLogs) {
            Object.entries(cloudData.userLogs).forEach(([uId, cloudDays]) => {
              if (!isAdmin && uId !== state.currentUser!.id) return;
              if (!updatedUserLogs[uId]) updatedUserLogs[uId] = {};
              Object.entries(cloudDays as Record<string, DayLog>).forEach(([date, cloudDay]) => {
                const localDay = updatedUserLogs[uId][date];
                if (!localDay) {
                  updatedUserLogs[uId][date] = cloudDay;
                  return;
                }
                const mergedTasks = [...cloudDay.tasks];
                localDay.tasks.forEach(localTask => {
                   const index = mergedTasks.findIndex(t => t.id === localTask.id);
                   if (index !== -1) {
                      if (localTask.timerStartedAt && mergedTasks[index].status === 'pending') {
                         mergedTasks[index] = { ...mergedTasks[index], timerStartedAt: localTask.timerStartedAt };
                      }
                   } else {
                      mergedTasks.push(localTask);
                   }
                });
                updatedUserLogs[uId][date] = { ...cloudDay, tasks: mergedTasks };
              });
            });
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
  }, [state.config.sheetUrl, state.isAuthenticated, state.currentUser, isAdmin]);

  const saveToCloud = useCallback(async (isImmediate = false) => {
    if (!state.config.sheetUrl || !state.isAuthenticated || !state.currentUser || !isHydrated) return;
    if (!isImmediate) setSyncStatus('syncing');
    try {
      const payload = {
        action: 'SYNC_DATA',
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        role: state.currentUser.role,
        userLogs: isAdmin ? state.userLogs : { [state.currentUser.id]: state.userLogs[state.currentUser.id] || {} },
        config: state.config,
        lastUpdated: new Date().toISOString()
      };
      await fetch(state.config.sheetUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      setSyncStatus('connected');
    } catch (err) {
      setSyncStatus('error');
    }
  }, [state.userLogs, state.config, state.isAuthenticated, isHydrated, state.currentUser, isAdmin]);

  useEffect(() => {
    const timeoutId = setTimeout(() => saveToCloud(false), 3000); 
    return () => clearTimeout(timeoutId);
  }, [state.userLogs, state.config, saveToCloud]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const cloudTimer = setInterval(() => loadFromCloud(true), isAdmin ? 10000 : 30000);
    return () => { clearInterval(timer); clearInterval(cloudTimer); };
  }, [loadFromCloud, isAdmin]);

  useEffect(() => {
    localStorage.setItem('task_time_v2', JSON.stringify(state));
    const themes: ThemeType[] = ['executive', 'cyberpunk', 'emerald', 'crimson', 'nordic', 'light'];
    document.body.classList.remove(...themes.map(t => `theme-${t}`));
    document.body.classList.add(`theme-${state.theme}`);
  }, [state]);

  const handleLogin = async (userId: string, password: string, remember: boolean) => {
    const findUser = (userList: UserProfile[]) => userList.find(u => 
      (u.id.toUpperCase() === userId.toUpperCase() || u.name.toUpperCase() === userId.toUpperCase()) && 
      u.password === password
    );
    let user = findUser(state.config.users);
    if (!user) {
      try {
        const response = await fetch(`${BUILTIN_SHEET_URL}?action=GET_CONFIG&t=${Date.now()}`);
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData.config && cloudData.config.users) {
            user = findUser(cloudData.config.users);
            if (user) setState(prev => ({ ...prev, config: { ...prev.config, users: cloudData.config.users } }));
          }
        }
      } catch (err) { console.error("Cloud identity lookup failed", err); }
    }
    if (user) {
      if (user.status === 'inactive') { alert("Authentication Error: Account is currently inactive. Contact Admin."); return false; }
      setIsHydrated(false);
      setState(prev => ({ ...prev, isAuthenticated: true, rememberMe: remember, currentUser: user }));
      return true;
    }
    return false;
  };

  const handleLogout = () => { setState(prev => ({ ...prev, isAuthenticated: false, currentUser: undefined })); setIsHydrated(false); };
  const updateConfig = (newConfig: Partial<AppState['config']>) => { setState(prev => ({ ...prev, config: { ...prev.config, ...newConfig } })); };

  const updateUserLog = (date: string, updater: (prev: DayLog) => DayLog) => {
    if (!state.currentUser) return;
    const userId = state.currentUser.id;
    setState(prev => {
      const userLogs = { ...prev.userLogs };
      if (!userLogs[userId]) userLogs[userId] = {};
      const currentDayLog = userLogs[userId][date] || { date, tasks: [] };
      userLogs[userId][date] = updater(currentDayLog);
      return { ...prev, userLogs };
    });
  };

  const assignTask = async (userIds: string[], date: string, task: Task) => {
    if (!isAdmin || !state.currentUser) return;
    setState(prev => {
      const userLogs = { ...prev.userLogs };
      userIds.forEach(uId => {
        if (!userLogs[uId]) userLogs[uId] = {};
        if (!userLogs[uId][date]) userLogs[uId][date] = { date, tasks: [] };
        userLogs[uId][date].tasks = [task, ...userLogs[uId][date].tasks];
      });
      return { ...prev, userLogs };
    });
    setTimeout(() => saveToCloud(true), 100);
  };

  const triggerManualSync = async (specialAction?: string, extraData?: any) => {
    if (!state.config.sheetUrl || !state.currentUser) return;
    setSyncStatus('syncing');
    try {
      const payload = {
        action: specialAction || 'MANUAL_SYNC',
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        role: state.currentUser.role,
        userLogs: isAdmin ? state.userLogs : { [state.currentUser.id]: state.userLogs[state.currentUser.id] || {} },
        config: state.config,
        ...extraData
      };
      if (specialAction === 'PROVISION_USER' && extraData?.targetUser) {
          const newUser = extraData.targetUser;
          setState(prev => {
            const users = prev.config.users.some(u => u.id === newUser.id) 
              ? prev.config.users.map(u => u.id === newUser.id ? newUser : u)
              : [...prev.config.users, newUser];
            const userLogs = { ...prev.userLogs };
            if (!userLogs[newUser.id]) userLogs[newUser.id] = {};
            return { ...prev, config: { ...prev.config, users }, userLogs };
          });
      }
      await fetch(state.config.sheetUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      setSyncStatus('connected');
      setTimeout(() => loadFromCloud(true), 500);
    } catch (e) { setSyncStatus('error'); }
  };

  const restoreFullState = (newState: Partial<AppState>) => { setState(prev => ({ ...prev, ...newState, isAuthenticated: true })); setIsHydrated(true); };

  if (!state.isAuthenticated) return <LoginForm onLogin={handleLogin} defaultUserId="" />;

  const todayStr = getTodayStr();
  const currentUserLogs = state.userLogs[state.currentUser!.id] || {};
  const todayLog: DayLog = currentUserLogs[todayStr] || { date: todayStr, tasks: [] };

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Dash' },
    { id: 'nexus', icon: Sparkles, label: 'Nexus AI' },
    { id: 'attendance', icon: Clock, label: 'Clock' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'reports', icon: FileText, label: 'Audits' },
    ...(isAdmin ? [
      { id: 'activity', icon: Activity, label: 'Users' },
      { id: 'admin', icon: ShieldCheck, label: 'Admin' }
    ] : [])
  ];

  const totalActualMins = todayLog.tasks.reduce((sum, t) => {
    const elapsed = t.status === 'pending' && t.timerStartedAt ? Math.floor((Date.now() - t.timerStartedAt) / 60000) : 0;
    return sum + t.actualDuration + elapsed;
  }, 0);

  return (
    <div className={`flex flex-col md:flex-row h-screen overflow-hidden font-sans transition-colors duration-500 app-bg`}>
      <aside className={`hidden md:flex flex-col w-72 glass-panel m-4 rounded-[2.5rem] p-8 no-print transition-all border-opacity-20`}>
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="w-12 h-12 bg-theme-primary rounded-2xl flex items-center justify-center shadow-2xl accent-shadow">
            <Clock className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tighter text-glow">
              Workforce <span className="text-theme-primary">OS</span>
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Quantum Efficiency</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-3">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-theme-primary text-white shadow-xl accent-shadow font-black' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-xs uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 space-y-6">
          <div className="flex items-center gap-4 px-4 py-4 rounded-3xl bg-slate-950/40 border border-slate-800/30">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">
              {state.currentUser?.name.substring(0,2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate uppercase tracking-tighter">{state.currentUser?.name}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{state.currentUser?.role} Mode</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all group">
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Disconnect</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6 scroll-smooth">
        <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 mb-8 glass-panel rounded-3xl no-print">
          <div className="flex items-center gap-4">
             <div className="md:hidden w-10 h-10 bg-theme-primary rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="text-white w-6 h-6" />
             </div>
             <div className="flex flex-col">
                <h2 className="text-lg font-black uppercase tracking-[0.3em] text-glow">{activeTab}</h2>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Node ID: {state.currentUser?.id}</p>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end mr-4">
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Network</p>
               <p className="text-[11px] font-black text-white tabular-nums">{currentTime.toLocaleTimeString([], { hour12: false })}</p>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-800/30 bg-black/20">
              {syncStatus === 'hydrating' || syncStatus === 'syncing' ? (
                <RefreshCw size={14} className="text-theme-primary animate-spin" />
              ) : syncStatus === 'error' ? (
                <CloudOff size={14} className="text-red-400" />
              ) : (
                <Cloud size={14} className="text-emerald-400" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-widest ${syncStatus === 'error' ? 'text-red-400' : 'text-slate-500'} hidden sm:inline`}>
                {syncStatus}
              </span>
            </div>
            
            <button onClick={() => setShowThemeGallery(!showThemeGallery)} className="p-2.5 rounded-2xl border border-slate-800/30 bg-black/20 hover:bg-theme-primary/10 hover:border-theme-primary/50 transition-all text-slate-400"><Palette size={20} /></button>
            
            {showThemeGallery && (
              <div className="absolute right-0 mt-4 top-full w-72 p-6 rounded-[2.5rem] glass-panel border shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-in fade-in zoom-in-95 duration-300">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 px-1 border-b border-slate-800 pb-2">Interface Subsystem</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'executive', label: 'Indigo', color: 'bg-indigo-600' },
                    { id: 'cyberpunk', label: 'Neon', color: 'bg-fuchsia-500' },
                    { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
                    { id: 'crimson', label: 'Crimson', color: 'bg-rose-600' },
                    { id: 'nordic', label: 'Nordic', color: 'bg-sky-400' },
                    { id: 'light', label: 'Light', color: 'bg-slate-100 border border-slate-300' }
                  ].map(t => (
                    <button key={t.id} onClick={() => { setState(p => ({...p, theme: t.id as ThemeType})); setShowThemeGallery(false); }} className={`flex flex-col items-center gap-3 p-4 rounded-3xl transition-all border ${state.theme === t.id ? 'border-theme-primary bg-theme-primary/10 shadow-lg' : 'border-slate-800/20 bg-slate-950/40 hover:border-slate-700'}`}>
                      <div className={`w-10 h-10 rounded-xl shadow-inner ${t.color}`} />
                      <span className="text-[9px] font-black uppercase tracking-tighter opacity-80">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="space-y-8 pb-12">
          {!isHydrated && state.isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-40 animate-pulse">
              <RefreshCw size={60} className="text-theme-primary animate-spin mb-6" />
              <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Synchronizing Quantum Cloud...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-1000">
                  <DashboardSummary tasks={todayLog.tasks} totalMins={totalActualMins} />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8"><AnalysisPanel log={todayLog} config={state.config} currentTime={currentTime} /></div>
                    <div className="lg:col-span-4"><InsightsPanel log={todayLog} logs={currentUserLogs} config={state.config} currentTime={currentTime} /></div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
                    <TaskPanel log={todayLog} onUpdate={(updater) => updateUserLog(todayStr, updater)} historicalLogs={currentUserLogs} userRole={state.currentUser?.role} currentUserId={state.currentUser?.id} onDirectUpdate={updateUserLog} />
                    <AttendancePanel log={todayLog} config={state.config} onUpdate={(updater) => updateUserLog(todayStr, updater)} logs={currentUserLogs} state={state} />
                  </div>
                </div>
              )}
              {activeTab === 'nexus' && <div className="animate-in fade-in duration-700"><AIAssistant state={state} /></div>}
              {activeTab === 'attendance' && <div className="animate-in fade-in duration-700"><AttendancePanel log={todayLog} config={state.config} onUpdate={(updater) => updateUserLog(todayStr, updater)} logs={currentUserLogs} state={state} isFullWidth /></div>}
              {activeTab === 'tasks' && <div className="animate-in fade-in duration-700"><TaskPanel log={todayLog} onUpdate={(updater) => updateUserLog(todayStr, updater)} historicalLogs={currentUserLogs} isFullWidth userRole={state.currentUser?.role} currentUserId={state.currentUser?.id} onDirectUpdate={updateUserLog} /></div>}
              {activeTab === 'reports' && <div className="animate-in fade-in duration-700"><ReportsPanel state={state} isFullWidth /></div>}
              {activeTab === 'activity' && isAdmin && <div className="animate-in fade-in duration-700"><UserActivityPanel state={state} /></div>}
              {activeTab === 'admin' && isAdmin && <div className="animate-in fade-in duration-700"><AdminPanel state={state} updateConfig={updateConfig} restoreFullState={restoreFullState} triggerManualSync={triggerManualSync} onAssignTask={assignTask} /></div>}
            </>
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-20 glass-panel rounded-[2.5rem] flex items-center justify-around px-8 z-50 no-print shadow-[0_15px_50px_rgba(0,0,0,0.6)] border-opacity-30">
        {navItems.slice(0, 5).map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === item.id ? 'text-theme-primary scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
            <item.icon size={22} strokeWidth={activeTab === item.id ? 3 : 2} />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
