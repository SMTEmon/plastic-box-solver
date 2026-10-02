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
      } catch (err) {
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
        return { color: "#FFD700" }; // Gold
      case 2:
        return { color: "#C0C0C0" }; // Silver
      case 3:
        return { color: "#CD7F32" }; // Bronze
      default:
        return { color: "white" };
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white mb-2">Global Leaderboard</h2>
        <p className="text-gray-400 mb-8">Top solvers ranked by best time</p>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-neon-blue animate-pulse">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-dark-surface border border-dark-border rounded-xl p-8 text-center">
            <p className="text-gray-400">No entries yet. Be the first to solve!</p>
          </div>
        ) : (
          <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-dark-bg/50 border-b border-dark-border text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-semibold text-center w-24">Rank</th>
                  <th className="px-6 py-4 font-semibold">Player</th>
                  <th className="px-6 py-4 font-semibold text-right">Best Time</th>
                  <th className="px-6 py-4 font-semibold text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {entries.map((entry) => (
                  <tr
                    key={entry.user_id || entry.rank}
                    className={`transition-colors hover:bg-white/5 ${
                      entry.is_me ? "bg-neon-blue/10" : ""
                    }`}
                  >
                    <td
                      className={`px-6 py-4 text-center font-bold text-lg ${
                        entry.is_me ? "border-l-4 border-l-neon-blue" : "border-l-4 border-l-transparent"
                      }`}
                      style={getRankStyle(entry.rank)}
                    >
                      #{entry.rank}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{entry.display_name}</span>
                        {entry.is_me && (
                          <span className="text-xs bg-neon-blue text-dark-bg px-2 py-0.5 rounded-full font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-neon-green">
                      {formatTime(entry.best_time)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-300">
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