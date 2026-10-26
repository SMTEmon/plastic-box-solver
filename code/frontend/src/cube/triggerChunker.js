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
      "X",
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
      "X'"
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
      "Y'",
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
      "Y'",
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
      "Y'",
      "D",
      "R'",
      "U",
      "R'",
      "U'",
      "R",
      "Y",
      "D'",
      "R2",
      "Y",
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
      "Y'",
      "R2",
      "Y'",
      "D",
      "R'",
      "U",
      "R",
      "U'",
      "R",
      "Y",
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
      "Y",
      "D'",
      "R",
      "U'",
      "R",
      "U",
      "R'",
      "Y'",
      "D",
      "R2",
      "Y'",
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
      "Y",
      "R2",
      "Y",
      "D'",
      "R",
      "U'",
      "R'",
      "U",
      "R'",
      "Y'",
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
    "name": "OLL 4 (Dot)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R'",
      "U2",
      "X'",
      "R'",
      "U",
      "R",
      "U'",
      "Y'",
      "R'",
      "U'",
      "R'",
      "U",
      "R'",
      "F",
      "Z"
    ],
    "description": "Dot with no edges oriented"
  },
  {
    "name": "OLL 38 (Fish)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "L",
      "U'",
      "Y",
      "R'",
      "U2",
      "R'",
      "U",
      "R",
      "U'",
      "R",
      "U2",
      "R",
      "Y'",
      "U'",
      "L'"
    ],
    "description": "Fish shape"
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
    "name": "OLL 1 (Dot)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R",
      "U",
      "B'",
      "X",
      "R",
      "U",
      "X2",
      "R2",
      "X",
      "U'",
      "R'",
      "F",
      "R",
      "F'"
    ],
    "description": "Dot with no edges oriented"
  },
  {
    "name": "OLL 7 (Wide L)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R'",
      "U2",
      "F",
      "R",
      "U",
      "R'",
      "U'",
      "Y",
      "R2",
      "U2",
      "X",
      "R",
      "U",
      "X'"
    ],
    "description": "Wide L-shape"
  },
  {
    "name": "OLL 12 (Lightning)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "L'",
      "B'",
      "L",
      "U'",
      "R'",
      "U",
      "R",
      "U'",
      "R'",
      "U",
      "R",
      "L'",
      "B",
      "L"
    ],
    "description": "Small lightning bolt"
  },
  {
    "name": "F2L (DFR-RF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U'",
      "R'",
      "U",
      "Y",
      "U",
      "R'",
      "U'",
      "R",
      "Y'"
    ],
    "description": "F2L case (DFR-RF) pairing sequence"
  },
  {
    "name": "OLL 25 (Bowtie)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R",
      "U2",
      "R'",
      "U'",
      "R",
      "U'",
      "R2",
      "Y",
      "R'",
      "U'",
      "R",
      "U",
      "B"
    ],
    "description": "Bowtie cross + 2 corners"
  },
  {
    "name": "OLL 28 (Stealth)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R'",
      "U2",
      "R",
      "U",
      "R'",
      "U",
      "R2",
      "Y'",
      "R",
      "U",
      "R'",
      "U'",
      "F'"
    ],
    "description": "Stealth shape"
  },
  {
    "name": "OLL 3 (Dot)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "Y'",
      "M",
      "U",
      "X'",
      "R'",
      "U2",
      "X",
      "R",
      "U",
      "L'",
      "U",
      "L",
      "M'"
    ],
    "description": "Dot with no edges oriented"
  },
  {
    "name": "OLL 5 (Wide L)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R",
      "U",
      "R'",
      "U",
      "R'",
      "F",
      "R",
      "F'",
      "U2",
      "R'",
      "F",
      "R",
      "F'"
    ],
    "description": "Wide L-shape"
  },
  {
    "name": "OLL 10 (Kite)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R",
      "U'",
      "Y'",
      "R2",
      "D",
      "R'",
      "U2",
      "R",
      "D'",
      "R2",
      "Y",
      "U",
      "R'"
    ],
    "description": "Kite shape"
  },
  {
    "name": "OLL 24 (Chameleon)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R'",
      "U'",
      "R",
      "Y",
      "X",
      "R",
      "U'",
      "R'",
      "F",
      "R",
      "U",
      "R'",
      "X'"
    ],
    "description": "Chameleon cross + 2 corners"
  },
  {
    "name": "OLL 37 (Fish)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "X",
      "U'",
      "R",
      "U'",
      "R2",
      "F",
      "X'",
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "B2"
    ],
    "description": "Fish shape"
  },
  {
    "name": "OLL 40 (Big Lightning)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "Y2",
      "F",
      "U",
      "R",
      "U'",
      "X",
      "U",
      "R'",
      "D'",
      "R",
      "U'",
      "R'",
      "X'"
    ],
    "description": "Big lightning bolt"
  },
  {
    "name": "OLL 54 (Small L)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "L",
      "U",
      "L'",
      "U",
      "L",
      "U'",
      "L'",
      "U'",
      "Y2",
      "R'",
      "F",
      "R",
      "F'"
    ],
    "description": "Small L-shape"
  },
  {
    "name": "OLL 55 (Highway)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R'",
      "U'",
      "R",
      "U'",
      "R'",
      "U",
      "R",
      "U",
      "Y'",
      "F",
      "R'",
      "F'",
      "R"
    ],
    "description": "Highway line"
  },
  {
    "name": "F2L (FRD-RF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "Y",
      "U",
      "R'",
      "U2",
      "R",
      "U",
      "R'",
      "U2",
      "R",
      "Y'"
    ],
    "description": "F2L case (FRD-RF) pairing sequence"
  },
  {
    "name": "F2L (RDF-RF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "Y",
      "U",
      "R'",
      "U'",
      "R",
      "U'",
      "R'",
      "U'",
      "R",
      "Y'"
    ],
    "description": "F2L case (RDF-RF) pairing sequence"
  },
  {
    "name": "F2L (RFU-RU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "Y",
      "R'",
      "U'",
      "R",
      "U2",
      "R'",
      "U'",
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "Y'"
    ],
    "description": "F2L case (RFU-RU) pairing sequence"
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
    "name": "OLL 2 (Dot)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R'",
      "F",
      "R",
      "F'",
      "U2",
      "R'",
      "F",
      "R",
      "Y",
      "R2",
      "U2",
      "R"
    ],
    "description": "Dot with no edges oriented"
  },
  {
    "name": "OLL 8 (Wide L)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "F",
      "R",
      "U",
      "R'",
      "U",
      "Y",
      "R'",
      "U2",
      "R'",
      "F",
      "R",
      "F'"
    ],
    "description": "Wide L-shape"
  },
  {
    "name": "OLL 9 (Kite)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R'",
      "U'",
      "Y'",
      "L'",
      "U",
      "L'",
      "Y",
      "L",
      "F",
      "L'",
      "F",
      "R"
    ],
    "description": "Kite shape"
  },
  {
    "name": "OLL 32 (Couch)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R'",
      "F",
      "R'",
      "F'",
      "R2",
      "U2",
      "X",
      "U'",
      "R",
      "U",
      "R'",
      "X'"
    ],
    "description": "Couch shape"
  },
  {
    "name": "OLL 30 (Spotted)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R'",
      "U2",
      "X",
      "R2",
      "U'",
      "R'",
      "U",
      "X'",
      "R'",
      "U2",
      "R"
    ],
    "description": "Spotted shape"
  },
  {
    "name": "OLL 36 (Fish)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "X'",
      "L",
      "R2",
      "U'",
      "R",
      "U'",
      "R'",
      "U2",
      "R",
      "U'",
      "M"
    ],
    "description": "Fish shape"
  },
  {
    "name": "OLL 39 (Big Lightning)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "X'",
      "R'",
      "L2",
      "U",
      "L'",
      "U",
      "L",
      "U2",
      "L'",
      "U",
      "M"
    ],
    "description": "Big lightning bolt"
  },
  {
    "name": "F2L (RFU-UF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'",
      "U2",
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U",
      "R'"
    ],
    "description": "F2L case (RFU-UF) pairing sequence"
  },
  {
    "name": "Aa-Perm",
    "badge": "Aa-Perm",
    "color": "indigo",
    "moves": [
      "X'",
      "R'",
      "U",
      "R'",
      "D2",
      "R",
      "U'",
      "R'",
      "D2",
      "R2",
      "X"
    ],
    "description": "Aa-Perm Corner Cycle"
  },
  {
    "name": "Ab-Perm",
    "badge": "Ab-Perm",
    "color": "indigo",
    "moves": [
      "X",
      "R",
      "U'",
      "R",
      "D2",
      "R'",
      "U",
      "R",
      "D2",
      "R2",
      "X'"
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
    "name": "OLL 6 (Wide L)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "M'",
      "U2",
      "M",
      "U2",
      "M'",
      "U",
      "M",
      "U2",
      "M'",
      "U2",
      "M"
    ],
    "description": "Wide L-shape"
  },
  {
    "name": "OLL 13 (Gun)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "L",
      "U'",
      "R'",
      "U",
      "L'",
      "U",
      "R",
      "U",
      "R'",
      "U",
      "R"
    ],
    "description": "Gun shape"
  },
  {
    "name": "OLL 27 (Sune)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "L",
      "F'",
      "L'",
      "F",
      "U2",
      "L2",
      "Y",
      "L",
      "F",
      "L'",
      "F"
    ],
    "description": "Sune top corner cycle"
  },
  {
    "name": "OLL 33 (T-Shape)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R'",
      "F",
      "R",
      "F'",
      "U2",
      "R2",
      "Y'",
      "R'",
      "F'",
      "R",
      "F'"
    ],
    "description": "T-shape edge & corner"
  },
  {
    "name": "OLL 34 (City)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R",
      "U",
      "R'",
      "Y'",
      "R'",
      "F",
      "R",
      "U'",
      "R'",
      "F'",
      "R"
    ],
    "description": "City shape"
  },
  {
    "name": "OLL 43 (P-Shape)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R",
      "U",
      "R'",
      "U'",
      "X'",
      "D'",
      "R'",
      "U",
      "R",
      "E'",
      "Z"
    ],
    "description": "P-shape orientation"
  },
  {
    "name": "OLL 44 (P-Shape)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R'",
      "F",
      "R",
      "U",
      "R'",
      "F'",
      "R",
      "Y'",
      "L",
      "U'",
      "L'"
    ],
    "description": "P-shape orientation"
  },
  {
    "name": "OLL 45 (T-Shape)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "L",
      "F'",
      "L'",
      "U'",
      "L",
      "F",
      "L'",
      "Y",
      "R'",
      "U",
      "R"
    ],
    "description": "T-shape bar orientation"
  },
  {
    "name": "OLL 49 (Small L)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R'",
      "Y'",
      "U'",
      "L",
      "Y",
      "U",
      "R",
      "U'",
      "R'",
      "F'",
      "R"
    ],
    "description": "Small L-shape"
  },
  {
    "name": "OLL 50 (Small L)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "L",
      "Y",
      "U",
      "R'",
      "Y'",
      "U'",
      "L'",
      "U",
      "L",
      "F",
      "L'"
    ],
    "description": "Small L-shape"
  },
  {
    "name": "OLL 56 (Line)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R'",
      "F",
      "R",
      "U",
      "R'",
      "U'",
      "Y'",
      "L'",
      "Y",
      "U",
      "R"
    ],
    "description": "Line shape"
  },
  {
    "name": "OLL 57 (H-Shape)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "L",
      "F'",
      "L'",
      "U'",
      "L",
      "U",
      "Y",
      "R",
      "Y'",
      "U'",
      "L'"
    ],
    "description": "H-shape edge flip"
  },
  {
    "name": "F2L (DFR-FR)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "U",
      "R",
      "U2",
      "R'",
      "U",
      "R",
      "U'",
      "R'"
    ],
    "description": "F2L case (DFR-FR) pairing sequence"
  },
  {
    "name": "F2L (RDF-FR)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "U'",
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U2",
      "R'"
    ],
    "description": "F2L case (RDF-FR) pairing sequence"
  },
  {
    "name": "F2L (RFU-FR)",
    "badge": "F2L Slot",
    "color": "amber",
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
      "R'"
    ],
    "description": "F2L case (RFU-FR) pairing sequence"
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
    "name": "OLL 11 (Lightning)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "F",
      "U",
      "R",
      "U'",
      "R'",
      "U",
      "R",
      "U'",
      "R'",
      "F'"
    ],
    "description": "Small lightning bolt"
  },
  {
    "name": "OLL 21 (H-Shape)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "L'",
      "R",
      "U",
      "R'",
      "U'",
      "L",
      "R'",
      "F",
      "R",
      "F'"
    ],
    "description": "H-OLL cross + 4 corners"
  },
  {
    "name": "OLL 31 (Couch)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "F'",
      "L'",
      "U'",
      "L",
      "U",
      "L'",
      "U'",
      "L",
      "U",
      "F"
    ],
    "description": "Couch shape"
  },
  {
    "name": "OLL 35 (Fish)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "L'",
      "B'",
      "L",
      "U'",
      "R'",
      "U",
      "R",
      "L'",
      "B",
      "L"
    ],
    "description": "Fish shape"
  },
  {
    "name": "OLL 42 (Awkward)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R",
      "U",
      "X",
      "R",
      "U'",
      "R'",
      "U",
      "X'",
      "U'",
      "R'"
    ],
    "description": "Awkward shape"
  },
  {
    "name": "OLL 46 (C-Shape)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "L'",
      "B'",
      "L",
      "R'",
      "U'",
      "R",
      "U",
      "L'",
      "B",
      "L"
    ],
    "description": "C-shape orientation"
  },
  {
    "name": "OLL 47 (Anti-P)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R",
      "B",
      "R'",
      "L",
      "U",
      "L'",
      "U'",
      "R",
      "B'",
      "R'"
    ],
    "description": "Anti-P shape"
  },
  {
    "name": "F2L (FUR-RU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "U",
      "Y",
      "U",
      "R'",
      "U'",
      "R",
      "Y'"
    ],
    "description": "F2L case (FUR-RU) pairing sequence"
  },
  {
    "name": "F2L (URF-UF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U",
      "F",
      "U'",
      "Y'",
      "U'",
      "F",
      "U",
      "F'",
      "Y"
    ],
    "description": "F2L case (URF-UF) pairing sequence"
  },
  {
    "name": "F2L (FUR-RF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U'",
      "F",
      "Y'",
      "U'",
      "F",
      "U",
      "F'",
      "Y"
    ],
    "description": "F2L case (FUR-RF) pairing sequence"
  },
  {
    "name": "F2L (URF-RF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'",
      "Y",
      "U",
      "R'",
      "U'",
      "R",
      "Y'"
    ],
    "description": "F2L case (URF-RF) pairing sequence"
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
    "name": "OLL 29 (Spotted)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "X'",
      "L",
      "U2",
      "R'",
      "U'",
      "R",
      "U'",
      "X",
      "L'"
    ],
    "description": "Spotted shape"
  },
  {
    "name": "OLL 41 (Awkward)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "X",
      "L'",
      "U2",
      "R",
      "U",
      "R'",
      "U",
      "X'",
      "L"
    ],
    "description": "Awkward shape"
  },
  {
    "name": "F2L (RFU-RF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "Y",
      "U",
      "R'",
      "U",
      "R",
      "Y'"
    ],
    "description": "F2L case (RFU-RF) pairing sequence"
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
    "name": "OLL 17 (Slash)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "R'",
      "F'",
      "L",
      "F",
      "R",
      "F'",
      "L'",
      "F"
    ],
    "description": "Diagonal slash"
  },
  {
    "name": "OLL 53 (Small L)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "R",
      "U",
      "R'",
      "U'",
      "R'",
      "F",
      "R",
      "F'"
    ],
    "description": "Small L-shape"
  },
  {
    "name": "F2L (FUR-FR)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U",
      "F",
      "U",
      "F'",
      "U2",
      "F"
    ],
    "description": "F2L case (FUR-FR) pairing sequence"
  },
  {
    "name": "F2L (FUR-BU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U2",
      "F",
      "U",
      "F'",
      "U2",
      "F"
    ],
    "description": "F2L case (FUR-BU) pairing sequence"
  },
  {
    "name": "F2L (FUR-LU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U'",
      "F",
      "U",
      "F'",
      "U2",
      "F"
    ],
    "description": "F2L case (FUR-LU) pairing sequence"
  },
  {
    "name": "F2L (FUR-UR)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "U",
      "R",
      "U",
      "R'"
    ],
    "description": "F2L case (FUR-UR) pairing sequence"
  },
  {
    "name": "F2L (FUR-UL)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'",
      "U",
      "R",
      "U",
      "R'"
    ],
    "description": "F2L case (FUR-UL) pairing sequence"
  },
  {
    "name": "F2L (FUR-UF)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U2",
      "F",
      "U'",
      "R",
      "U",
      "R'"
    ],
    "description": "F2L case (FUR-UF) pairing sequence"
  },
  {
    "name": "F2L (URF-FR)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "U'",
      "R",
      "U2",
      "R'"
    ],
    "description": "F2L case (URF-FR) pairing sequence"
  },
  {
    "name": "F2L (URF-UL)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U2",
      "R'",
      "U'",
      "R",
      "U2",
      "R'"
    ],
    "description": "F2L case (URF-UL) pairing sequence"
  },
  {
    "name": "F2L (URF-UB)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U2",
      "R'"
    ],
    "description": "F2L case (URF-UB) pairing sequence"
  },
  {
    "name": "F2L (URF-FU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U",
      "F",
      "U'",
      "F'",
      "U'",
      "F"
    ],
    "description": "F2L case (URF-FU) pairing sequence"
  },
  {
    "name": "F2L (URF-BU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U'",
      "F",
      "U'",
      "F'",
      "U'",
      "F"
    ],
    "description": "F2L case (URF-BU) pairing sequence"
  },
  {
    "name": "F2L (URF-RU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U2",
      "R'",
      "U",
      "F'",
      "U'",
      "F"
    ],
    "description": "F2L case (URF-RU) pairing sequence"
  },
  {
    "name": "F2L (FRD-RU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "U'",
      "F'",
      "U",
      "F"
    ],
    "description": "F2L case (FRD-RU) pairing sequence"
  },
  {
    "name": "F2L (FRD-UR)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U",
      "F",
      "U",
      "R",
      "U'",
      "R'"
    ],
    "description": "F2L case (FRD-UR) pairing sequence"
  },
  {
    "name": "F2L (RFU-UL)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'",
      "U",
      "R",
      "U'",
      "R'"
    ],
    "description": "F2L case (RFU-UL) pairing sequence"
  },
  {
    "name": "F2L (RFU-UB)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "R",
      "U2",
      "R'",
      "U",
      "R",
      "U'",
      "R'"
    ],
    "description": "F2L case (RFU-UB) pairing sequence"
  },
  {
    "name": "F2L (RFU-LU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U2",
      "F",
      "U'",
      "F'",
      "U",
      "F"
    ],
    "description": "F2L case (RFU-LU) pairing sequence"
  },
  {
    "name": "F2L (RFU-BU)",
    "badge": "F2L Slot",
    "color": "amber",
    "moves": [
      "F'",
      "U'",
      "F",
      "U'",
      "F'",
      "U",
      "F"
    ],
    "description": "F2L case (RFU-BU) pairing sequence"
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
    "name": "Corner Orient Insert",
    "badge": "Corner Orient",
    "color": "purple",
    "moves": [
      "R",
      "U2",
      "R'",
      "U'",
      "R",
      "U",
      "R'"
    ],
    "description": "Corner twist and slot insert (white facing top)"
  },
  {
    "name": "OLL 15 (Gun)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "L'",
      "U",
      "R",
      "U'",
      "L",
      "U",
      "R'"
    ],
    "description": "Gun shape"
  },
  {
    "name": "OLL 20 (X-Shape)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "M'",
      "U'",
      "M",
      "U2",
      "M'",
      "U'",
      "M"
    ],
    "description": "X-shape orientation"
  },
  {
    "name": "OLL 22 (Pi)",
    "badge": "OLL",
    "color": "indigo",
    "moves": [
      "L",
      "F",
      "R'",
      "F",
      "R",
      "F2",
      "L'"
    ],
    "description": "Pi shape cross + 4 corners"
  },
  {
    "name": "F2L (DFR-FU)",
    "badge": "F2L Pair",
    "color": "amber",
    "moves": [
      "F'",
      "U",
      "F",
      "U'",
      "F'",
      "U",
      "F"
    ],
    "description": "F2L case (DFR-FU) corner-edge pairing/insert"
  },
  {
    "name": "F2L (DFR-UR)",
    "badge": "F2L Pair",
    "color": "amber",
    "moves": [
      "R",
      "U",
      "R'",
      "U'",
      "R",
      "U",
      "R'"
    ],
    "description": "F2L case (DFR-UR) corner-edge pairing/insert"
  },
  {
    "name": "F2L (RDF-FU)",
    "badge": "F2L Pair",
    "color": "amber",
    "moves": [
      "F'",
      "U'",
      "F",
      "U",
      "F'",
      "U'",
      "F"
    ],
    "description": "F2L case (RDF-FU) corner-edge pairing/insert"
  },
  {
    "name": "F2L (RDF-UR)",
    "badge": "F2L Pair",
    "color": "amber",
    "moves": [
      "R",
      "U'",
      "R'",
      "U",
      "R",
      "U'",
      "R'"
    ],
    "description": "F2L case (RDF-UR) corner-edge pairing/insert"
  },
  {
    "name": "F2L (RFU-FU)",
    "badge": "F2L Pair",
    "color": "amber",
    "moves": [
      "F'",
      "U2",
      "F",
      "U",
      "F'",
      "U'",
      "F"
    ],
    "description": "F2L case (RFU-FU) corner-edge pairing/insert"
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
    "name": "OLL 51 (Line)",
    "badge": "OLL",
    "color": "blue",
    "moves": [
      "F'",
      "U'",
      "L'",
      "U",
      "L",
      "F"
    ],
    "description": "Line / Double Sexy OLL"
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
    "name": "Back Setup (Right)",
    "badge": "Back Setup",
    "color": "blue",
    "moves": [
      "B",
      "U'",
      "B'",
      "U"
    ],
    "description": "Extract and align back corner"
  },
  {
    "name": "Back Setup (Left)",
    "badge": "Back Setup",
    "color": "blue",
    "moves": [
      "B'",
      "U",
      "B",
      "U2"
    ],
    "description": "Extract and align back corner"
  },
  {
    "name": "F2L (FUR-FU)",
    "badge": "F2L Pair",
    "color": "teal",
    "moves": [
      "F'",
      "U",
      "F"
    ],
    "description": "F2L case (FUR-FU) corner-edge pairing/insert"
  },
  {
    "name": "F2L (URF-UR)",
    "badge": "F2L Pair",
    "color": "teal",
    "moves": [
      "R",
      "U'",
      "R'"
    ],
    "description": "F2L case (URF-UR) corner-edge pairing/insert"
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
  },
  {
    "name": "Front Insert (3-Move)",
    "badge": "Front Insert",
    "color": "cyan",
    "moves": [
      "F'",
      "U'",
      "F"
    ],
    "description": "3-move front corner slot insert (white facing front)"
  },
  {
    "name": "Left Front Insert",
    "badge": "Front-L Insert",
    "color": "teal",
    "moves": [
      "F",
      "U",
      "F'"
    ],
    "description": "3-move front-left slot insert"
  },
  {
    "name": "Back Lift (Left)",
    "badge": "Back Lift",
    "color": "blue",
    "moves": [
      "B'",
      "U2",
      "B"
    ],
    "description": "Extract corner from bottom-back slot"
  },
  {
    "name": "Back Lift (Right)",
    "badge": "Back Lift",
    "color": "blue",
    "moves": [
      "B",
      "U",
      "B'"
    ],
    "description": "Extract corner from bottom-back slot"
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
