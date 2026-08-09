import { useState } from "react";
import { Panel, Button, Note } from "./ui.jsx";
import { cubeApi } from "../lib/api.js";

/**
 * Solve the same cube three ways, side by side.
 *
 * This is the clearest answer to "why does your project use more than one
 * solver?" -- run it on one cube and the trade-off is obvious: Kociemba is
 * short and unreadable, the beginner method is long and teachable, CFOP sits
 * in between.
 *
 * Fetched on demand rather than on page load: three solves is a second or two
 * of work and nobody needs it until they ask.
 */

const TONE = {
  optimal: "text-neon-blue",
  cfop: "text-accent-pink",
  beginner: "text-accent-violet",
};
const BAR = {
  optimal: "bg-neon-blue",
  cfop: "bg-accent-pink",
  beginner: "bg-accent-violet",
};

export default function MethodComparison({ facelets }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setData(await cubeApi.compare(facelets));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const longest = data
    ? Math.max(...data.results.filter((r) => r.available).map((r) => r.moveCount), 1)
    : 1;

  return (
    <Panel
      compact
      collapsible
      defaultOpen={false}
      title="Compare methods"
      action={
        data && (
          <button
            onClick={run}
            disabled={busy}
            className="text-[11px] text-gray-500 hover:text-white cursor-pointer"
          >
            re-run
          </button>
        )
      }
    >
      {!data && (
        <>
          <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
            Solve this exact cube with all three algorithms and compare the
            move counts.
          </p>
          <Button className="w-full" onClick={run} disabled={busy}>
            {busy ? "Solving three ways..." : "Run comparison"}
          </Button>
        </>
      )}

      {error && <Note tone="error">{error}</Note>}

      {data && (
        <div className="space-y-3">
          {data.results.map((r) => (
            <div key={r.method}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-xs font-semibold ${TONE[r.method]}`}>
                  {r.label}
                </span>
                <span className="text-xs font-mono text-white shrink-0">
                  {r.available ? `${r.moveCount} moves` : "unavailable"}
                </span>
              </div>

              {r.available ? (
                <div className="mt-1.5 h-1.5 rounded-full bg-dark-bg overflow-hidden">
                  <div
                    className={`h-full ${BAR[r.method]} transition-[width]`}
                    style={{ width: `${(r.moveCount / longest) * 100}%` }}
                  />
                </div>
              ) : (
                <p className="text-[11px] text-accent-amber mt-1 leading-relaxed">
                  {r.detail}
                </p>
              )}

              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                {r.note}
              </p>
            </div>
          ))}

          <p className="text-[10px] text-gray-600 leading-relaxed pt-1 border-t border-dark-border">
            Kociemba is the efficiency denominator, not a teaching method — its
            moves are near-optimal but arbitrary, so Guided Mode does not offer
            it.
          </p>
        </div>
      )}
    </Panel>
  );
}
