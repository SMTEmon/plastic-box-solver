export function parseCubeFaceRows(input) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function parseCubeString(input) {
  const rows = parseCubeFaceRows(input);
  let facesArr = [];

  if (rows.length === 1 && rows[0].length === 54) {
    const s = rows[0].toUpperCase();
    for (let i = 0; i < 6; i++) facesArr.push(s.slice(i * 9, i * 9 + 9));
  } else if (rows.length === 6 && rows.every((r) => r.length === 9)) {
    facesArr = rows.map((r) => r.toUpperCase());
  } else {
    throw new Error("Input must be 54 characters or 6 lines of 9 characters");
  }

  const allowed = new Set(["W", "Y", "R", "O", "B", "G"]);
  const counts = { W: 0, Y: 0, R: 0, O: 0, B: 0, G: 0 };
  
  facesArr.forEach((f, idx) => {
    if (f.length !== 9) throw new Error(`Face ${idx} length must be 9`);
    for (const ch of f) {
      if (!allowed.has(ch)) throw new Error(`Invalid color letter: ${ch}`);
      counts[ch]++;
    }
  });

  for (const [color, count] of Object.entries(counts)) {
    if (count !== 9) {
      throw new Error(`Invalid color count: ${color} appears ${count} times (must be exactly 9)`);
    }
  }

  const center = (s) => s[4];
  const oppositeChecks = [
    [[0, 3], new Set(["W", "Y"])],
    [[1, 4], new Set(["R", "O"])],
    [[2, 5], new Set(["B", "G"])],
  ];

  for (const [[a, b], allowedSet] of oppositeChecks) {
    const ca = center(facesArr[a]);
    const cb = center(facesArr[b]);
    if (!allowedSet.has(ca) || !allowedSet.has(cb) || ca === cb) {
      throw new Error(
        `Invalid opposite centers for faces ${a}/${b}: ${ca}/${cb}`,
      );
    }
  }

  const keys = ["U", "R", "F", "D", "L", "B"];
  const result = {};
  keys.forEach((k, i) => (result[k] = facesArr[i].split("")));
  return result;
}
