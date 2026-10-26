/**
 * Speedcubing trigger recognition and move chunking engine.
 *
 * Scans move lists to group canonical muscle-memory patterns (e.g., Sexy Move,
 * Sune, Niklas, Edge Inserts, Full PLL and 2-Look OLL algorithms) into labeled chunks
 * with color badges.
 */

export const KNOWN_TRIGGERS = [
  {
    "name": "E-Perm",
    "badge": "E-Perm",
    "color": "rose",
    "moves": [
      "X'",
      "R",
      "U'",
      "R'",
      "D",
      "R",
      "U",
      "R'",
      "D'",
      "R",
      "U",
      "R'",
      "D",
      "R",
      "U'",
      "R'",
      "D'",
      "X"
    ],
    "description": "E-Perm Diagonal Swap"
  },
  {
    "name": "Y-Perm",
    "badge": "Y-Perm",
    "color": "orange",
    "moves": [
      "F",
      "R",
      "U'",
      "R'",
      "U'",
      "R",
      "U",
      "R'",
      "F'",
      "R",
      "U",
      "R'",
      "U'",
      "R'",
      "F",
      "R",
      "F'"
    ],
    "description": "Y-Perm Diagonal Corner Swap"
  },
  {
    "name": "F-Perm",
    "badge": "F-Perm",
    "color": "rose",
    "moves": [
      "R'",
      "U2",
      "R'",
      "Y",
      "U'",
      "R'",
      "F'",
      "R2",
      "U'",
      "R'",
      "U",
      "R'",
      "F",
      "R",
      "U'",
      "F"
    ],
    "description": "F-Perm Adjacent Corner Swap"
  },
  {
    "name": "V-Perm",
    "badge": "V-Perm",
    "color": "orange",
    "moves": [
      "R'",
      "U",
      "R'",
      "Y",
      "U'",
      "R'",
      "F'",
      "R2",
      "U'",
      "R'",
      "U",
      "R'",
      "F",
      "R",
      "F"
    ],
    "description": "V-Perm Diagonal Corner Swap"
  },
  {
    "name": "Ga-Perm",
    "badge": "Ga-Perm",
    "color": "amber",
    "moves": [
      "R2",
      "Y",
      "D",
      "R'",
      "U",
      "R'",
      "U'",
      "R",
      "Y'",
      "D'",
      "R2",
      "Y'",
      "R'",
      "U",
      "R"
    ],
    "description": "Ga-Permutation"
  },
  {
    "name": "Gb-Perm",
    "badge": "Gb-Perm",
    "color": "amber",
    "moves": [
      "R'",
      "U'",
      "R",
      "Y",
      "R2",
      "Y",
      "D",
      "R'",
      "U",
      "R",
      "U'",
      "R",
      "Y'",
      "D'",
      "R2"
    ],
    "description": "Gb-Permutation"
  },
  {
    "name": "Gc-Perm",
    "badge": "Gc-Perm",
    "color": "amber",
    "moves": [
      "R2",
      "Y'",
      "D'",
      "R",
      "U'",
      "R",
      "U",
      "R'",
      "Y",
      "D",
      "R2",
      "Y",
      "R",
      "U'",
      "R'"
    ],
    "description": "Gc-Permutation"
  },
  {
    "name": "Gd-Perm",
    "badge": "Gd-Perm",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'",
      "Y'",
      "R2",
      "Y'",
      "D'",
      "R",
      "U'",
      "R'",
      "U",
      "R'",
      "Y",
      "D",
      "R2"
    ],
    "description": "Gd-Permutation"
  },
  {
    "name": "Na-Perm",
    "badge": "Na-Perm",
    "color": "emerald",
    "moves": [
      "L",
      "U'",
      "R",
      "U2",
      "L'",
      "U",
      "R'",
      "L",
      "U'",
      "R",
      "U2",
      "L'",
      "U",
      "R'",
      "U"
    ],
    "description": "Na-Perm Double Corner/Edge Swap"
  },
  {
    "name": "Nb-Perm",
    "badge": "Nb-Perm",
    "color": "emerald",
    "moves": [
      "R'",
      "U",
      "L'",
      "U2",
      "R",
      "U'",
      "L",
      "R'",
      "U",
      "L'",
      "U2",
      "R",
      "U'",
      "L",
      "U'"
    ],
    "description": "Nb-Perm Double Corner/Edge Swap"
  },
  {
    "name": "T-Perm",
    "badge": "T-Perm",
    "color": "blue",
    "moves": [
      "R",
      "U",
      "R'",
      "U'",
      "R'",
      "F",
      "R2",
      "U'",
      "R'",
      "U'",
      "R",
      "U",
      "R'",
      "F'"
    ],
    "description": "T-Perm Adjacent Corner + Edge Swap"
  },
  {
    "name": "Jb-Perm",
    "badge": "Jb-Perm",
    "color": "blue",
    "moves": [
      "R",
      "U",
      "R'",
      "F'",
      "R",
      "U",
      "R'",
      "U'",
      "R'",
      "F",
      "R2",
      "U'",
      "R'",
      "U'"
    ],
    "description": "Jb-Perm Right Corner/Edge Swap"
  },
  {
    "name": "Ra-Perm",
    "badge": "Ra-Perm",
    "color": "purple",
    "moves": [
      "L",
      "U2",
      "L'",
      "U2",
      "L",
      "F'",
      "L'",
      "U'",
      "L",
      "U",
      "L",
      "F",
      "L2",
      "U"
    ],
    "description": "Ra-Perm Left Swap"
  },
  {
    "name": "Rb-Perm",
    "badge": "Rb-Perm",
    "color": "purple",
    "moves": [
      "R'",
      "U2",
      "R",
      "U2",
      "R'",
      "F",
      "R",
      "U",
      "R'",
      "U'",
      "R'",
      "F'",
      "R2",
      "U'"
    ],
    "description": "Rb-Perm Right Swap"
  },
  {
    "name": "Triple Sexy Move",
    "badge": "\u26a1 3x Sexy",
    "color": "cyan",
    "moves": [
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U",
      "R'",
      "U'"
    ],
    "description": "Triple Right 4-Moves sequence"
  },
  {
    "name": "Aa-Perm",
    "badge": "Aa-Perm",
    "color": "indigo",
    "moves": [
      "X",
      "R'",
      "U",
      "R'",
      "D2",
      "R",
      "U'",
      "R'",
      "D2",
      "R2",
      "X'"
    ],
    "description": "Aa-Perm Corner Cycle"
  },
  {
    "name": "Ab-Perm",
    "badge": "Ab-Perm",
    "color": "indigo",
    "moves": [
      "X'",
      "R",
      "U'",
      "R",
      "D2",
      "R'",
      "U",
      "R",
      "D2",
      "R2",
      "X"
    ],
    "description": "Ab-Perm Corner Cycle"
  },
  {
    "name": "Ua-Perm",
    "badge": "Ua-Perm",
    "color": "cyan",
    "moves": [
      "R2",
      "U",
      "R",
      "U",
      "R'",
      "U'",
      "R'",
      "U'",
      "R'",
      "U",
      "R'"
    ],
    "description": "Ua-Perm 3-Edge Cycle CCW"
  },
  {
    "name": "Ub-Perm",
    "badge": "Ub-Perm",
    "color": "cyan",
    "moves": [
      "R",
      "U'",
      "R",
      "U",
      "R",
      "U",
      "R",
      "U'",
      "R'",
      "U'",
      "R2"
    ],
    "description": "Ub-Perm 3-Edge Cycle CW"
  },
  {
    "name": "Ja-Perm",
    "badge": "Ja-Perm",
    "color": "blue",
    "moves": [
      "R'",
      "U",
      "L'",
      "U2",
      "R",
      "U'",
      "R'",
      "U2",
      "R",
      "L",
      "U'"
    ],
    "description": "Ja-Perm Left Corner/Edge Swap"
  },
  {
    "name": "H-OLL (OLL 21)",
    "badge": "H-OLL",
    "color": "indigo",
    "moves": [
      "R",
      "U",
      "R'",
      "U",
      "R",
      "U'",
      "R'",
      "U",
      "R",
      "U2",
      "R'"
    ],
    "description": "OLL 21 H-Shape"
  },
  {
    "name": "Z-Perm",
    "badge": "Z-Perm",
    "color": "teal",
    "moves": [
      "M2",
      "U",
      "M2",
      "U",
      "M'",
      "U2",
      "M2",
      "U2",
      "M'",
      "U2"
    ],
    "description": "Z-Perm Adjacent Edge Swap"
  },
  {
    "name": "Double Sexy OLL",
    "badge": "Top Cross",
    "color": "emerald",
    "moves": [
      "F",
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U",
      "R'",
      "U'",
      "F'"
    ],
    "description": "OLL 51 Line / Double Sexy"
  },
  {
    "name": "Headlights (OLL 23)",
    "badge": "Headlights",
    "color": "blue",
    "moves": [
      "R2",
      "D",
      "R'",
      "U2",
      "R",
      "D'",
      "R'",
      "U2",
      "R'"
    ],
    "description": "OLL 23 Headlights"
  },
  {
    "name": "Pi (OLL 22)",
    "badge": "Pi OLL",
    "color": "amber",
    "moves": [
      "R",
      "U2",
      "R2",
      "U'",
      "R2",
      "U'",
      "R2",
      "U2",
      "R"
    ],
    "description": "OLL 22 Pi"
  },
  {
    "name": "Chameleon (OLL 24)",
    "badge": "Chameleon",
    "color": "cyan",
    "moves": [
      "F",
      "R'",
      "F'",
      "R",
      "U",
      "R",
      "U'",
      "R'"
    ],
    "description": "OLL 24 Chameleon"
  },
  {
    "name": "Bowtie (OLL 25)",
    "badge": "Bowtie",
    "color": "teal",
    "moves": [
      "R'",
      "F'",
      "L'",
      "F",
      "R",
      "F'",
      "L",
      "F"
    ],
    "description": "OLL 25 Bowtie"
  },
  {
    "name": "Right Edge Insert",
    "badge": "Right Insert",
    "color": "amber",
    "moves": [
      "U",
      "R",
      "U'",
      "R'",
      "U'",
      "F'",
      "U",
      "F"
    ],
    "description": "Second layer right-side edge insertion"
  },
  {
    "name": "Left Edge Insert",
    "badge": "Left Insert",
    "color": "amber",
    "moves": [
      "U'",
      "L'",
      "U",
      "L",
      "U",
      "F",
      "U'",
      "F'"
    ],
    "description": "Second layer left-side edge insertion"
  },
  {
    "name": "Niklas",
    "badge": "Niklas",
    "color": "indigo",
    "moves": [
      "U",
      "R",
      "U'",
      "L'",
      "U",
      "R'",
      "U'",
      "L"
    ],
    "description": "Last layer 3-corner permutation cycle"
  },
  {
    "name": "Double Sexy Move",
    "badge": "\u26a1 2x Sexy",
    "color": "cyan",
    "moves": [
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U",
      "R'",
      "U'"
    ],
    "description": "Double Right 4-Moves sequence"
  },
  {
    "name": "H-Perm",
    "badge": "H-Perm",
    "color": "teal",
    "moves": [
      "M2",
      "U",
      "M2",
      "U2",
      "M2",
      "U",
      "M2"
    ],
    "description": "H-Perm Opposite Edge Swap"
  },
  {
    "name": "Anti-Sune",
    "badge": "Anti-Sune",
    "color": "cyan",
    "moves": [
      "R",
      "U2",
      "R'",
      "U'",
      "R",
      "U'",
      "R'"
    ],
    "description": "Reverse top layer Sune cycle"
  },
  {
    "name": "Anti-Sune (Left)",
    "badge": "Anti-Sune",
    "color": "cyan",
    "moves": [
      "R'",
      "U2",
      "R",
      "U",
      "R'",
      "U",
      "R"
    ],
    "description": "OLL 26 Anti-Sune"
  },
  {
    "name": "Sune",
    "badge": "Sune",
    "color": "blue",
    "moves": [
      "R",
      "U",
      "R'",
      "U",
      "R",
      "U2",
      "R'"
    ],
    "description": "Top layer cross edge permutation / corner orientation"
  },
  {
    "name": "FRURUF (Top Cross)",
    "badge": "Top Cross",
    "color": "emerald",
    "moves": [
      "F",
      "R",
      "U",
      "R'",
      "U'",
      "F'"
    ],
    "description": "Top layer edge orientation trigger"
  },
  {
    "name": "FurUrf (Top Cross Angle)",
    "badge": "Top Cross",
    "color": "emerald",
    "moves": [
      "F",
      "U",
      "R",
      "U'",
      "R'",
      "F'"
    ],
    "description": "OLL 44 Top Cross Angle"
  },
  {
    "name": "Right 4-Moves (Sexy Move)",
    "badge": "\u26a1 Right 4-Moves",
    "color": "cyan",
    "moves": [
      "R",
      "U",
      "R'",
      "U'"
    ],
    "description": "Foundational right-hand trigger"
  },
  {
    "name": "Left 4-Moves",
    "badge": "\u26a1 Left 4-Moves",
    "color": "teal",
    "moves": [
      "L'",
      "U'",
      "L",
      "U"
    ],
    "description": "Foundational left-hand trigger"
  },
  {
    "name": "Front 4-Moves",
    "badge": "\u26a1 Front 4-Moves",
    "color": "teal",
    "moves": [
      "F'",
      "U'",
      "F",
      "U"
    ],
    "description": "Alternative front-facing left trigger"
  },
  {
    "name": "Corner Twist",
    "badge": "Corner Twist",
    "color": "rose",
    "moves": [
      "R'",
      "D'",
      "R",
      "D"
    ],
    "description": "Bottom corner orientation cycle"
  },
  {
    "name": "Sledgehammer",
    "badge": "Sledgehammer",
    "color": "orange",
    "moves": [
      "R'",
      "F",
      "R",
      "F'"
    ],
    "description": "Corner-edge slot insertion"
  },
  {
    "name": "Hedgeslammer",
    "badge": "Hedgeslammer",
    "color": "orange",
    "moves": [
      "F",
      "R'",
      "F'",
      "R"
    ],
    "description": "Inverse corner-edge slot insertion"
  },
  {
    "name": "Right Insert",
    "badge": "Right Insert",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'"
    ],
    "description": "Basic 3-move right-hand slot insert"
  },
  {
    "name": "Left Insert",
    "badge": "Left Insert",
    "color": "teal",
    "moves": [
      "L'",
      "U'",
      "L"
    ],
    "description": "Basic 3-move left-hand slot insert"
  },
  {
    "name": "Right Back-Insert",
    "badge": "Back-Right Insert",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'"
    ],
    "description": "Reverse 3-move right-hand slot insert"
  },
  {
    "name": "Back-Right Insert",
    "badge": "Back-Right Insert",
    "color": "amber",
    "moves": [
      "R'",
      "U'",
      "R"
    ],
    "description": "Back-right slot insertion"
  },
  {
    "name": "Right Split",
    "badge": "Right Split",
    "color": "blue",
    "moves": [
      "R",
      "U2",
      "R'"
    ],
    "description": "Separate corner and edge on right"
  },
  {
    "name": "Left Split",
    "badge": "Left Split",
    "color": "teal",
    "moves": [
      "L'",
      "U2",
      "L"
    ],
    "description": "Separate corner and edge on left"
  }
];

/**
 * Parses an array of moves into chunks (either multi-move triggers or single moves).
 * Preserves exact indices so UI highlighting and cursors remain 1:1.
 *
 * @param {string[]} moves
 * @param {number} startIndexOffset - global move offset (e.g. stage.start)
 * @returns {Array<{ type: "trigger"|"single", name?: string, badge?: string, color?: string, moves?: string[], move?: string, startIndex: number, endIndex: number }>}
 */
export function chunkMoves(moves, startIndexOffset = 0) {
  if (!moves || !moves.length) return [];
  const chunks = [];
  let i = 0;

  while (i < moves.length) {
    let matchedTrigger = null;

    // Greedy longest-match scan
    for (const trig of KNOWN_TRIGGERS) {
      const len = trig.moves.length;
      if (i + len <= moves.length) {
        let matches = true;
        for (let k = 0; k < len; k++) {
          if (moves[i + k] !== trig.moves[k]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          matchedTrigger = trig;
          break;
        }
      }
    }

    if (matchedTrigger) {
      const len = matchedTrigger.moves.length;
      chunks.push({
        type: "trigger",
        name: matchedTrigger.name,
        badge: matchedTrigger.badge,
        color: matchedTrigger.color,
        description: matchedTrigger.description,
        moves: moves.slice(i, i + len),
        startIndex: startIndexOffset + i,
        endIndex: startIndexOffset + i + len,
      });
      i += len;
    } else {
      chunks.push({
        type: "single",
        move: moves[i],
        startIndex: startIndexOffset + i,
        endIndex: startIndexOffset + i + 1,
      });
      i += 1;
    }
  }

  return chunks;
}

/**
 * Returns the active trigger containing globalIndex, if any.
 *
 * @param {Array} chunks
 * @param {number} globalIndex
 * @returns {Object|null}
 */
export function getTriggerAtMove(chunks, globalIndex) {
  if (!chunks) return null;
  for (const chunk of chunks) {
    if (
      chunk.type === "trigger" &&
      globalIndex >= chunk.startIndex &&
      globalIndex < chunk.endIndex
    ) {
      const stepInTrigger = globalIndex - chunk.startIndex + 1;
      const totalSteps = chunk.endIndex - chunk.startIndex;
      return {
        ...chunk,
        stepInTrigger,
        totalSteps,
      };
    }
  }
  return null;
}

/**
 * Directional cues and icon badges for any move token.
 * Eliminates the #1 novice mistake on back and bottom faces.
 *
 * @param {string} move
 * @returns {{ direction: "cw"|"ccw"|"double"|"rot", label: string, arrow: string, short: string }}
 */
export function getTurnDirection(move) {
  if (!move) return { direction: "cw", label: "Clockwise", arrow: "↻", short: "CW" };

  const base = move[0];
  const isRot = ["X", "Y", "Z", "x", "y", "z"].includes(base);

  if (move.endsWith("2")) {
    return {
      direction: "double",
      label: isRot ? "180° Cube Spin" : "180° Double Turn",
      arrow: "⟳",
      short: "180°",
    };
  }

  if (move.endsWith("'")) {
    return {
      direction: "ccw",
      label: isRot ? "Rotate Counter-Clockwise" : "Counter-Clockwise",
      arrow: "↺",
      short: "CCW",
    };
  }

  return {
    direction: isRot ? "rot" : "cw",
    label: isRot ? "Rotate Clockwise" : "Clockwise",
    arrow: "↻",
    short: "CW",
  };
}

/**
 * Tailwind styling presets for trigger badges.
 */
export const TRIGGER_COLORS = {
  cyan: {
    badge: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
    border: "border-cyan-400/40",
    glow: "shadow-cyan-400/20",
  },
  teal: {
    badge: "bg-teal-400/15 text-teal-300 border-teal-400/30",
    border: "border-teal-400/40",
    glow: "shadow-teal-400/20",
  },
  amber: {
    badge: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    border: "border-amber-400/40",
    glow: "shadow-amber-400/20",
  },
  blue: {
    badge: "bg-blue-400/15 text-blue-300 border-blue-400/30",
    border: "border-blue-400/40",
    glow: "shadow-blue-400/20",
  },
  indigo: {
    badge: "bg-indigo-400/15 text-indigo-300 border-indigo-400/30",
    border: "border-indigo-400/40",
    glow: "shadow-indigo-400/20",
  },
  emerald: {
    badge: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    border: "border-emerald-400/40",
    glow: "shadow-emerald-400/20",
  },
  rose: {
    badge: "bg-rose-400/15 text-rose-300 border-rose-400/30",
    border: "border-rose-400/40",
    glow: "shadow-rose-400/20",
  },
  orange: {
    badge: "bg-orange-400/15 text-orange-300 border-orange-400/30",
    border: "border-orange-400/40",
    glow: "shadow-orange-400/20",
  },
  purple: {
    badge: "bg-purple-400/15 text-purple-300 border-purple-400/30",
    border: "border-purple-400/40",
    glow: "shadow-purple-400/20",
  },
};
