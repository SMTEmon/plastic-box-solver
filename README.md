# Plastic Box Solver 🧊

An interactive 3D Rubik's Cube application featuring optimal solving algorithms, stage-by-stage coaching, OpenCV camera scanning, and real-time 3D interactive manipulation.

---

## 🚀 Quick Start & How to Run

### Prerequisites
- **Node.js**: v20 or later & `npm`
- **Python**: v3.11 or v3.12 & `pip`
- **Docker & Docker Compose** *(Optional, for containerized run)*

---

### Option 1: Local Development (Recommended)

#### 1. Start the Backend API
```bash
# From repository root
cd code/backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API will be available at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

#### 2. Start the Frontend Client
In a new terminal window:
```bash
# From repository root
cd code/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

### Option 2: Run with Docker Compose

To spin up PostgreSQL, the FastAPI backend, and the Vite frontend in synchronized containers:

```bash
# From repository root
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5433`

---

## 🧪 Running Tests

### Frontend Unit & Parity Tests
```bash
cd code/frontend
npm test
```
Runs 66 automated tests covering:
- 3D layer animation & dynamic queue scaling
- Kociemba notation & visual orientation parity
- Stage detection & CFOP algorithm chunking
- Keyboard controls & swipe gestures
- Saved cubes API & solve replay loading

### Backend Tests
```bash
cd code/backend
source .venv/bin/activate
pytest tests
```
Runs comprehensive pytest suites covering:
- Kociemba two-phase solver & Beginner solver
- Center-referenced OpenCV cube detector
- Saved cubes CRUD (3-slot restriction)
- Solve history, PB metadata, and profile endpoints

---

## ✨ Features

- **Interactive 3D Cube Canvas:** Built with Three.js and `@react-three/fiber`. Supports smooth layer turns, middle slices (`M`, `E`, `S`), whole-cube rotations, camera orbital navigation, and mobile touch swipes.
- **Dynamic Animation Engine:** Snappy queue-boosted animation engine (`JEASINGS`) that prevents move dropping and accelerates smoothly when stepping through moves rapidly without visual ghosting.
- **Multiple Solving Methods:**
  - **Optimal (Kociemba Two-Phase):** Computes solutions in $\le 20$ moves.
  - **Beginner (Layer-by-Layer):** Intuitive step-by-step solving path.
  - **CFOP Method:** Cross, F2L, OLL, and PLL algorithm breakdown with efficiency scoring.
- **Stage Coach & Full-Screen Mode:**
  - Live 7-stage progress checklist with algorithm trigger chunking and checkpoint rollback.
  - Collapsible coaching sidebar to allow a clean, distraction-free full-screen 3D view.
- **OpenCV Camera Scanner:**
  - Multi-step 6-face capture sequence with a continuous rotation flow (`F → R → B → L → U → D`).
  - Surrounding edge-color indicators (`▲ Top`, `▼ Bottom`, `◀ Left`, `▶ Right`) ensuring exact orientation matching canonical `URFDLB` format.
  - Center-referenced HSV color classification robust to varying room lighting.
- **2D Net Editor & Random Scrambler:** Manual net editor with palette painting and validation of opposite center colors and sticker counts.
- **History, Replay & Leaderboard:**
  - Save completed solves with timing, move counts, and personal best (PB) metadata.
  - Step-by-step 3D solve replay with speed slider (0.5x, 1x, 1.5x, 2x).
  - Cross-device 3-slot saved cubes storage.

---

## ⌨️ Controls & Shortcuts Reference

### Interactive Cube Manipulation
| Key | Action |
| :--- | :--- |
| `U`, `D`, `L`, `R`, `F`, `B` | Standard 90° clockwise face turn |
| `Shift` + Face Key | Counter-clockwise (prime) turn (e.g., `U'`, `R'`) |
| `2` + Face Key | 180° double face turn (e.g., `U2`, `R2`) |
| `M`, `E`, `S` | Middle slice layer turns |
| `↑`, `↓`, `←`, `→` (Arrow Keys) | Whole-cube spatial rotation (`X`, `X'`, `Y`, `Y'`) |
| `Shift` + Arrow Key | 180° double cube rotation (`X2`, `Y2`) |
| `Ctrl + Z` / `Cmd + Z` | Undo last move |
| `Ctrl + Shift + Z` | Redo move |

### Assisted Playback (Guided & Auto-Solve)
| Key | Action |
| :--- | :--- |
| `Space` | Toggle Play / Pause playback |
| `→` (Right Arrow) or `Enter` | Step to **Next** move |
| `←` (Left Arrow) or `Backspace` | Step to **Previous** move |

---

## 📁 Project Structure

```text
plastic-box-solver/
├── docker-compose.yml          # Container configuration for DB, Backend, and Frontend
├── README.md                   # Project documentation & run guide
└── code/
    ├── backend/
    │   ├── app/
    │   │   ├── main.py         # FastAPI application entry point
    │   │   ├── database.py     # Database session & engine configuration
    │   │   ├── models.py       # SQLAlchemy ORM models (User, Solve, SavedCube)
    │   │   ├── schemas.py      # Pydantic request & response schemas
    │   │   ├── cube/           # Solver core (Kociemba, Beginner, CFOP, moves)
    │   │   ├── routers/        # API endpoints (auth, cube, solves, saved_cubes, profile)
    │   │   └── vision/         # OpenCV color detection (sample_face, detect)
    │   ├── tests/              # Pytest test suites
    │   └── requirements.txt    # Python dependencies
    └── frontend/
        ├── src/
        │   ├── Components/     # Cube3D, CoachSidebar, SolveControlsDock, CameraScan, NetEditor
        │   ├── Layout/         # AppShell (collapsible sidebar, responsive header, branding)
        │   ├── Pages/          # Dashboard, CubeInput, SolveWorkspace, Tutorial, Leaderboard
        │   ├── Three/          # Three.js canvas setup, scene epoch, camera animations
        │   ├── cube/           # Animation engine, keyboard bindings, swipe controls, facelets
        │   ├── store/          # Zustand state stores (cubeStore, authStore, tutorialStore)
        │   └── lib/            # API client, geometry helpers, algorithm trigger chunker
        ├── tests/              # Node.js automated test runner suite
        └── package.json        # Frontend scripts and npm dependencies
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/cube/solve` | Solves a 54-char facelet string using `optimal`, `beginner`, or `cfop` |
| `POST` | `/api/cube/scan` | Analyzes 6 uploaded face photos via OpenCV and returns extracted facelets |
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/token` | Obtain JWT access token |
| `GET` | `/api/solves` | Fetch paginated solve history with PB metadata |
| `POST` | `/api/solves` | Record a completed solve (time, moves, solution string) |
| `GET` | `/api/cubes` | List saved cube slots (max 3 per user) |
| `POST` | `/api/cubes` | Save a cube state into a slot |
| `DELETE` | `/api/cubes/{id}` | Delete a saved cube slot |
| `GET/PUT` | `/api/profile` | Retrieve and update user display name and profile |

---

## 📄 License

This project is open-source software built for Software Project Lab-II (SWE 4404) at the Department of Computer Science and Engineering, Islamic University of Technology (IUT).
