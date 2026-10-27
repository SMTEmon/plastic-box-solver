import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../Layout/AppShell";
import { useAuthStore } from "../store/authStore";
import { useCubeStore } from "../store/cubeStore";
import { solvesApi, authApi } from "../lib/api";

function formatTime(seconds) {
  if (typeof seconds !== "number") return "-";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, "0")}`;
}

const PAGE_SIZE = 10;

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loadingAuth = useAuthStore((s) => s.loading);
  const loadReplay = useCubeStore((s) => s.loadReplay);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [page, setPage] = useState(1);

  // Edit Profile / Display Name State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const fetchHistory = useCallback(
    async (currentPage = 1) => {
      if (!user) return;
      setLoading(true);
      try {
        const offset = (currentPage - 1) * PAGE_SIZE;
        const res = await solvesApi.history(PAGE_SIZE, offset);
        setData(res);
      } catch (err) {
        console.error("Failed to load solve history:", err);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchHistory(page);
  }, [fetchHistory, page]);

  const handleOpenEditProfile = () => {
    if (!user) return;
    setEditName(user.display_name || "");
    setProfileError("");
    setShowEditProfile(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const cleanName = editName.trim();
    if (!cleanName) {
      setProfileError("Display name cannot be empty");
      return;
    }
    setSavingProfile(true);
    setProfileError("");
    try {
      const updated = await authApi.updateProfile({
        display_name: cleanName,
      });
      useAuthStore.setState({ user: { ...user, ...updated } });
      setShowEditProfile(false);
    } catch (err) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleReplay = (solve) => {
    if (!solve?.scramble) return;
    loadReplay(solve.scramble, solve.solution || "", solve.optimal_moves || 0);
    navigate("/solve");
  };

  if (loadingAuth) {
    return (
      <AppShell>
        <div className="text-white p-4">Loading user profile...</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Dashboard</h2>
          <p className="text-gray-400 mb-6">Log in to view your solve history and statistics.</p>
          <Link
            to="/login"
            className="px-6 py-2 bg-neon-blue text-black font-semibold rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Log In
          </Link>
        </div>
      </AppShell>
    );
  }

  const solves = data?.solves || [];
  const pb = data?.personal_best;
  const totalCount = data?.total !== undefined ? data.total : solves.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const avgTime = solves.length > 0 ? solves.reduce((sum, s) => sum + s.solve_time, 0) / solves.length : 0;
  const avgEff = solves.length > 0 ? solves.reduce((sum, s) => sum + s.efficiency, 0) / solves.length : 0;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-5 p-2 sm:p-4">
        {/* ── User Profile Header (Display Name, Email, Member Since) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-dark-border bg-dark-surface/90 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-neon-blue text-lg bg-neon-blue/15 border border-neon-blue/30 shadow-inner">
              {user.display_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{user.display_name}</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span>{user.email}</span>
                {user.created_at && (
                  <>
                    <span>•</span>
                    <span>
                      Member since{" "}
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEditProfile}
            className="self-start sm:self-center px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-neon-blue/40 bg-white/5 hover:bg-neon-blue/10 text-xs text-gray-300 hover:text-neon-blue font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>✏️</span>
            <span>Edit Name</span>
          </button>
        </div>

        {/* ── Top Summary Grid: PB Card & Stats Summary ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PB Card with Metadata & 3D Replay Button */}
          <div className="border border-dark-border bg-dark-surface/90 backdrop-blur-md p-5 rounded-2xl shadow-sm hover:border-white/10 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <span>🏆</span>
                  <span>Personal Best</span>
                </h3>
                {pb && (
                  <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-2 py-0.5 rounded border border-neon-green/20">
                    Fastest Solve
                  </span>
                )}
              </div>

              {pb ? (
                <div>
                  <div className="text-neon-green text-3xl font-bold font-mono tracking-tight">
                    {formatTime(pb.solve_time)}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-300">
                    <div className="p-2 rounded-xl bg-dark-bg/60 border border-dark-border/40">
                      <span className="text-gray-500 uppercase tracking-wider text-[9px] block">Efficiency</span>
                      <span className="font-semibold text-white font-mono">{pb.efficiency?.toFixed(1)}%</span>
                    </div>

                    <div className="p-2 rounded-xl bg-dark-bg/60 border border-dark-border/40">
                      <span className="text-gray-500 uppercase tracking-wider text-[9px] block">Moves Done</span>
                      <span className="font-semibold text-white font-mono">
                        {pb.move_count}{" "}
                        <span className="text-gray-500 text-[10px] font-normal">(cfop {pb.optimal_moves})</span>
                      </span>
                    </div>
                  </div>

                  {pb.created_at && (
                    <div className="mt-2.5 text-[11px] text-gray-400 flex items-center gap-1.5">
                      <span>🕒 Achieved on:</span>
                      <span className="text-gray-300 font-medium">
                        {new Date(pb.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 italic text-xs py-4">No completed solves yet</div>
              )}
            </div>

            {pb && pb.scramble && (
              <div className="mt-4 pt-3 border-t border-dark-border/60">
                <button
                  type="button"
                  onClick={() => handleReplay(pb)}
                  className="w-full py-2 px-3 rounded-xl bg-neon-green/10 hover:bg-neon-green/20 text-neon-green border border-neon-green/30 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>▶</span>
                  <span>Replay Personal Best in 3D</span>
                </button>
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="border border-dark-border bg-dark-surface/90 backdrop-blur-md p-5 rounded-2xl shadow-sm hover:border-white/10 transition-all flex flex-col justify-between">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <span>📊</span>
                <span>Stats Summary</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-dark-bg/60 border border-dark-border/40">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Total Solves</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{totalCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-dark-bg/60 border border-dark-border/40">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Sample Avg</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {solves.length ? formatTime(avgTime) : "-"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-dark-bg/60 border border-dark-border/40">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Avg Eff</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {solves.length ? `${avgEff.toFixed(1)}%` : "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl border border-dark-border/40 bg-dark-bg/40 text-[11px] text-gray-400">
              💡 Tip: Click <strong className="text-neon-blue">Replay</strong> on any solve to open the 3D playback and examine your turns step-by-step.
            </div>
          </div>
        </div>

        {/* ── Paginated Solve History Table (Replay & Pagination) ── */}
        <div className="border border-dark-border bg-dark-surface/90 backdrop-blur-md p-5 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>📜</span>
                <span>Solve History</span>
              </h3>
              <p className="text-xs text-gray-400">
                {totalCount > 0
                  ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount} recorded solves`
                  : "No recorded solves"}
              </p>
            </div>

            {/* Pagination Controls Top */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-dark-border bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  ← Prev
                </button>
                <span className="font-mono text-gray-400 px-1 text-[11px]">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-dark-border bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-gray-400">Loading solves...</div>
            ) : solves.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-dark-border text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Time</th>
                    <th className="py-2.5 px-3 font-semibold">Moves</th>
                    <th className="py-2.5 px-3 font-semibold">Efficiency</th>
                    <th className="py-2.5 px-3 font-semibold text-right">3D Replay</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-dark-border/40">
                  {solves.map((solve) => (
                    <tr key={solve.id} className="even:bg-white/[0.01] hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                        {new Date(solve.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {formatTime(solve.solve_time)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-300">
                        {solve.move_count}{" "}
                        <span className="text-gray-500 text-[11px]">(cfop {solve.optimal_moves})</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                        {solve.efficiency?.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {solve.scramble ? (
                          <button
                            type="button"
                            onClick={() => handleReplay(solve)}
                            className="px-2.5 py-1 rounded-lg bg-neon-blue/15 hover:bg-neon-blue/25 text-neon-blue border border-neon-blue/30 font-semibold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                            title="Open 3D animated playback of this solve"
                          >
                            <span>▶</span>
                            <span>Replay</span>
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[11px] italic">No moves</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-gray-500 italic py-8 text-xs text-center">No recent solves recorded yet</div>
            )}
          </div>

          {/* Pagination Controls Bottom */}
          {totalPages > 1 && (
            <div className="pt-4 border-t border-dark-border/60 flex items-center justify-between text-xs">
              <span className="text-gray-500 text-[11px]">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-dark-border bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-dark-border bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Edit Display Name ── */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-surface border border-dark-border rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-dark-border/60 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✏️</span>
                <span>Edit Display Name</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="text-gray-400 hover:text-white text-lg p-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {profileError && (
              <div className="text-xs text-rose-400 mb-3 border border-rose-500/30 bg-rose-500/10 rounded-xl p-2.5">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-neon-blue/50"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-border/60">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="px-4 py-2 rounded-xl border border-dark-border text-xs text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-xl bg-neon-blue text-black font-bold text-xs hover:bg-neon-blue/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Name"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}