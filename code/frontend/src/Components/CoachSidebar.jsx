import { useEffect, useRef, useState } from "react";
import {
  getStageGuide,
  getCenterInfo,
  CUBE_ANATOMY,
  FOUR_MOVE_SEQUENCES,
} from "../cube/stageGuides.js";
import {
  chunkMoves,
  getTurnDirection,
  TRIGGER_COLORS,
} from "../cube/triggerChunker.js";
import { useAuthStore } from "../store/authStore.js";
import { useCubeStore, MODES } from "../store/cubeStore.js";

export function Panel({ title, children, className = "" }) {
  return (
    <div
      className={`bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl p-4 shadow-sm ${className}`}
    >
      {title && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function CubeAnatomyPanel() {
  return (
    <Panel
      title={
        <div className="flex items-center justify-between w-full">
          <span className="text-white font-bold">Cube Anatomy</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-dark-border">
            26 Pieces
          </span>
        </div>
      }
      className="border-cyan-500/25"
    >
      <div className="space-y-2.5">
        {CUBE_ANATOMY.map((piece) => (
          <div
            key={piece.id}
            className={`p-2.5 rounded-xl border ${piece.cardClass} space-y-1`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">{piece.title}</span>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${piece.badgeClass}`}
              >
                {piece.stickerBadge}
              </span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              {piece.description}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function FourMovesBreakdownPanel() {
  return (
    <Panel
      title={
        <div className="flex items-center justify-between w-full">
          <span className="text-white font-bold">JPerm&apos;s 4-Move Triggers</span>
          <a
            href="https://jperm.net/3x3#4moves"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold text-neon-blue hover:underline lowercase"
          >
            jperm.net &rarr;
          </a>
        </div>
      }
      className="border-neon-blue/25"
    >
      <div className="space-y-3">
        {FOUR_MOVE_SEQUENCES.map((seq) => (
          <div
            key={seq.id}
            className={`p-3 rounded-xl border ${seq.accentClass} space-y-2`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">{seq.title}</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${seq.badgeClass}`}
              >
                {seq.formula}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {seq.steps.map((st, idx) => (
                <div
                  key={`${seq.id}-${idx}`}
                  title={st.action}
                  className="bg-dark-bg/80 border border-dark-border rounded-lg p-1.5 text-center flex flex-col items-center gap-0.5"
                >
                  <div className="flex items-center gap-0.5 font-mono text-xs font-bold text-white">
                    <span>{st.move}</span>
                    <span className="text-[10px] text-neon-blue">{st.arrow}</span>
                  </div>
                  <span className="text-[9px] text-gray-400 leading-tight line-clamp-2">
                    {st.action}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 leading-snug">{seq.note}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function CoachSidebar({ error, saveState, elapsed, turnCount }) {
  const token = useAuthStore((s) => s.token);
  const facelets = useCubeStore((s) => s.facelets);
  const mode = useCubeStore((s) => s.mode);
  const solution = useCubeStore((s) => s.solution);
  const cursor = useCubeStore((s) => s.cursor);
  const assisted = useCubeStore((s) => s.assisted);
  const solved = useCubeStore((s) => s.isSolved());
  const stage = useCubeStore((s) => s.currentStage());

  const [sidebarTab, setSidebarTab] = useState("coach"); // "coach" | "all_stages"
  const sidebarMovesRef = useRef(null);
  const allStagesRef = useRef(null);

  const activeGuide = getStageGuide(stage?.name, facelets);

  const targetCenterInfo =
    activeGuide?.targetFace &&
    activeGuide.targetFace !== "Middle" &&
    activeGuide.targetFace !== "All"
      ? getCenterInfo(facelets, activeGuide.targetFace)
      : null;
  const frontCenterInfo = getCenterInfo(facelets, "F");

  const isIntuitiveCrossStage =
    stage?.name === "Cross" || stage?.name?.toLowerCase() === "bottom cross";

  const stageChunks =
    stage && solution?.moves
      ? isIntuitiveCrossStage
        ? solution.moves.slice(stage.start, stage.end).map((m, idx) => ({
            type: "single",
            move: m,
            startIndex: stage.start + idx,
            endIndex: stage.start + idx + 1,
          }))
        : chunkMoves(
            solution.moves.slice(stage.start, stage.end),
            stage.start,
          )
      : [];

  // Auto-scroll active move in current stage moves sequence (vertical only)
  useEffect(() => {
    if (sidebarTab !== "coach") return;
    const activeEl = sidebarMovesRef.current?.querySelector('[data-active="true"]');
    const container = sidebarMovesRef.current;
    if (!activeEl || !container) return;

    const elRect = activeEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (elRect.top < containerRect.top) {
      container.scrollBy({
        top: elRect.top - containerRect.top - 8,
        behavior: "smooth",
      });
    } else if (elRect.bottom > containerRect.bottom) {
      container.scrollBy({
        top: elRect.bottom - containerRect.bottom + 8,
        behavior: "smooth",
      });
    }
  }, [cursor, stage, sidebarTab]);

  // Auto-scroll active stage card in All Stages view
  useEffect(() => {
    if (sidebarTab !== "all_stages") return;
    allStagesRef.current
      ?.querySelector('[data-active-stage="true"]')
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [cursor, stage, sidebarTab]);

  const guided = mode === MODES.GUIDED && solution;

  return (
    <div className="lg:col-span-1 flex flex-col gap-3 min-h-0 lg:h-full lg:overflow-y-auto pr-0.5">
      {solved && (
        <Panel title="Result" className="border-neon-green/40 shadow-sm">
          <div className="text-neon-green font-bold text-sm mb-1 flex items-center gap-1.5">
            <span>🎉</span>
            <span>Cube Solved!</span>
          </div>
          {!assisted && (
            <div className="text-xs text-gray-400">
              {elapsed.toFixed(1)}s &middot; {turnCount} moves
            </div>
          )}
          {saveState === "saving" && (
            <div className="text-[11px] text-gray-400 mt-1.5">
              Saving solve to your history...
            </div>
          )}
          {saveState === "saved" && (
            <div className="text-[11px] text-neon-green mt-1.5">
              ✓ Saved to your dashboard &amp; leaderboard.
            </div>
          )}
          {!token && !assisted && (
            <div className="text-[11px] text-amber-300 mt-1.5">
              Log in to save your solve to the dashboard and leaderboard.
            </div>
          )}
          {saveState && saveState !== "saving" && saveState !== "saved" && (
            <div className="text-[11px] text-rose-400 mt-1.5">
              Could not save solve: {saveState}
            </div>
          )}
        </Panel>
      )}

      {error && (
        <Panel title="Error" className="border-red-500/40">
          <div className="text-xs text-red-400">{error}</div>
        </Panel>
      )}

      {guided && (
        <>
          {/* Segmented Tab Controls: Coach & Moves vs All Stages */}
          <div className="flex rounded-xl bg-dark-bg/80 p-1 border border-dark-border text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSidebarTab("coach")}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                sidebarTab === "coach"
                  ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40 shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Coach & Moves
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("all_stages")}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                sidebarTab === "all_stages"
                  ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40 shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              All Stages ({solution.stages.length})
            </button>
          </div>

          {sidebarTab === "coach" ? (
            /* --- Tab 1: Coach & Current Stage Moves View --- */
            stage ? (
              <Panel
                title={
                  <div className="flex items-center justify-between w-full">
                    <span className="text-white font-bold">{stage.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neon-blue/15 text-neon-blue border border-neon-blue/30 font-semibold">
                      {Math.max(
                        0,
                        Math.min(
                          stage.end - stage.start,
                          cursor - stage.start,
                        ),
                      )}
                      /{stage.end - stage.start} done
                    </span>
                  </div>
                }
                className="border-neon-blue/30"
              >
                {/* The moves for this specific stage */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Stage Moves Sequence:
                  </div>
                  <div
                    ref={sidebarMovesRef}
                    className="flex flex-wrap items-center gap-1.5 max-h-48 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scroll-smooth"
                  >
                    {stageChunks.map((chunk) => {
                      if (chunk.type === "trigger") {
                        const isInside =
                          cursor >= chunk.startIndex && cursor < chunk.endIndex;
                        const isDone = cursor >= chunk.endIndex;
                        const colorPreset =
                          TRIGGER_COLORS[chunk.color] || TRIGGER_COLORS.cyan;

                        return (
                          <div
                            key={`chunk-${chunk.startIndex}`}
                            className={`p-1.5 rounded-xl border flex flex-col gap-1 transition-all w-full min-w-0 ${
                              isInside
                                ? `${colorPreset.border} bg-white/[0.04] ring-1 ring-neon-blue/30`
                                : isDone
                                  ? "border-emerald-500/20 bg-emerald-500/[0.02] opacity-80"
                                  : "border-dark-border bg-dark-bg/60"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 px-0.5">
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border select-none ${colorPreset.badge}`}
                                title={chunk.description}
                              >
                                {chunk.badge}
                              </span>
                              {isInside ? (
                                <span className="text-[9px] font-mono text-neon-blue font-bold">
                                  {cursor - chunk.startIndex + 1}/{chunk.moves.length}
                                </span>
                              ) : isDone ? (
                                <span className="text-[9px] text-emerald-400 font-bold">
                                  ✓
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {chunk.moves.map((m, idx) => {
                                const globalIdx = chunk.startIndex + idx;
                                const isCurrent = globalIdx === cursor;
                                const isPast = globalIdx < cursor;
                                const dir = getTurnDirection(m);

                                return (
                                  <span
                                    key={globalIdx}
                                    data-active={isCurrent ? "true" : undefined}
                                    title={`${m}: ${dir.label}`}
                                    className={`text-xs font-mono px-2 py-0.5 rounded-lg transition-all font-bold shrink-0 flex items-center gap-0.5 ${
                                      isCurrent
                                        ? "bg-neon-blue text-black shadow-md shadow-neon-blue/30 scale-105 border border-cyan-200 ring-1 ring-neon-blue/40"
                                        : isPast
                                          ? "bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20 line-through"
                                          : "bg-black/30 text-gray-300 border border-dark-border/60"
                                    }`}
                                  >
                                    <span>{m}</span>
                                    <span
                                      className={`text-[10px] select-none ${
                                        isCurrent
                                          ? "text-black/80 font-bold"
                                          : "text-gray-500 font-normal"
                                      }`}
                                    >
                                      {dir.arrow}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Single move
                      const globalIdx = chunk.startIndex;
                      const isCurrent = globalIdx === cursor;
                      const isPast = globalIdx < cursor;
                      const dir = getTurnDirection(chunk.move);

                      return (
                        <span
                          key={globalIdx}
                          data-active={isCurrent ? "true" : undefined}
                          title={`${chunk.move}: ${dir.label}`}
                          className={`text-xs font-mono px-2.5 py-1 rounded-xl transition-all font-bold shrink-0 flex items-center gap-1 self-center ${
                            isCurrent
                              ? "bg-neon-blue text-black shadow-lg shadow-neon-blue/30 scale-105 border-2 border-cyan-200 ring-2 ring-neon-blue/30"
                              : isPast
                                ? "bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20 line-through"
                                : "bg-dark-bg text-gray-300 border border-dark-border"
                          }`}
                        >
                          <span>{chunk.move}</span>
                          <span
                            className={`text-[10px] select-none ${
                              isCurrent
                                ? "text-black/80 font-bold"
                                : "text-gray-500 font-normal"
                            }`}
                          >
                            {dir.arrow}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Stage Algorithm box if available */}
                {activeGuide?.formula && (
                  <div className="bg-dark-bg/90 border border-dark-border rounded-xl p-2.5 text-center my-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">
                      Algorithm
                    </div>
                    <div className="font-mono text-sm font-bold text-neon-blue tracking-wider">
                      {activeGuide.formula}
                    </div>
                  </div>
                )}

                {/* Target Face & Reference Center */}
                <div className="mt-3 pt-2.5 border-t border-dark-border text-xs space-y-1.5">
                  {activeGuide?.targetFace &&
                    activeGuide.targetFace !== "Middle" &&
                    activeGuide.targetFace !== "All" && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Target Face:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">
                            {activeGuide.targetLabel ?? activeGuide.title}
                          </span>
                          {targetCenterInfo && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${targetCenterInfo.bg} ${targetCenterInfo.text} ${targetCenterInfo.border}`}
                            >
                              <span>{targetCenterInfo.dot}</span>
                              <span>{targetCenterInfo.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  {frontCenterInfo && (
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                      <span>Reference Front (F):</span>
                      <span className="font-medium text-gray-200 flex items-center gap-1">
                        <span>{frontCenterInfo.dot}</span>
                        <span>{frontCenterInfo.name}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Coach Tip & Learn */}
                {activeGuide?.tip && (
                  <p className="text-xs text-gray-300 leading-relaxed mt-3 pt-2.5 border-t border-dark-border">
                    {activeGuide.tip}
                  </p>
                )}

                {activeGuide?.learn && (
                  <div className="mt-2.5 pt-2 border-t border-dark-border text-[11px] text-gray-400 space-y-1.5">
                    {activeGuide.learn.humanNote && (
                      <p>
                        <span className="text-amber-400 font-semibold">
                          Human Tip:
                        </span>{" "}
                        {activeGuide.learn.humanNote}
                      </p>
                    )}
                    {activeGuide.learn.engineNote && (
                      <p>
                        <span className="text-neon-blue font-semibold">
                          Engine:
                        </span>{" "}
                        {activeGuide.learn.engineNote}
                      </p>
                    )}
                    {activeGuide.learn.jpermUrl && (
                      <a
                        href={activeGuide.learn.jpermUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-neon-blue hover:underline text-[10px] font-medium pt-1"
                      >
                        Learn on JPerm.net &rarr;
                      </a>
                    )}
                  </div>
                )}
              </Panel>
            ) : (
              <Panel title="Solve Complete" className="border-emerald-500/40">
                <div className="text-center py-4 space-y-2">
                  <div className="text-3xl">🎉</div>
                  <div className="font-bold text-white text-sm">
                    All Stages Solved!
                  </div>
                  <div className="text-xs text-gray-400">
                    You successfully completed all {solution.stages.length}{" "}
                    stages of the{" "}
                    {solution.method_used?.toUpperCase() || "Guided"} solve.
                  </div>
                </div>
              </Panel>
            )
          ) : (
            /* --- Tab 2: All Stages Overview View --- */
            <Panel
              title={
                <div className="flex items-center justify-between w-full">
                  <span>All Stages ({solution.stages.length})</span>
                  {solution.method_used && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        solution.method_used === "cfop"
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                          : "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                      }`}
                    >
                      {solution.method_used.toUpperCase()}
                    </span>
                  )}
                </div>
              }
            >
              <div
                ref={allStagesRef}
                className="space-y-3 max-h-[460px] overflow-y-auto pr-1"
              >
                {solution.stages.map((stg) => {
                  const isDone = cursor >= stg.end;
                  const isCurrent = stage?.name === stg.name;
                  const stageMoves = solution.moves.slice(stg.start, stg.end);
                  const movesDone = Math.max(
                    0,
                    Math.min(stg.end - stg.start, cursor - stg.start),
                  );

                  return (
                    <div
                      key={stg.name}
                      data-active-stage={isCurrent ? "true" : undefined}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? "border-neon-blue/40 bg-neon-blue/[0.04] ring-1 ring-neon-blue/20"
                          : isDone
                            ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                            : "border-dark-border bg-dark-bg/40 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCurrent
                                ? "bg-neon-blue animate-pulse"
                                : isDone
                                  ? "bg-emerald-400"
                                  : "bg-gray-600"
                            }`}
                          />
                          <span className="font-bold text-xs text-white">
                            {stg.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                            isDone
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : isCurrent
                                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                                : "bg-white/5 text-gray-400"
                          }`}
                        >
                          {isDone
                            ? "✓ Done"
                            : isCurrent
                              ? `${movesDone}/${stg.end - stg.start}`
                              : `${stg.end - stg.start} moves`}
                        </span>
                      </div>

                      {/* Move tokens for this stage */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {stageMoves.map((m, mIdx) => {
                          const globalIdx = stg.start + mIdx;
                          const isMCurrent = globalIdx === cursor;
                          const isMPast = globalIdx < cursor;
                          const dir = getTurnDirection(m);

                          return (
                            <span
                              key={globalIdx}
                              data-active={isMCurrent ? "true" : undefined}
                              title={`${m}: ${dir.label}`}
                              className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md transition-all font-bold flex items-center gap-0.5 ${
                                isMCurrent
                                  ? "bg-neon-blue text-black shadow scale-105 border border-cyan-200"
                                  : isMPast
                                    ? "text-emerald-400/70 line-through"
                                    : "text-gray-300 bg-black/20"
                              }`}
                            >
                              <span>{m}</span>
                              <span
                                className={`text-[9px] select-none ${
                                  isMCurrent ? "text-black/80 font-bold" : "text-gray-500"
                                }`}
                              >
                                {dir.arrow}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
