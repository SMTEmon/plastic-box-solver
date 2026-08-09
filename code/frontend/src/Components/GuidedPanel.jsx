import { describeMove, shortLabel, STAGE_HELP } from "../cube/notation.js";
import { Button } from "./ui.jsx";

/**
 * Guided Mode's instruction, as the main event.
 *
 * This used to be one card among eight in a 320px sidebar, which is exactly
 * backwards: in Guided Mode the instruction IS the product and the 3D cube is
 * the illustration. So it sits directly under the cube, full width, at a size
 * you can read from across a desk.
 */

/** Horizontal stage tracker -- where you are in the seven-stage journey. */
export function StageProgress({ stages, cursor, currentStage }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {stages.map((s, i) => {
        const done = cursor >= s.end;
        const active = currentStage?.name === s.name;
        const pct = active
          ? Math.min(100, ((cursor - s.start) / Math.max(1, s.end - s.start)) * 100)
          : done
            ? 100
            : 0;
        return (
          <div key={s.name} className="flex items-center gap-1 shrink-0">
            <div
              className={`relative px-2.5 py-1.5 rounded-lg border text-[11px] whitespace-nowrap overflow-hidden ${
                active
                  ? "border-accent-violet text-accent-violet bg-accent-violet/10"
                  : done
                    ? "border-neon-green/30 text-neon-green/80"
                    : "border-dark-border text-gray-600"
              }`}
            >
              <span
                className="absolute inset-y-0 left-0 bg-accent-violet/15 transition-[width]"
                style={{ width: `${pct}%` }}
              />
              <span className="relative">
                {done && !active ? "✓ " : ""}
                {s.name}
              </span>
            </div>
            {i < stages.length - 1 && (
              <span className="text-gray-700 text-[10px]">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function GuidedPanel({
  solution,
  cursor,
  facelets,
  currentStage,
  onBack,
  onNext,
  onPlayStage,
  busy,
}) {
  const atEnd = cursor >= solution.moves.length;
  const stageHelp = currentStage ? STAGE_HELP[currentStage.name] : null;

  if (atEnd) {
    return (
      <div className="rounded-2xl border border-neon-green/50 bg-neon-green/5 p-6 text-center pbs-enter">
        <div className="text-2xl mb-2">✓</div>
        <div className="text-lg font-bold text-neon-green">
          That&apos;s the whole solution
        </div>
        <p className="text-xs text-gray-400 mt-1">
          All {solution.moves.length} moves played. The cube is solved.
        </p>
        <Button variant="ghost" className="mt-4" onClick={onBack}>
          ← Step back through it
        </Button>
      </div>
    );
  }

  const d = describeMove(solution.moves[cursor], facelets);
  const upcoming = solution.moves.slice(cursor + 1, cursor + 5);

  return (
    <div className="rounded-2xl border border-accent-violet/45 bg-gradient-to-br from-accent-violet/10 to-transparent p-5 pbs-enter">
      <div className="flex items-start gap-4">
        {/* Which piece to grab, as a colour you can look for. */}
        <div className="shrink-0 text-center">
          <div
            className="w-16 h-16 rounded-2xl border-2 border-white/20 grid place-items-center text-3xl shadow-lg"
            style={{ background: d.colourHex ?? "#1e1e3a" }}
          >
            <span
              style={{ color: d.colour === "w" || d.colour === "y" ? "#0a0a16" : "#fff" }}
            >
              {d.arrow}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1.5 font-mono">
            {d.token}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.13em] text-accent-violet mb-1">
            Step {cursor + 1} of {solution.moves.length}
          </div>
          <h3 className="text-xl font-bold text-white leading-tight">
            {d.headline}
          </h3>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed">
            {d.instruction}
          </p>
          {d.warning && (
            <p className="text-xs text-accent-amber mt-2 leading-relaxed">
              {d.warning}
            </p>
          )}
        </div>
      </div>

      {stageHelp && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-[11px] text-gray-400">
            <span className="text-white font-semibold">
              Right now you are building: {currentStage.name}.
            </span>{" "}
            {stageHelp.goal}
          </div>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
            {stageHelp.detail}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button size="md" onClick={onBack} disabled={cursor <= 0 || busy}>
          ← Back
        </Button>
        <Button
          size="md"
          variant="violet"
          onClick={onNext}
          disabled={busy}
          className="min-w-[9rem]"
        >
          Done — next step →
        </Button>
        <Button size="md" onClick={onPlayStage} disabled={busy}>
          Play this whole stage
        </Button>

        {upcoming.length > 0 && (
          <div className="ml-auto text-[11px] text-gray-500 hidden sm:block">
            next up:{" "}
            <span className="text-gray-400">
              {upcoming.map(shortLabel).join(" · ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
