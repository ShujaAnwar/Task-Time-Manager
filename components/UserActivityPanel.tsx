
import React, { useState, useMemo } from 'react';
import { Activity, Clock, CheckCircle2, AlertCircle, Search, User, Filter, ArrowUpRight } from 'lucide-react';
import { AppState, DayLog, Task } from '../types';
import { formatMinutesToDisplay } from '../utils/time';

interface Props {
  state: AppState;
}

const UserActivityPanel: React.FC<Props> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return state.config.users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.config.users, searchTerm]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const userSummary: any[] = [];

    state.config.users.forEach(user => {
      const logs = state.userLogs[user.id] || {};
      const todayLog = logs[today];
      const allTasks = Object.values(logs).flatMap(l => (l as DayLog).tasks);
      const completedTasks = allTasks.filter(t => t.status === 'completed');
      
      const totalActual = allTasks.reduce((s, t) => s + t.actualDuration, 0);
      const totalEst = allTasks.reduce((s, t) => s + t.duration, 0);

      userSummary.push({
        id: user.id,
        name: user.name,
        role: user.role,
        isClockedIn: todayLog?.timeIn && !todayLog?.timeOut,
        lastTimeIn: todayLog?.timeIn || '—',
        taskCount: allTasks.length,
        completionRate: allTasks.length > 0 ? (completedTasks.length / allTasks.length * 100).toFixed(0) : 0,
        efficiency: totalEst > 0 ? (totalEst / totalActual * 100).toFixed(0) : 100,
        activeTasks: (todayLog?.tasks || []).filter(t => t.status === 'pending').length
      });
    });

    return userSummary;
  }, [state.config.users, state.userLogs]);

  const selectedUserDetails = useMemo(() => {
    if (!selectedUserId) return null;
    const logs = state.userLogs[selectedUserId] || {};
    const tasks = Object.values(logs).flatMap(l => (l as DayLog).tasks).sort((a, b) => b.createdAt - a.createdAt);
    const user = state.config.users.find(u => u.id === selectedUserId);
    return { user, tasks, logs };
  }, [selectedUserId, state.userLogs, state.config.users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-indigo-400" /> Organizational Activity
          </h2>
          <p className="text-xs text-slate-500 font-medium">Real-time monitoring of workforce output and task status.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Search employees..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase tracking-widest font-black text-slate-500">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Efficiency</th>
                  <th className="px-6 py-4 text-center">Completion</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stats.filter(s => filteredUsers.some(u => u.id === s.id)).map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black">{s.id}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${s.isClockedIn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {s.isClockedIn ? `In @ ${s.lastTimeIn}` : 'Away'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-indigo-400">{s.efficiency}%</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-400">{s.completionRate}%</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedUserId(s.id)}
                        className="text-xs font-bold text-indigo-400 hover:text-white uppercase tracking-widest"
                      >
                        Drill Down
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {selectedUserDetails ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedUserDetails.user?.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{selectedUserId}</p>
                </div>
                <button onClick={() => setSelectedUserId(null)} className="text-[10px] uppercase font-black text-slate-500 hover:text-white">Close</button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-black border-b border-slate-800 pb-2">Recent User Tasks</p>
                {selectedUserDetails.tasks.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No tasks logged by this user.</p>
                ) : (
                  selectedUserDetails.tasks.slice(0, 10).map(t => (
                    <div key={t.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-white truncate pr-2">{t.title}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${t.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Actual: {formatMinutesToDisplay(t.actualDuration)}</span>
                        <span>Plan: {formatMinutesToDisplay(t.duration)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/20 border border-slate-800/50 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
              <User size={48} className="text-slate-800 mb-4" />
              <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">Select an Employee</p>
              <p className="text-[10px] text-slate-800 font-medium mt-1">View task breakdowns and efficiency audits</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserActivityPanel;
