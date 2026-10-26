import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTutorialStore } from "../store/tutorialStore.js";

const CELEBRATION_COLORS = [
  "#00f3ff", // neon cyan
  "#ffffff", // white
  "#facc15", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#ef4444", // red
  "#f97316", // orange
];

export default function TutorialCelebration({
  currentCase,
  onNextCase,
  onChooseAnother,
}) {
  const canvasRef = useRef(null);
  const casesSolved = useTutorialStore((s) => s.casesSolved);
  const wrongMovesCount = useTutorialStore((s) => s.wrongMovesCount);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animId;
    const particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn 80 confetti particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 150,
        y: canvas.height * 0.45 + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 6 + 3,
        color:
          CELEBRATION_COLORS[
            Math.floor(Math.random() * CELEBRATION_COLORS.length)
          ],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        alpha: 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98; // friction
        p.rotation += p.vRot;
        p.alpha -= 0.007;

        if (p.alpha > 0) {
          alive++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (alive > 0) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-morph-in">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      />

      <div className="relative z-10 w-full max-w-md p-6 sm:p-7 rounded-3xl border border-neon-blue/40 bg-dark-surface/95 backdrop-blur-xl shadow-2xl text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-neon-blue flex items-center justify-center text-2xl shadow-lg shadow-neon-blue/30 animate-bounce">
          ✓
        </div>

        <div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Case Mastered!
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-2">
            Formula Completed!
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            You successfully applied the formula on this scrambled state.
          </p>
        </div>

        {/* Formula Display Box */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">
            {currentCase.formula_name}
          </div>
          <div className="font-mono text-sm sm:text-base font-bold text-neon-blue tracking-wide">
            {currentCase.formula}
          </div>
        </div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Moves Executed
            </div>
            <div className="font-mono font-bold text-white text-base mt-0.5">
              {currentCase.target_moves?.length || 0}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Cases Solved
            </div>
            <div className="font-mono font-bold text-emerald-400 text-base mt-0.5">
              {casesSolved}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onNextCase}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-neon-blue/20 transition-all cursor-pointer active:scale-95"
          >
            <span>Next Random Case</span>
            <span>⚡</span>
          </button>

          <button
            type="button"
            onClick={onChooseAnother}
            className="w-full py-2.5 px-4 rounded-xl border border-dark-border bg-dark-bg hover:bg-white/5 text-gray-300 hover:text-white font-semibold text-xs transition-all cursor-pointer"
          >
            Choose Another Tutorial
          </button>
        </div>

        {/* Quick Links */}
        <div className="pt-2 border-t border-dark-border flex items-center justify-center gap-4 text-[11px] text-gray-500">
          <Link
            to="/solve"
            className="hover:text-neon-blue transition-colors"
          >
            Solve Workspace →
          </Link>
          <span>•</span>
          <Link
            to="/dashboard"
            className="hover:text-neon-blue transition-colors"
          >
            Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
