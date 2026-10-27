import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";
import NetEditor from "../Components/NetEditor";
import CameraScan from "../Components/CameraScan";
import { parseCubeString } from "../lib/cubeInput.js";
import { facesToFacelets, faceletsToFaces } from "../cube/facelets.js";
import { cubeApi, savedCubesApi, ApiError } from "../lib/api.js";
import { useCubeStore } from "../store/cubeStore.js";
import { useAuthStore } from "../store/authStore.js";

function Card({ title, right, children, className = "" }) {
  return (
    <div className={`bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl p-3 sm:p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const PALETTE = {
  W: "#ffffff",
  Y: "#ffd400",
  R: "#ff4d4d",
  O: "#ff8c00",
  B: "#2d4cff",
  G: "#2ecc71",
};

export default function CubeInput() {
  const navigate = useNavigate();
  const loadScramble = useCubeStore((s) => s.loadScramble);

  const [inputStr, setInputStr] = useState("");
  const [localError, setLocalError] = useState("");
  const [facelets, setFacelets] = useState(null); // locally valid, 54 lowercase
  const [server, setServer] = useState(null); // { valid, detail } from backend
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState("");

  // --- input mode: "text" | "manual" | "camera" (defaults to 2D net) ---
  const [inputMode, setInputMode] = useState("manual");
  const [netKey, setNetKey] = useState(0);
  const [netInitial, setNetInitial] = useState(null);
  const [scanNotice, setScanNotice] = useState("");

  // --- saved cubes (cross-device) ---
  const user = useAuthStore((s) => s.user);
  const [savedCubes, setSavedCubes] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [savingCube, setSavingCube] = useState(false);
  const [saveError, setSaveError] = useState("");

  const refreshSavedCubes = useCallback(async () => {
    if (!user) {
      setSavedCubes([]);
      return;
    }
    setLoadingSaved(true);
    try {
      const list = await savedCubesApi.list();
      setSavedCubes(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load saved cubes:", err);
    } finally {
      setLoadingSaved(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSavedCubes();
  }, [refreshSavedCubes]);

  const handleSaveCube = async () => {
    if (!facelets) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setSavingCube(true);
    setSaveError("");
    try {
      const label =
        saveLabel.trim() ||
        `Cube (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
      await savedCubesApi.save(facelets, label);
      setShowSaveModal(false);
      setSaveLabel("");
      setScanNotice(`✓ Saved "${label}" to your account! Available on PC/mobile.`);
      await refreshSavedCubes();
    } catch (err) {
      setSaveError(err.message || "Failed to save cube");
    } finally {
      setSavingCube(false);
    }
  };

  const handleLoadSavedCube = (saved) => {
    setFacelets(saved.facelets);
    setInputStr(saved.facelets.toUpperCase());
    setNetInitial(saved.facelets);
    setNetKey((k) => k + 1);
    loadScramble(saved.facelets);
    setScanNotice(`✓ Loaded saved cube: "${saved.label}"`);
    setShowSavedModal(false);
  };

  const handleDeleteSavedCube = async (id, e) => {
    e.stopPropagation();
    try {
      await savedCubesApi.delete(id);
      await refreshSavedCubes();
    } catch (err) {
      console.error("Failed to delete saved cube:", err);
    }
  };

  /** Parse locally on every keystroke -- instant feedback, no network. */
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputStr(val);
    setServer(null);
    setApiError("");
    setScanNotice("");

    if (!val.trim()) {
      setLocalError("");
      setFacelets(null);
      return;
    }
    try {
      const faces = parseCubeString(val);
      const fl = facesToFacelets(faces);
      setFacelets(fl);
      setLocalError("");
      loadScramble(fl); // preview follows the input
    } catch (err) {
      setLocalError(err.message);
      setFacelets(null);
    }
  };

  /** Handle facelets coming from the manual net editor. */
  const handleNetChange = useCallback(
    (fl) => {
      setServer(null);
      setApiError("");
      if (fl) {
        setFacelets(fl);
        setInputStr(fl.toUpperCase()); // keep text in sync for tab switch
        setLocalError("");
        loadScramble(fl);
      } else {
        setFacelets(null);
      }
    },
    [loadScramble],
  );

  /** Switch to manual mode, pre-filling net from current facelets. */
  const switchToManual = () => {
    setInputMode("manual");
    setLocalError("");
    if (facelets) {
      setNetInitial(facelets);
      setNetKey((k) => k + 1);
    }
  };

  /** Switch to text mode, syncing the textarea from current facelets. */
  const switchToText = () => {
    setInputMode("text");
    if (facelets) {
      setInputStr(facelets.toUpperCase());
    }
  };

  /** Switch to camera scan mode. */
  const switchToCamera = () => {
    setInputMode("camera");
    setLocalError("");
  };

  /** Handle successful OpenCV camera scan result */
  const handleScanComplete = (scannedFacelets, scanMeta) => {
    setFacelets(scannedFacelets);
    setInputStr(scannedFacelets.toUpperCase());
    setNetInitial(scannedFacelets);
    setNetKey((k) => k + 1);
    loadScramble(scannedFacelets);

    if (scanMeta?.valid) {
      setScanNotice("✓ Camera scan successful! Review stickers below and click 'Solve Cube'.");
    } else {
      setScanNotice(
        `⚠️ Scan extracted 54 stickers with validation note: ${scanMeta?.detail || "Please verify colors on the 2D Net below."}`
      );
    }

    // Automatically transition to Manual Net editor for user confirmation (FR-06c)
    setInputMode("manual");
  };

  /**
   * Second opinion from the backend. Local checks catch colour counts and
   * impossible centres; only the solver can catch a PARITY violation -- a cube
   * with perfect colour counts that still cannot be assembled.
   */
  useEffect(() => {
    if (!facelets) return;
    let cancelled = false;

    cubeApi
      .validate(facelets)
      .then((res) => {
        if (!cancelled) setServer(res);
      })
      .catch((err) => {
        if (!cancelled) setApiError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [facelets]);

  // Derived, not stored: we are waiting on the solver whenever the string
  // parses locally but the backend has not answered for it yet.
  const checking = Boolean(facelets) && server === null && !apiError;

  /** FR-16 -- a guaranteed-solvable scramble, generated by the backend. */
  const handleScramble = async () => {
    setBusy(true);
    setApiError("");
    setScanNotice("");
    try {
      const { facelets: fl } = await cubeApi.scramble(20);
      const cfop = await cubeApi.solve(fl, "cfop");
      setInputStr(fl.toUpperCase());
      setFacelets(fl);
      setLocalError("");
      loadScramble(fl, cfop.optimalMoveCount);
      // Pre-fill the net editor so switching to manual shows the scramble
      setNetInitial(fl);
      setNetKey((k) => k + 1);
    } catch (err) {
      setApiError(
        err instanceof ApiError && err.status === 0
          ? "Backend offline -- start it on port 8000 and try again."
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSolveClick = async () => {
    if (!facelets) return;
    setBusy(true);
    setApiError("");
    try {
      // Fetch the CFOP solution up front: its length is the denominator of
      // the efficiency score, needed even in Interactive mode.
      const cfop = await cubeApi.solve(facelets, "cfop");
      loadScramble(facelets, cfop.optimalMoveCount);
      navigate("/solve");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(facelets) && server?.valid !== false;

  let statusText = "Waiting for input...";
  let statusTone = "text-gray-400";
  if (localError) {
    statusText = localError;
    statusTone = "text-red-400";
  } else if (checking) {
    statusText = "Checking with solver...";
    statusTone = "text-gray-400";
  } else if (server?.valid === false) {
    statusText = `Backend rejected: ${server.detail}`;
    statusTone = "text-red-400";
  } else if (server?.valid) {
    statusText = "Valid and solvable (verified by backend)";
    statusTone = "text-neon-green";
  } else if (facelets) {
    statusText = "Format OK";
    statusTone = "text-neon-green";
  } else if (inputMode === "manual") {
    statusText = "Paint all stickers to continue";
  } else if (inputMode === "camera") {
    statusText = "Capturing cube faces with camera...";
  }

  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row gap-4 min-h-0 lg:h-[calc(100vh-2rem)]">
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* ── header ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl px-4 py-3 shadow-sm shrink-0">
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Cube Input</span>
              </h2>
              <p className="text-[11px] text-gray-400">Input cube state via Camera Scan, Interactive 2D Net, or Scramble text.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate("/login");
                  } else {
                    setShowSavedModal(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-neon-blue/40 bg-neon-blue/10 text-neon-blue text-xs font-semibold cursor-pointer transition-all hover:bg-neon-blue/20 flex items-center gap-1.5 shadow-sm"
                title={user ? "View and load your saved cubes" : "Log in to access saved cubes"}
              >
                <span>📂</span>
                <span>Saved Cubes {user ? `(${savedCubes.length}/3)` : ""}</span>
              </button>

              <button
                onClick={handleScramble}
                disabled={busy}
                className="px-3 py-1.5 rounded-xl border border-neon-green/40 bg-neon-green/10 text-neon-green text-xs font-semibold cursor-pointer transition-all hover:bg-neon-green/20 disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
              >
                <span>🎲</span>
                <span>{busy ? "Scrambling..." : "Random Scramble"}</span>
              </button>

              <div className="flex rounded-xl bg-dark-bg/80 p-1 border border-dark-border text-xs">
                <button
                  onClick={switchToCamera}
                  className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    inputMode === "camera"
                      ? "bg-neon-blue/20 text-neon-blue font-semibold border border-neon-blue/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>📷</span> Camera Scan
                </button>
                <button
                  onClick={switchToManual}
                  className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    inputMode === "manual"
                      ? "bg-neon-blue/20 text-neon-blue font-semibold border border-neon-blue/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>🎨</span> Manual Net
                </button>
                <button
                  onClick={switchToText}
                  className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    inputMode === "text"
                      ? "bg-neon-blue/20 text-neon-blue font-semibold border border-neon-blue/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>⌨️</span> Text
                </button>
              </div>
            </div>
          </div>

          {/* ── scan notice if available ── */}
          {scanNotice && (
            <div className="text-xs p-3 rounded-2xl border border-neon-blue/40 bg-neon-blue/10 text-neon-blue flex items-center justify-between shadow-sm flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <span>ℹ️</span>
                <span>{scanNotice}</span>
              </span>
              <div className="flex items-center gap-2">
                {ready && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) navigate("/login");
                      else setShowSaveModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue font-semibold border border-neon-blue/40 transition-colors text-[11px] cursor-pointer flex items-center gap-1"
                  >
                    <span>💾</span>
                    <span>Save to Account</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setScanNotice("")}
                  className="text-gray-400 hover:text-white text-sm cursor-pointer ml-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ── input workspace ──────────────────────────────────── */}
          <Card
            className={inputMode === "text" ? "shrink-0" : "flex-1 overflow-y-auto"}
            title={
              inputMode === "camera"
                ? "Camera capture (OpenCV)"
                : inputMode === "manual"
                ? "Interactive 2D net editor"
                : "Text input workspace"
            }
            right={
              inputMode === "text" ? (
                <span
                  className={`text-xs font-mono font-bold ${
                    inputStr.replace(/\s/g, "").length === 54
                      ? "text-neon-green"
                      : inputStr.replace(/\s/g, "").length >= 40
                        ? "text-yellow-400"
                        : "text-gray-500"
                  }`}
                >
                  {inputStr.replace(/\s/g, "").length}/54
                </span>
              ) : null
            }
          >
            {inputMode === "camera" ? (
              /* ── camera scan mode (FR-04, FR-06a) ─────────────── */
              <CameraScan
                onScanComplete={handleScanComplete}
                onCancel={switchToManual}
              />
            ) : inputMode === "manual" ? (
              /* ── manual net mode (FR-05, FR-06c) ──────────────── */
              <NetEditor
                key={netKey}
                initialFacelets={netInitial}
                onChange={handleNetChange}
              />
            ) : (
              /* ── text mode ────────────────────────────────────── */
              <div className="flex flex-col gap-3">
                <textarea
                  className="w-full h-24 sm:h-28 min-h-[88px] rounded-2xl p-3 bg-dark-bg/80 text-white border border-dark-border font-mono text-xs resize-none focus:outline-none focus:border-neon-blue/50 focus:shadow-sm transition-colors placeholder:text-gray-600 leading-relaxed"
                  value={inputStr}
                  onChange={handleInputChange}
                  spellCheck={false}
                  placeholder={
                    "Paste 54 characters (URFDLB order), or 6 lines of 9.\n" +
                    "Colours: W Y R O B G\n\n" +
                    "Or hit Random Scramble to pull one from the backend."
                  }
                />

                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-dark-bg/40 border border-dark-border text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-[11px] font-medium">Valid Colors:</span>
                    {Object.entries(PALETTE).map(([letter, c]) => (
                      <span
                        key={letter}
                        title={letter}
                        className="w-4 h-4 rounded border border-white/20 inline-block hover:scale-125 transition-transform cursor-help"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-gray-500">
                    Canonical order: U R F D L B
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* In text mode, fill remaining main column space on desktop with 3D Preview */}
          {inputMode === "text" && (
            <Card title="3D State Preview" className="hidden lg:flex flex-1 min-h-[260px] flex-col">
              <div className="flex-1 min-h-[200px] rounded-xl overflow-hidden bg-dark-bg/80 border border-dark-border flex items-center justify-center relative">
                {facelets ? (
                  <CubeScene />
                ) : (
                  <div className="text-xs text-gray-500 flex flex-col items-center gap-1.5">
                    <span className="text-base opacity-40">⬡</span>
                    <span>Enter 54 stickers or hit Scramble to preview</span>
                  </div>
                )}
              </div>
              {facelets && (
                <div className="mt-2 text-[10px] text-gray-400 font-mono flex items-center justify-between border-t border-dark-border/60 pt-2 shrink-0">
                  {Object.entries(faceletsToFaces(facelets))
                    .map(([f, arr]) => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5">
                        {f}:<strong className="text-white">{arr[4]}</strong>
                      </span>
                    ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ── sidebar ───────────────────────────────────────────── */}
        <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0 min-h-0 lg:h-full lg:overflow-y-auto pr-0.5">
          <Card title="Status & Launch">
            <div
              className={`text-xs font-semibold mb-3 flex items-center gap-2 transition-all duration-300 ${statusTone}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${ready ? "bg-emerald-400" : localError || server?.valid === false ? "bg-rose-400" : "bg-gray-400"}`} />
              <span>{statusText}</span>
            </div>

            {apiError && (
              <div className="text-xs text-rose-400 mb-3 border border-rose-500/30 bg-rose-500/10 rounded-xl p-2.5">
                {apiError}
              </div>
            )}

            <button
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                ready && !busy
                  ? "bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black shadow-lg shadow-neon-blue/20 active:scale-95"
                  : "bg-white/5 text-gray-500 border border-dark-border cursor-not-allowed opacity-50"
              }`}
              onClick={handleSolveClick}
              disabled={!ready || busy}
            >
              {busy ? "Contacting solver..." : "Solve Cube →"}
            </button>

            {ready && (
              <button
                type="button"
                onClick={() => {
                  if (!user) navigate("/login");
                  else setShowSaveModal(true);
                }}
                className="w-full mt-2 py-2 px-3 rounded-xl border border-neon-blue/40 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>💾</span>
                <span>Save to Account (Phone ➔ PC)</span>
              </button>
            )}
          </Card>

          <Card title="Algorithm Engine">
            <div className="text-xs text-gray-200 font-semibold">
              Kociemba 2-Phase Solver
            </div>
            <div className="text-[11px] text-gray-400 mt-1 leading-snug">
              Generates optimal ≤20 move solutions. Supports Beginner and CFOP stage coaching in workspace.
            </div>
          </Card>

          <Card
            title="3D State Preview"
            className={inputMode === "text" ? "lg:hidden" : ""}
          >
            <div className="h-52 rounded-xl overflow-hidden bg-dark-bg/80 border border-dark-border flex items-center justify-center relative">
              {facelets ? (
                <CubeScene />
              ) : (
                <div className="text-xs text-gray-500 flex flex-col items-center gap-1.5">
                  <span className="text-base opacity-40">⬡</span>
                  <span>Paint 54 stickers to preview</span>
                </div>
              )}
            </div>
            {facelets && (
              <div className="mt-2.5 text-[10px] text-gray-400 font-mono flex items-center justify-between border-t border-dark-border/60 pt-2">
                {Object.entries(faceletsToFaces(facelets))
                  .map(([f, arr]) => (
                    <span key={f} className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5">
                      {f}:<strong className="text-white">{arr[4]}</strong>
                    </span>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Modal: Saved Cubes Drawer (Slot Management) ── */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-surface border border-dark-border rounded-2xl max-w-lg w-full p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-dark-border/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📂</span>
                  <span>Saved Cubes</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neon-blue/20 text-neon-blue border border-neon-blue/30">
                    {savedCubes.length}/3 Slots
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Scan on phone, save to account, and load here on PC anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="text-gray-400 hover:text-white text-lg p-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {loadingSaved ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading saved cubes...</div>
              ) : savedCubes.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                  <div className="text-2xl">🧊</div>
                  <p className="font-semibold text-gray-300">No saved cubes yet</p>
                  <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                    Take a Camera Scan on your phone or paint a cube, then tap &apos;Save to Account&apos; to sync across devices.
                  </p>
                </div>
              ) : (
                savedCubes.map((cube) => (
                  <div
                    key={cube.id}
                    className="p-3.5 rounded-xl border border-dark-border bg-dark-bg/60 hover:border-neon-blue/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-white tracking-tight truncate">
                        {cube.label}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>
                          {new Date(cube.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-neon-blue">54 stickers valid</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadSavedCube(cube)}
                        className="px-3 py-1.5 rounded-lg bg-neon-blue text-black font-bold text-xs hover:bg-neon-blue/90 transition-all shadow-sm cursor-pointer"
                      >
                        Load Cube →
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedCube(cube.id, e)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs transition-all cursor-pointer"
                        title="Delete saved cube"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Remaining slot indicator */}
              {savedCubes.length < 3 && (
                <div className="p-3 rounded-xl border border-dashed border-dark-border/80 text-center text-[11px] text-gray-500">
                  + {3 - savedCubes.length} slot{3 - savedCubes.length > 1 ? "s" : ""} available
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-dark-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2 rounded-xl border border-dark-border text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Save Cube Dialog ── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-surface border border-dark-border rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <span>💾</span>
              <span>Save Cube to Account</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Save this cube so you can continue solving on any device ({savedCubes.length}/3 slots used).
            </p>

            {saveError && (
              <div className="text-xs text-rose-400 mb-3 border border-rose-500/30 bg-rose-500/10 rounded-xl p-2.5">
                {saveError}
              </div>
            )}

            {savedCubes.length >= 3 ? (
              <div className="text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded-xl p-3 mb-4">
                ⚠️ All 3 saved cube slots are full. Please delete an older cube from your saved list before saving a new one.
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Cube Label
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value)}
                    placeholder="e.g., Living Room Cube, Scanned Scan 1"
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-neon-blue/50"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-border/60">
              <button
                type="button"
                onClick={() => {
                  setShowSaveModal(false);
                  setSaveError("");
                }}
                className="px-4 py-2 rounded-xl border border-dark-border text-xs text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {savedCubes.length < 3 && (
                <button
                  type="button"
                  onClick={handleSaveCube}
                  disabled={savingCube}
                  className="px-4 py-2 rounded-xl bg-neon-blue text-black font-bold text-xs hover:bg-neon-blue/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingCube ? "Saving..." : "Save Cube"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
