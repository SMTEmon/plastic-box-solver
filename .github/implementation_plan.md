# Detailed Project Status & Restoration Plan

This document details exactly what has been implemented and merged into the main repository, and provides a structured plan for what to do next to restore your "vibe coding" features.

---

## What Has Been Done Till Now (In Detail)

The project initially started as two working halves (React frontend and FastAPI backend) that were entirely disconnected. Your teammate has successfully kept and merged your first 5 patches, which securely integrated the two halves.

### Phase 0: Foundations (Completed)
- **API Proxy Setup:** Configured `vite.config.js` to proxy `/api` calls to the backend on `localhost:8000`, bypassing CORS issues.
- **Shared Move Engine:** Ported the backend's Python geometry logic to JS (`facelets.js`, `geometry.js`, `moves.js`). This ensures both frontend and backend mathematically agree on how the cube moves.
- **API Client:** Created `api.js` (using `axios`) as a centralized place for all network requests, including automatic JWT token injection.
- **Engine Parity Tests:** Built `engineParity.test.js` to cross-check the JS engine against the live Python engine, proving the math is byte-identical.

### Phase 1: Logical State & Animation Engine (Completed)
- **State Management:** Replaced direct 3D scene mutations with a Zustand state store (`cubeStore.js`). The cube now has a "logical state" serving as the single source of truth for move history, solved-detection, and efficiency tracking.
- **Animation Queue:** Built a robust animation engine (`animate.js`) that handles face turns (U, D, R, etc.) and whole-cube rotations (X, Y, Z) via a queue, so no moves are dropped during rapid playback.
- **UI Controls:** Removed the debug Leva panel and wired the animator into a real control surface (`KeyboardControls` and on-screen `MoveButtons`).

---

## User Review Required

> [!IMPORTANT]  
> All your remaining work (Patches 0006 - 0029) was reverted. To get it back into the project safely, we should restore it **methodically, phase by phase**, rather than dumping 24 patches into `main` at once. 
> 
> Please review the "What To Do Next" plan below and click **Proceed** if you approve of this structured approach!

---

## What To Do Next (Restoration Plan)

We will apply the reverted patches in logical groups, testing the functionality after each group to ensure no bugs or merge conflicts are introduced.

### Phase 2: UI Overhaul
**Patches to apply:** `0015`, `0028`, `0029`
- Implement the new design system and cleaner app shell.
- Fix UI spacing so the 3D cube gets more screen real estate.
- Resolve any outstanding 3D visual issues.
- *Verification: Check the app shell layout and 3D visual render in the browser.*

### Phase 3: Vision Camera & Net Editor
**Patches to apply:** `0007`, `0009`, `0011`, `0012`, `0020`, `0025`, `0027`
- Restore the webcam scan UI for the OpenCV pipeline.
- Restore the "chroma-only" colour classification logic to fix lighting-related misreads.
- Fix the webcam preview rendering solid black.
- Restore the 2D editable net interface, allowing users to manually fix any stickers the camera misreads before solving.
- *Verification: Start the webcam, scan a cube face, and verify the 2D net editor loads correctly.*

### Phase 4: Guided Solve & Playback
**Patches to apply:** `0006`, `0013`, `0018`, `0019`, `0022`, `0023`, `0024`, `0026`
- Restore the playback speed and pause controls for solution animations.
- Bring back the plain English instructions and orientation guides.
- Restore the CFOP guided method and let users choose which colour to solve first.
- Re-apply the bug fix for the guided solver giving wrong solutions.
- *Verification: Scramble a cube, request an optimal or CFOP solve, and test the playback controls.*

### Phase 5: Auth & Dashboard
**Patches to apply:** `0016`, `0017`, `0021`
- Restore Account Creation, Sign In, and Sign Out.
- Restore the Dashboard, displaying Solve History, Personal Bests, and Leaderboards.
- *Verification: Create a test user, sign in, log a solve, and check the dashboard.*
