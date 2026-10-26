import React from "react";
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_STAGES,
} from "../cube/tutorialData.js";
import { useTutorialStore } from "../store/tutorialStore.js";

const DIFFICULTY_CLASSES = {
  Beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Intermediate: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Advanced: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

export default function TutorialStagePicker() {
  const activeCategory = useTutorialStore((s) => s.activeCategory);
  const setActiveCategory = useTutorialStore((s) => s.setActiveCategory);
  const selectStage = useTutorialStore((s) => s.selectStage);
  const casesSolved = useTutorialStore((s) => s.casesSolved);

  const filteredStages = TUTORIAL_STAGES.filter(
    (s) => s.category === activeCategory,
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-2 sm:p-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-gradient-to-br from-dark-surface via-dark-surface/90 to-blue-950/20 p-6 backdrop-blur-md shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-neon-blue/15 text-neon-blue border border-neon-blue/30">
                Algorithm Academy
              </span>
              {casesSolved > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {casesSolved} Cases Mastered
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Interactive Tutorials & Formula Practice
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
              Learn speedcubing algorithms hands-on. Each session dynamically scrambles a real cube
              and solves up to your target stage. Execute the formula cleanly — if you make a wrong turn,
              the cube automatically resets so you lock in muscle memory!
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center min-w-[120px]">
              <div className="text-xl font-bold font-mono text-neon-blue">
                {TUTORIAL_STAGES.length}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                Practice Stages
              </div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center min-w-[120px]">
              <div className="text-xl font-bold font-mono text-emerald-400">
                {casesSolved}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                Completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-dark-border">
        {TUTORIAL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
              activeCategory === cat
                ? "bg-neon-blue/15 text-white border-neon-blue/40 shadow-sm shadow-neon-blue/10"
                : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStages.map((stage) => (
          <div
            key={stage.id}
            className="group flex flex-col justify-between rounded-2xl border border-dark-border bg-dark-surface/90 hover:border-neon-blue/40 p-5 backdrop-blur-md transition-all duration-200 hover:shadow-lg hover:shadow-neon-blue/5 hover:-translate-y-0.5"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    DIFFICULTY_CLASSES[stage.difficulty] ||
                    "bg-gray-500/10 text-gray-400 border-gray-500/30"
                  }`}
                >
                  {stage.difficulty}
                </span>
                <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                  {stage.stage_name}
                </span>
              </div>

              <h3 className="text-base font-bold text-white tracking-tight group-hover:text-neon-blue transition-colors">
                {stage.title}
              </h3>

              <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                {stage.description}
              </p>

              {/* Formula Badge */}
              <div className="mt-4 p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-gray-200 flex items-center justify-between">
                <span className="text-neon-blue font-semibold truncate mr-2">
                  {stage.formula}
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0">
                  {stage.formula_name}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-dark-border/80 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <span>⚡ Dynamic scramble</span>
              </span>

              <button
                type="button"
                onClick={() => selectStage(stage.id)}
                className="px-3.5 py-1.5 rounded-xl bg-neon-blue/10 hover:bg-neon-blue hover:text-black text-neon-blue font-semibold text-xs border border-neon-blue/30 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>Practice Now</span>
                <span>→</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
