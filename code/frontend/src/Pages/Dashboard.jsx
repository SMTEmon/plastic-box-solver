import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../Layout/AppShell";
import { useAuthStore } from "../store/authStore";
import { solvesApi } from "../lib/api";

function formatTime(seconds) {
  if (typeof seconds !== 'number') return '-';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, '0')}`;
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const loadingAuth = useAuthStore((s) => s.loading);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      return;
    }
    
    let active = true;
    solvesApi.history()
      .then(res => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          setLoading(false);
        }
      });
      
    return () => { active = false; };
  }, [user]);

  if (loadingAuth || loading) {
    return (
      <AppShell>
        <div className="text-white p-4">Loading...</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Dashboard</h2>
          <p className="text-gray-400 mb-6">Log in to view your solve history and statistics.</p>
          <Link to="/login" className="px-6 py-2 bg-neon-blue text-black font-semibold rounded-lg hover:bg-opacity-90 transition-colors">
            Log In
          </Link>
        </div>
      </AppShell>
    );
  }

  const solves = data?.solves || [];
  const pb = data?.personal_best;
  
  // Stats
  const totalSolves = solves.length;
  const avgTime = totalSolves > 0 ? solves.reduce((sum, s) => sum + s.solve_time, 0) / totalSolves : 0;
  const avgEff = totalSolves > 0 ? solves.reduce((sum, s) => sum + s.efficiency, 0) / totalSolves : 0;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-5 p-2 sm:p-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Welcome back, {user.display_name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Track your speedsolving records, statistics, and solve history.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PB Card */}
          <div className="border border-dark-border bg-dark-surface/90 backdrop-blur-md p-5 rounded-2xl shadow-sm hover:border-white/10 transition-all">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Personal Best</h3>
            {pb ? (
              <div>
                <div className="text-neon-green text-3xl font-bold font-mono tracking-tight">{formatTime(pb.solve_time)}</div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-300">
                  <div>
                    <span className="text-gray-500 uppercase tracking-wider text-[10px] block">Efficiency</span>
                    <span className="font-semibold text-white">{pb.efficiency?.toFixed(1)}%</span>
                  </div>
                  {pb.method && (
                    <div>
                      <span className="text-gray-500 uppercase tracking-wider text-[10px] block">Method</span>
                      <span className="font-semibold text-white uppercase">{pb.method}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-xs py-2">No completed solves yet</div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="border border-dark-border bg-dark-surface/90 backdrop-blur-md p-5 rounded-2xl shadow-sm hover:border-white/10 transition-all">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Stats Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Total Solves</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{totalSolves}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Avg Time</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{totalSolves ? formatTime(avgTime) : '-'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Avg Efficiency</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{totalSolves ? `${avgEff.toFixed(1)}%` : '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Solves Table */}
        <div className="border border-dark-border bg-dark-surface/90 backdrop-blur-md p-5 rounded-2xl shadow-sm overflow-x-auto">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent Solves</h3>
          {solves.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-dark-border text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Time</th>
                  <th className="py-2.5 px-3 font-semibold">Moves</th>
                  <th className="py-2.5 px-3 font-semibold">Efficiency</th>
                  <th className="py-2.5 px-3 font-semibold">Method</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-dark-border/40">
                {solves.slice(0, 10).map(solve => (
                  <tr key={solve.id} className="even:bg-white/[0.01] hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                      {new Date(solve.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {formatTime(solve.solve_time)}
                    </td>
                    <td className="py-2.5 px-3 text-gray-300">
                      {solve.move_count} <span className="text-gray-500 text-[11px]">(cfop {solve.optimal_moves})</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                      {solve.efficiency?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-gray-400 uppercase text-[11px]">
                      {solve.method || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500 italic py-6 text-xs text-center">No recent solves recorded yet</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}