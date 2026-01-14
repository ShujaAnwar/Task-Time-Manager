
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
  Lock
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
  logs: {},
  config: {
    officeStartTime: "09:00",
    targetWorkingHours: 8,
    userName: "Alex Rivers",
    systemPassword: "admin" // Default password
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('chronos_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...parsed, isAuthenticated: false }; // Force login on reload for security
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
    localStorage.setItem('chronos_v1', JSON.stringify(state));
  }, [state]);

  const handleLogin = (password: string) => {
    if (password === state.config.systemPassword) {
      setState(prev => ({ ...prev, isAuthenticated: true }));
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false }));
  };

  const updateConfig = (newConfig: Partial<AppState['config']>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig }
    }));
  };

  if (!state.isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
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

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6 no-print">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Clock className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            CHRONOS
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
              <img src="https://picsum.photos/seed/user/100/100" alt="user" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white">{state.config.userName}</p>
              <p className="text-xs text-slate-500">Employee ID: #29402</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 no-print">
          <div className="md:hidden flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Clock className="text-white w-5 h-5" />
             </div>
          </div>

          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-white">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('Panel', '')}
            </h2>
            <p className="text-xs text-slate-500">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
              <div className={`w-2 h-2 rounded-full animate-pulse ${todayLog.timeIn ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
              <span className="text-xs font-medium text-slate-300">
                {todayLog.timeIn ? 'Logged In' : 'Waiting for Time In'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full border border-slate-800 transition-colors">
                <Bell size={18} />
              </button>
              <button 
                onClick={() => setActiveTab('admin')}
                className={`p-2 bg-slate-900 rounded-full border border-slate-800 transition-colors ${activeTab === 'admin' ? 'text-indigo-400 border-indigo-500/50' : 'text-slate-400 hover:text-white'}`}
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Views */}
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AttendancePanel 
                  log={todayLog} 
                  config={state.config} 
                  onUpdate={updateTodayLog} 
                />
                <AnalysisPanel 
                  log={todayLog} 
                  config={state.config} 
                  currentTime={currentTime}
                />
                <InsightsPanel 
                  log={todayLog}
                  logs={state.logs}
                  config={state.config}
                  currentTime={currentTime}
                />
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <TaskPanel 
                  log={todayLog} 
                  onUpdate={updateTodayLog}
                  historicalLogs={state.logs}
                />
                <ReportsPanel 
                  logs={state.logs} 
                  config={state.config}
                />
              </div>
            </>
          )}

          {activeTab === 'attendance' && (
             <AttendancePanel 
               log={todayLog} 
               config={state.config} 
               onUpdate={updateTodayLog}
               isFullWidth 
             />
          )}

          {activeTab === 'tasks' && (
            <TaskPanel 
              log={todayLog} 
              onUpdate={updateTodayLog}
              historicalLogs={state.logs}
              isFullWidth
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPanel 
              logs={state.logs} 
              config={state.config}
              isFullWidth
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel 
              state={state}
              updateConfig={updateConfig}
            />
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-6 py-3 flex justify-between items-center no-print">
         {navItems.map(item => (
           <button 
             key={item.id}
             onClick={() => setActiveTab(item.id as any)}
             className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-indigo-500' : 'text-slate-500'}`}
           >
             <item.icon size={20} />
             <span className="text-[10px] font-medium">{item.label}</span>
           </button>
         ))}
      </nav>
    </div>
  );
};

export default App;
