import { useState, useEffect } from "react";
import AppShell from "../Layout/AppShell";
import { leaderboardApi } from "../lib/api.js";

const formatTime = (timeInSeconds) => {
  if (timeInSeconds == null) return "-";
  const m = Math.floor(timeInSeconds / 60);
  const s = (timeInSeconds % 60).toFixed(2);
  const padding = s < 10 ? `0${s}` : s;
  return `${m}:${padding}`;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await leaderboardApi.list();
        if (mounted) {
          setEntries(data || []);
          setError("");
        }
      } catch {
        if (mounted) {
          setError("Failed to load leaderboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchLeaderboard();
    return () => {
      mounted = false;
    };
  }, []);

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return { color: "#FFD700", textShadow: "0 0 8px rgba(255, 215, 0, 0.4)" }; // Gold
      case 2:
        return { color: "#C0C0C0", textShadow: "0 0 8px rgba(192, 192, 192, 0.4)" }; // Silver
      case 3:
        return { color: "#CD7F32", textShadow: "0 0 8px rgba(205, 127, 50, 0.4)" }; // Bronze
      default:
        return { color: "white" };
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Global Leaderboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">Top unassisted speedsolves ranked by verification time.</p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-neon-blue text-xs font-semibold animate-pulse">Loading leaderboard standings...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-rose-400 text-xs">{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-400 text-xs">No entries yet. Be the first to solve and claim #1!</p>
          </div>
        ) : (
          <div className="bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-dark-bg/60 border-b border-dark-border text-gray-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-center w-20">Rank</th>
                  <th className="px-5 py-3.5 font-semibold">Player</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Best Time</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40">
                {entries.map((entry) => (
                  <tr
                    key={entry.user_id || entry.rank}
                    className={`transition-colors hover:bg-white/[0.04] ${
                      entry.is_me ? "bg-neon-blue/10" : ""
                    }`}
                  >
                    <td
                      className={`px-5 py-3 text-center font-bold text-sm ${
                        entry.is_me ? "border-l-2 border-l-neon-blue" : "border-l-2 border-l-transparent"
                      }`}
                      style={getRankStyle(entry.rank)}
                    >
                      #{entry.rank}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {entry.rank === 1 && <span className="text-xs mr-1" title="Champion">👑</span>}
                          {entry.display_name}
                        </span>
                        {entry.is_me && (
                          <span className="text-[10px] bg-neon-blue text-black px-2 py-0.5 rounded-full font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-neon-green">
                      {formatTime(entry.best_time)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      {entry.efficiency != null ? `${Number(entry.efficiency).toFixed(1)}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}