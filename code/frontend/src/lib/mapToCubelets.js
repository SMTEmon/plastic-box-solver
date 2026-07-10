// Map parsed face-state {U,R,F,D,L,B} (each array of 9 chars) to cubelet sticker colors.
// Returns a map keyed by "x,y,z" where each value is an array of 6 colors matching
// Cubelet material order: [+x, -x, +y, -y, +z, -z]
export function mapFacesToCubelets(faces) {
  // helper to push color into map at position
  const map = new Map();
  function setSticker(x, y, z, materialIndex, color) {
    const key = `${x},${y},${z}`;
    if (!map.has(key)) map.set(key, Array(6).fill(null));
    map.get(key)[materialIndex] = color;
  }

  // Material index mapping: 0:+x,1:-x,2:+y,3:-y,4:+z,5:-z

  // Face helpers: for each face index i (0..8) compute (x,y,z)
  // U (+y)
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = col - 1;
    const z = row - 1; // Top row touches Back (-z)
    setSticker(x, 1, z, 2, faces.U[i]);
  }

  // D (-y)
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = col - 1;
    const z = 1 - row; // Top row touches Front (+z)
    setSticker(x, -1, z, 3, faces.D[i]);
  }

  // R (+x)
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const y = 1 - row;
    const z = 1 - col;
    setSticker(1, y, z, 0, faces.R[i]);
  }

  // L (-x)
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const y = 1 - row;
    const z = col - 1;
    setSticker(-1, y, z, 1, faces.L[i]);
  }

  // F (+z)
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = col - 1;
    const y = 1 - row;
    setSticker(x, y, 1, 4, faces.F[i]);
  }

  // B (-z)
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = 1 - col;
    const y = 1 - row;
    setSticker(x, y, -1, 5, faces.B[i]);
  }

  // Convert map to plain object keyed by "x,y,z"
  const out = Object.create(null);
  for (const [k, v] of map.entries()) out[k] = v;
  return out;
}
