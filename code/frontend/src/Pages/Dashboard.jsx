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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
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
      <div className="max-w-5xl mx-auto space-y-6 p-4">
        <h2 className="text-2xl font-bold text-white">Welcome back, {user.display_name}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PB Card */}
          <div className="border border-dark-border bg-dark-surface p-4 rounded-xl hover:border-white/10 hover:-translate-y-0.5 transition-all duration-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Personal Best</h3>
            {pb ? (
              <div>
                <div className="text-neon-green text-3xl font-bold font-mono drop-shadow-[0_0_8px_rgba(57,255,20,0.3)]">{formatTime(pb.solve_time)}</div>
                <div className="mt-2 text-sm text-gray-300">
                  <span className="text-gray-500 uppercase tracking-wider text-[10px]">Efficiency:</span> {pb.efficiency?.toFixed(1)}%
                </div>
                {pb.method && (
                  <div className="text-sm text-gray-300 mt-1">
                    <span className="text-gray-500 uppercase tracking-wider text-[10px]">Method:</span> {pb.method}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 italic text-sm">No solves yet</div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="border border-dark-border bg-dark-surface p-4 rounded-xl hover:border-white/10 hover:-translate-y-0.5 transition-all duration-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Stats Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Total Solves</div>
                <div className="text-lg font-bold font-mono text-white">{totalSolves}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Avg Time</div>
                <div className="text-lg font-bold font-mono text-white">{totalSolves ? formatTime(avgTime) : '-'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Avg Efficiency</div>
                <div className="text-lg font-bold font-mono text-white">{totalSolves ? `${avgEff.toFixed(1)}%` : '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Solves Table */}
        <div className="border border-dark-border bg-dark-surface p-4 rounded-xl overflow-x-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent Solves</h3>
          {solves.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-dark-border text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="py-2 px-2 font-normal">Date</th>
                  <th className="py-2 px-2 font-normal">Time</th>
                  <th className="py-2 px-2 font-normal">Moves</th>
                  <th className="py-2 px-2 font-normal">Efficiency</th>
                  <th className="py-2 px-2 font-normal">Method</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {solves.slice(0, 10).map(solve => (
                  <tr key={solve.id} className="border-b border-dark-border/50 even:bg-white/[0.02] hover:bg-white/5 transition-colors">
                    <td className="py-2 px-2 text-gray-400 whitespace-nowrap">
                      {new Date(solve.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-2 px-2 font-mono text-white">
                      {formatTime(solve.solve_time)}
                    </td>
                    <td className="py-2 px-2 text-gray-300">
                      {solve.move_count} <span className="text-gray-600 text-xs">(opt {solve.optimal_moves})</span>
                    </td>
                    <td className="py-2 px-2 font-mono text-white">
                      {solve.efficiency?.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-gray-400">
                      {solve.method || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500 italic py-4 text-sm">No recent solves</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}