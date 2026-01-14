
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  CheckSquare, 
  BarChart3, 
  FileText, 
  Settings, 
  User,
  ShieldCheck,
  Bell,
  LogOut,
  Calendar,
  Lock,
  Code2,
  Sun,
  Moon
} from 'lucide-react';
import { DayLog, AppState, AttendanceStatus, Task } from './types';
import { getTodayStr, formatTime } from './utils/time';
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
    systemPassword: "admin"
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('task_time_v1', JSON.stringify(state));
    if (state.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-slate-950', 'text-slate-100');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-slate-950', 'text-slate-100');
    }
  }, [state]);

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
      {/* Sidebar */}
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
              <Code2 size={10} className="text-indigo-500" /> Authorized User
            </p>
            <p className={`text-[10px] font-bold truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Shuja Anwar Ahmed Hashmi
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

      {/* Main Content Area */}
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
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-full border transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'}`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="flex items-center gap-2">
              <button className={`p-2 rounded-full border transition-colors ${isDark ? 'text-slate-400 hover:text-white bg-slate-900 border-slate-800' : 'text-slate-500 hover:text-slate-900 bg-slate-100 border-slate-200'}`}>
                <Bell size={18} />
              </button>
            </div>
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
          {activeTab === 'admin' && <AdminPanel state={state} updateConfig={updateConfig} />}
        </div>
      </main>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t px-6 py-3 flex justify-between items-center no-print transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
         {navItems.map(item => (
           <button 
             key={item.id}
             onClick={() => setActiveTab(item.id as any)}
             className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-indigo-500' : ''}`}
           >
             <item.icon size={20} />
             <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
           </button>
         ))}
      </nav>
    </div>
  );
};

export default App;
