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

import { useState, useCallback } from "react";

/* ── constants ─────────────────────────────────────────────────────────── */

/** Cross layout — each entry places one face in the 4×3 outer grid.
 *  fi = index in URFDLB order (the canonical facelet index base). */
const NET_LAYOUT = [
  { row: 0, col: 1, fi: 0, face: "U" },
  { row: 1, col: 0, fi: 4, face: "L" },
  { row: 1, col: 1, fi: 2, face: "F" },
  { row: 1, col: 2, fi: 1, face: "R" },
  { row: 1, col: 3, fi: 5, face: "B" },
  { row: 2, col: 1, fi: 3, face: "D" },
];

/** Standard western colour scheme — centres are fixed. */
const CENTRE_COLOURS = ["w", "r", "g", "y", "o", "b"]; // U R F D L B

const COLOURS = ["w", "r", "o", "y", "g", "b"];

const COLOUR_HEX = {
  w: "#ffffff",
  r: "#ff4d4d",
  o: "#ff8c00",
  y: "#ffd400",
  g: "#2ecc71",
  b: "#2d4cff",
};

const COLOUR_NAMES = {
  w: "White",
  r: "Red",
  o: "Orange",
  y: "Yellow",
  g: "Green",
  b: "Blue",
};

/* ── helpers ───────────────────────────────────────────────────────────── */

function buildInitialStickers(facelets) {
  if (facelets && facelets.length === 54) {
    return facelets.toLowerCase().split("");
  }
  // Empty net — only centres pre-set
  const arr = Array(54).fill(null);
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
    <div className="space-y-3">
      {/* ── colour palette ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400 mr-1">Paint:</span>
        {COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveColour(c)}
            className={`w-8 h-8 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold ${
              activeColour === c
                ? "border-neon-blue scale-110 shadow-[0_0_10px_rgba(0,243,255,0.4)]"
                : "border-white/20 hover:border-white/40"
            } ${c === "w" || c === "y" ? "text-black/50" : "text-white/50"}`}
            style={{ background: COLOUR_HEX[c] }}
            title={`${COLOUR_NAMES[c]} (${colourCounts[c]}/9)`}
          >
            {c.toUpperCase()}
          </button>
        ))}
        <span
          className={`text-[11px] font-mono ml-auto ${
            filledCount === 54 ? "text-neon-green" : "text-gray-500"
          }`}
        >
          {filledCount}/54
        </span>
      </div>

      {/* ── per-colour counts ─────────────────────────────────────── */}
      <div className="flex gap-3">
        {COLOURS.map((c) => (
          <span
            key={c}
            className={`text-[10px] font-mono ${
              colourCounts[c] === 9
                ? "text-neon-green"
                : colourCounts[c] > 9
                  ? "text-red-400"
                  : "text-gray-500"
            }`}
          >
            {c.toUpperCase()}:{colourCounts[c]}/9
          </span>
        ))}
      </div>

      {/* ── cube net (cross layout) ───────────────────────────────── */}
      <div
        className="inline-grid gap-1.5"
        style={{
          gridTemplateColumns: "repeat(4, auto)",
          gridTemplateRows: "repeat(3, auto)",
        }}
      >
        {NET_LAYOUT.map(({ row, col, fi, face }) => (
          <div
            key={face}
            className="relative"
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
          >
            <div className="text-[10px] text-gray-500 text-center mb-0.5 font-mono">
              {face}
            </div>
            <div className="grid grid-cols-3 gap-[3px] bg-dark-border/50 p-[3px] rounded-lg">
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
                    className={`w-9 h-9 rounded-sm transition-all flex items-center justify-center ${
                      centre
                        ? "cursor-default ring-1 ring-white/30"
                        : colour
                          ? "cursor-pointer hover:scale-105 hover:brightness-110 border border-black/20"
                          : "cursor-pointer border border-dashed border-white/20 hover:border-neon-blue/60 hover:bg-white/5"
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
                          ? "text-black/40"
                          : colour
                            ? "text-white/50"
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

      {/* ── bottom controls ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-xs cursor-pointer hover:bg-red-500/10 transition-colors"
        >
          Reset All
        </button>
        <span className="text-[10px] text-gray-600">
          Right-click a sticker to clear it
        </span>
      </div>
    </div>
  );
}
