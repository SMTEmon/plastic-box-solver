import { useState } from "react";
import { COLOUR_HEX, COLOUR_NAMES } from "../cube/notation.js";
import { faceletsToFaces, FACE_ORDER } from "../cube/facelets.js";

/**
 * The unfolded cube, with every sticker clickable (FR-05, FR-06c).
 *
 * The scan gets most stickers right and a couple wrong. Before this existed a
 * near-miss was a dead end: the endpoint returned the detected state EVEN WHEN
 * INVALID specifically so it could be corrected, but there was nothing to
 * correct it with. Fixing two squares by hand beats re-shooting six photos,
 * and it certainly beats typing 54 letters.
 *
 * Layout is the standard cross, which is how every cube tutorial draws it:
 *
 *          [ U ]
 *    [ L ][ F ][ R ][ B ]
 *          [ D ]
 *
 * CENTRES ARE LOCKED. They define the colour scheme -- white is always
 * opposite yellow, and the six centres never move relative to each other on a
 * real cube. A user changing one is always a mistake, and allowing it produces
 * an unsolvable cube with a confusing error.
 */

const COLOURS = [
  ["w", "White"],
  ["y", "Yellow"],
  ["r", "Red"],
  ["o", "Orange"],
  ["g", "Green"],
  ["b", "Blue"],
];

const FACE_NAME = {
  U: "Up",
  R: "Right",
  F: "Front",
  D: "Down",
  L: "Left",
  B: "Back",
};

function Face({ face, letters, onPaint, highlight }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`grid grid-cols-3 gap-[3px] p-[3px] rounded-lg bg-black/60 ${
          highlight ? "ring-2 ring-accent-amber" : ""
        }`}
      >
        {letters.map((c, i) => {
          const isCentre = i === 4;
          return (
            <button
              key={i}
              disabled={isCentre}
              onClick={() => onPaint(face, i)}
              title={
                isCentre
                  ? `${FACE_NAME[face]} centre (${COLOUR_NAMES[c.toLowerCase()]}) — locked, it defines the colour scheme`
                  : `${FACE_NAME[face]} sticker ${i + 1} — currently ${COLOUR_NAMES[c.toLowerCase()]}`
              }
              className={`w-7 h-7 rounded-[3px] border transition-transform ${
                isCentre
                  ? "border-white/50 cursor-not-allowed"
                  : "border-black/40 cursor-pointer hover:scale-110 hover:border-white/70"
              }`}
              style={{ background: COLOUR_HEX[c.toLowerCase()] ?? "#333" }}
            >
              {isCentre && (
                <span className="block w-1.5 h-1.5 rounded-full bg-black/45 mx-auto" />
              )}
            </button>
          );
        })}
      </div>
      {/* Position tells you where it sits in the net; the CENTRE COLOUR is
          what you can actually see on the cube in your hand. Both. */}
      <span className="flex items-center gap-1 text-[10px] text-gray-400">
        <span
          className="w-2.5 h-2.5 rounded-sm border border-white/20"
          style={{ background: COLOUR_HEX[letters[4].toLowerCase()] }}
        />
        <span className="capitalize">{COLOUR_NAMES[letters[4].toLowerCase()]}</span>
        <span className="text-gray-600">({FACE_NAME[face]})</span>
      </span>
    </div>
  );
}

export default function CubeNetEditor({ facelets, onChange, flaggedFaces }) {
  const [paint, setPaint] = useState("w");
  const faces = faceletsToFaces(facelets);

  const applyPaint = (face, index) => {
    const fi = FACE_ORDER.indexOf(face);
    const at = fi * 9 + index;
    if (facelets[at] === paint) return;
    onChange(facelets.slice(0, at) + paint + facelets.slice(at + 1));
  };

  // Count each colour: exactly 9 of each is necessary (not sufficient) for a
  // legal cube, and it is the fastest way to see what still needs fixing.
  const counts = Object.fromEntries(COLOURS.map(([c]) => [c, 0]));
  for (const c of facelets) counts[c] = (counts[c] ?? 0) + 1;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] text-gray-400">Pick a colour:</span>
        {COLOURS.map(([c, name]) => {
          const n = counts[c];
          return (
            <button
              key={c}
              onClick={() => setPaint(c)}
              title={`${name} — ${n} of 9 placed`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition-all ${
                paint === c
                  ? "border-neon-blue bg-neon-blue/10"
                  : "border-dark-border hover:border-dark-border-strong"
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded border border-black/40"
                style={{ background: COLOUR_HEX[c] }}
              />
              <span
                className={`text-[10px] font-mono ${
                  n === 9 ? "text-gray-500" : "text-accent-amber"
                }`}
              >
                {n}/9
              </span>
            </button>
          );
        })}
      </div>

      {/* The cross. Column widths are fixed so U and D line up over F. */}
      <div className="inline-block">
        <div className="grid grid-cols-4 gap-2 justify-items-center">
          <div />
          <Face
            face="U"
            letters={faces.U}
            onPaint={applyPaint}
            highlight={flaggedFaces?.has("U")}
          />
          <div />
          <div />

          {["L", "F", "R", "B"].map((f) => (
            <Face
              key={f}
              face={f}
              letters={faces[f]}
              onPaint={applyPaint}
              highlight={flaggedFaces?.has(f)}
            />
          ))}

          <div />
          <Face
            face="D"
            letters={faces.D}
            onPaint={applyPaint}
            highlight={flaggedFaces?.has("D")}
          />
          <div />
          <div />
        </div>
      </div>

      <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
        Click any sticker to repaint it with the selected colour. Centres are
        locked — they never move on a real cube, so they define which colour
        belongs to which face. Amber outlines mark faces the camera flagged as
        blurry or dark, which is where mistakes usually are.
      </p>
    </div>
  );
}
