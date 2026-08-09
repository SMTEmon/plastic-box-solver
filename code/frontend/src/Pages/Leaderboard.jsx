import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import {
  Panel,
  PageHeader,
  Button,
  Note,
  EmptyState,
  Spinner,
} from "../Components/ui.jsx";
import { leaderboardApi } from "../lib/api.js";
import { useAuthStore } from "../store/authStore.js";

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  // The endpoint uses get_optional_user, so it works logged out AND flags the
  // caller's own row when signed in. Refetch on login so `is_me` appears.
  useEffect(() => {
    let cancelled = false;
    leaderboardApi
      .list()
      .then((d) => !cancelled && setRows(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AppShell>
      <PageHeader
        title="Leaderboard"
        subtitle="Every player's fastest unassisted solve, ranked. Ties broken by efficiency."
      >
        {!token && (
          <Button variant="primary" onClick={() => navigate("/register")}>
            Join the board
          </Button>
        )}
      </PageHeader>

      {error && <Note tone="error">{error}</Note>}
      {!rows && !error && <Spinner label="Loading rankings..." />}

      {rows && (
        <Panel title={`Top ${rows.length || ""} players`.trim()}>
          {rows.length === 0 ? (
            <EmptyState
              icon="▲"
              title="No solves recorded yet"
              action={
                <Button variant="primary" onClick={() => navigate("/cube-input")}>
                  Be the first
                </Button>
              }
            >
              Finish a solve in Interactive mode without using Guided or
              Auto-Solve and you will appear here.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-dark-border">
                    <th className="font-medium py-2 px-2 w-16">Rank</th>
                    <th className="font-medium py-2 px-2">Player</th>
                    <th className="font-medium py-2 px-2">Best time</th>
                    <th className="font-medium py-2 px-2">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.user_id}
                      className={`border-b border-dark-border/50 transition-colors ${
                        r.is_me
                          ? "bg-neon-blue/10 ring-1 ring-inset ring-neon-blue/30"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-3 px-2 font-mono text-gray-400">
                        {MEDALS[r.rank] ?? `#${r.rank}`}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={r.is_me ? "text-neon-blue font-semibold" : "text-white"}
                        >
                          {r.display_name}
                        </span>
                        {r.is_me && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neon-blue/20 text-neon-blue">
                            you
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 font-mono text-white">
                        {r.best_time.toFixed(2)}s
                      </td>
                      <td className="py-3 px-2 font-mono text-gray-400">
                        {r.efficiency.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
            Only unassisted solves count. Using Guided or Auto-Solve flags the
            attempt, and flagged attempts are never submitted &mdash; that is
            what keeps this board meaningful.
          </p>
        </Panel>
      )}
    </AppShell>
  );
}
