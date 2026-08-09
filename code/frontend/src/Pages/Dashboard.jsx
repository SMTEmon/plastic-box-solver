import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import {
  Panel,
  PageHeader,
  Stat,
  Button,
  Note,
  EmptyState,
  Spinner,
} from "../Components/ui.jsx";
import { solvesApi } from "../lib/api.js";
import { useAuthStore } from "../store/authStore.js";

const fmtTime = (s) => `${s.toFixed(2)}s`;
const fmtDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function EfficiencyBar({ value }) {
  const tone =
    value >= 70 ? "bg-neon-green" : value >= 40 ? "bg-accent-amber" : "bg-accent-rose";
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-dark-bg overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-mono text-gray-400 w-9 text-right">
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    solvesApi
      .history()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const solves = data?.solves ?? [];
  const pb = data?.personal_best ?? null;

  // Averages are computed here rather than server-side: the endpoint returns
  // the full history anyway, so an extra round trip would buy nothing.
  const avgTime = solves.length
    ? solves.reduce((a, s) => a + s.solve_time, 0) / solves.length
    : 0;
  const avgEff = solves.length
    ? solves.reduce((a, s) => a + s.efficiency, 0) / solves.length
    : 0;

  return (
    <AppShell>
      <PageHeader
        title={`Welcome back, ${user?.display_name ?? ""}`}
        subtitle="Your solve history, personal best and efficiency over time"
      >
        <Button variant="primary" onClick={() => navigate("/cube-input")}>
          New solve
        </Button>
      </PageHeader>

      {loading && <Spinner label="Loading your solves..." />}
      {error && <Note tone="error">{error}</Note>}

      {!loading && !error && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            title="Personal best"
            tone={pb ? "green" : "default"}
            className="lg:col-span-1"
          >
            {pb ? (
              <>
                <div className="text-3xl font-bold font-mono text-neon-green">
                  {fmtTime(pb.solve_time)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {pb.move_count} moves &middot; {pb.efficiency.toFixed(0)}%
                  efficient
                </div>
                <div className="text-[11px] text-gray-500 mt-2">
                  Set {fmtDate(pb.created_at)}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500 leading-relaxed">
                No personal best yet. Finish an unassisted solve and it lands
                here.
              </p>
            )}
          </Panel>

          <Panel title="Totals" className="lg:col-span-2">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Solves saved" value={solves.length} tone="blue" />
              <Stat
                label="Average time"
                value={solves.length ? fmtTime(avgTime) : "--"}
              />
              <Stat
                label="Average efficiency"
                value={solves.length ? `${avgEff.toFixed(0)}%` : "--"}
                tone="violet"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
              Efficiency compares your move count against the optimal solution
              for that exact scramble, and is calculated on the server so the
              stored number is the only one that counts. Assisted solves are
              never saved.
            </p>
          </Panel>

          <Panel title="Recent solves" className="lg:col-span-3">
            {solves.length === 0 ? (
              <EmptyState
                icon="▣"
                title="Nothing here yet"
                action={
                  <Button variant="primary" onClick={() => navigate("/cube-input")}>
                    Start your first solve
                  </Button>
                }
              >
                Solve a cube in Interactive mode without using Guided or
                Auto-Solve, and it will be saved automatically.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-dark-border">
                      <th className="font-medium py-2 px-1">When</th>
                      <th className="font-medium py-2 px-1">Time</th>
                      <th className="font-medium py-2 px-1">Moves</th>
                      <th className="font-medium py-2 px-1">Optimal</th>
                      <th className="font-medium py-2 px-1">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solves.map((s) => (
                      <tr
                        key={s.id}
                        className={`border-b border-dark-border/50 ${
                          pb && s.id === pb.id ? "bg-neon-green/5" : ""
                        }`}
                      >
                        <td className="py-2.5 px-1 text-gray-400">
                          {fmtDate(s.created_at)}
                          {pb && s.id === pb.id && (
                            <span className="ml-2 text-[10px] text-neon-green">
                              PB
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-1 font-mono text-white">
                          {fmtTime(s.solve_time)}
                        </td>
                        <td className="py-2.5 px-1 font-mono text-gray-300">
                          {s.move_count}
                        </td>
                        <td className="py-2.5 px-1 font-mono text-gray-500">
                          {s.optimal_moves}
                        </td>
                        <td className="py-2.5 px-1">
                          <EfficiencyBar value={s.efficiency} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
