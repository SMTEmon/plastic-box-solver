/**
 * NetEditor — a clickable 2D cube net for manual sticker entry (FR-05).
 *
 * Renders the six faces in a cross/T layout.  The user selects a paint colour
 * from the palette and clicks stickers to assign them.  Centre stickers are
 * locked (they define the colour scheme).  Right-click clears a sticker.
 *
 * Props:
 *   initialFacelets  54-char string to pre-fill (e.g. from a scan result),
 *                    or null/undefined to start with only centres set.
 *   onChange         (facelets: string | null) => void
 *                    Called on every sticker change.  Receives the 54-char
 *                    string when all stickers are filled, or null otherwise.
 */

import { useState, useCallback, useEffect } from "react";

/* ── constants ─────────────────────────────────────────────────────────── */

/** Cross layout — adapts between 3-column vertical cross on mobile and 4-column cross on desktop.
 *  fi = index in URFDLB order (the canonical facelet index base). */
const NET_LAYOUT = [
  { face: "U", fi: 0, name: "UP (WHITE)", pos: "row-start-1 col-start-2 md:row-start-1 md:col-start-2" },
  { face: "L", fi: 4, name: "LEFT (ORANGE)", pos: "row-start-2 col-start-1 md:row-start-2 md:col-start-1" },
  { face: "F", fi: 2, name: "FRONT (GREEN)", pos: "row-start-2 col-start-2 md:row-start-2 md:col-start-2" },
  { face: "R", fi: 1, name: "RIGHT (RED)", pos: "row-start-2 col-start-3 md:row-start-2 md:col-start-3" },
  { face: "D", fi: 3, name: "DOWN (YELLOW)", pos: "row-start-3 col-start-2 md:row-start-3 md:col-start-2" },
  { face: "B", fi: 5, name: "BACK (BLUE)", pos: "row-start-4 col-start-2 md:row-start-2 md:col-start-4" },
];

/** Standard western colour scheme — centres are fixed. */
const CENTRE_COLOURS = ["w", "r", "g", "y", "o", "b"]; // U R F D L B

const COLOURS = ["w", "y", "r", "o", "g", "b"];

const COLOUR_HEX = {
  w: "#ffffff",
  y: "#ffd400",
  r: "#ff4d4d",
  o: "#ff8c00",
  g: "#10b981",
  b: "#3b82f6",
};

const COLOUR_NAMES = {
  w: "White",
  y: "Yellow",
  r: "Red",
  o: "Orange",
  g: "Green",
  b: "Blue",
};

/* ── helpers ───────────────────────────────────────────────────────────── */

function buildInitialStickers(facelets) {
  const arr =
    facelets && facelets.length === 54
      ? facelets.toLowerCase().split("")
      : Array(54).fill(null);
  for (let fi = 0; fi < 6; fi++) {
    arr[fi * 9 + 4] = CENTRE_COLOURS[fi];
  }
  return arr;
}

const isCentre = (gi) => gi % 9 === 4;

/* ── component ─────────────────────────────────────────────────────────── */

export default function NetEditor({ initialFacelets = null, onChange }) {
  const [stickers, setStickers] = useState(() =>
    buildInitialStickers(initialFacelets),
  );
  const [activeColour, setActiveColour] = useState("w");

  // Number key shortcuts (1-6) to switch active paint color
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
        setActiveColour(COLOURS[num - 1]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /** Notify parent: full 54-char string when complete, null otherwise. */
  const report = useCallback(
    (next) => {
      const allFilled = next.every((s) => s !== null);
      onChange?.(allFilled ? next.join("") : null);
    },
    [onChange],
  );

  const handleClick = (gi) => {
    if (isCentre(gi)) return;
    const next = [...stickers];
    next[gi] = activeColour;
    setStickers(next);
    report(next);
  };

  const handleRightClick = (e, gi) => {
    e.preventDefault();
    if (isCentre(gi)) return;
    const next = [...stickers];
    next[gi] = null;
    setStickers(next);
    report(next);
  };

  const handleReset = () => {
    const fresh = buildInitialStickers(null);
    setStickers(fresh);
    report(fresh);
  };

  /* ── derived ──────────────────────────────────────────────────────── */

  const filledCount = stickers.filter((s) => s !== null).length;

  const colourCounts = {};
  for (const c of COLOURS) colourCounts[c] = 0;
  for (const s of stickers) {
    if (s && Object.hasOwn(colourCounts, s)) colourCounts[s]++;
  }

  /* ── render ───────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* ── Sticker Balance / Inventory Bar ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-dark-bg/60 border border-dark-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Stickers:</span>
          <span
            className={`text-xs font-mono font-bold ${
              filledCount === 54 ? "text-neon-green" : "text-gray-300"
            }`}
          >
            {filledCount}/54
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {COLOURS.map((c) => {
            const count = colourCounts[c];
            const isExact = count === 9;
            const isOver = count > 9;
            return (
              <span
                key={c}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                  isExact
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold"
                    : isOver
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold"
                      : "bg-white/[0.02] border-dark-border text-gray-400"
                }`}
                title={`${COLOUR_NAMES[c]}: ${count}/9`}
              >
                <span
                  className="w-2 h-2 rounded-full border border-black/20"
                  style={{ background: COLOUR_HEX[c] }}
                />
                <span>{c.toUpperCase()}: {count}/9</span>
                {isExact && <span className="text-[10px]">✓</span>}
                {isOver && <span className="text-[10px]">⚠️</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Paint Swatches ────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 bg-dark-bg/40 p-2 rounded-2xl border border-dark-border">
        <span className="text-xs text-gray-400 font-medium px-2">Paint:</span>
        <div className="flex items-center gap-2">
          {COLOURS.map((c, idx) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveColour(c)}
              className={`w-8 h-8 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center text-xs font-bold shadow-sm ${
                activeColour === c
                  ? "border-neon-blue scale-110 shadow-md shadow-neon-blue/30 ring-2 ring-neon-blue/20"
                  : "border-white/10 hover:border-white/30 hover:scale-105"
              } ${c === "w" || c === "y" ? "text-black/60" : "text-white/80"}`}
              style={{ background: COLOUR_HEX[c] }}
              title={`${COLOUR_NAMES[c]} (Shortcut: ${idx + 1})`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-500 ml-auto hidden sm:inline">
          Keys <kbd className="font-mono bg-white/10 px-1 py-0.5 rounded text-gray-300">1-6</kbd> to switch
        </span>
      </div>

      {/* ── cube net (responsive layout: 3-column cross on mobile, 4-column strip on desktop) ── */}
      <div className="overflow-x-auto max-w-full pb-2 flex justify-center">
        <div className="grid grid-cols-3 grid-rows-4 md:grid-cols-4 md:grid-rows-3 gap-1.5 sm:gap-2.5 w-fit min-w-max">
          {NET_LAYOUT.map(({ face, fi, pos }) => (
            <div
              key={face}
              className={`relative ${pos} flex flex-col items-center`}
            >
              <div className="text-[10px] text-gray-400 text-center mb-1 font-mono font-semibold">
                {face}
              </div>
              <div className="grid grid-cols-3 gap-1 bg-dark-bg/90 p-1 sm:p-1.5 rounded-xl border border-dark-border shadow-sm">
                {Array.from({ length: 9 }, (_, si) => {
                  const gi = fi * 9 + si;
                  const colour = stickers[gi];
                  const centre = isCentre(gi);

                  return (
                    <button
                      key={si}
                      type="button"
                      onClick={() => handleClick(gi)}
                      onContextMenu={(e) => handleRightClick(e, gi)}
                      disabled={centre}
                      className={`w-7 h-7 sm:w-8.5 sm:h-8.5 md:w-9 md:h-9 shrink-0 aspect-square rounded-md transition-all flex items-center justify-center font-bold text-xs select-none ${
                        centre
                          ? "cursor-default ring-1 ring-white/40 shadow-inner"
                          : colour
                            ? "cursor-pointer hover:scale-105 hover:brightness-110 border border-black/20 shadow-sm"
                            : "cursor-pointer border border-dashed border-white/20 hover:border-neon-blue hover:bg-neon-blue/5"
                      }`}
                      style={{
                        background: colour
                          ? COLOUR_HEX[colour]
                          : "rgba(255,255,255,0.03)",
                      }}
                      title={
                        centre
                        ? `${COLOUR_NAMES[colour]} centre — locked`
                        : colour
                          ? `${COLOUR_NAMES[colour]} (right-click to clear)`
                          : "Click to paint"
                    }
                  >
                    {/* Letter overlay for accessibility (build guide §12) */}
                    <span
                      className={`text-[10px] font-bold select-none ${
                        colour === "w" || colour === "y"
                          ? "text-black/60"
                          : colour
                            ? "text-white/80"
                            : ""
                      }`}
                    >
                      {colour ? colour.toUpperCase() : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* ── bottom controls ───────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-dark-border/60">
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-300 bg-rose-500/10 text-xs font-semibold cursor-pointer hover:bg-rose-500/20 transition-colors"
        >
          Reset Net
        </button>
        <span className="text-[11px] text-gray-500">
          Right-click any sticker to clear
        </span>
      </div>
    </div>
  );
}
