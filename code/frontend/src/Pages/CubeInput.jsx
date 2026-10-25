import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";
import NetEditor from "../Components/NetEditor";
import CameraScan from "../Components/CameraScan";
import { parseCubeString } from "../lib/cubeInput.js";
import { facesToFacelets, faceletsToFaces } from "../cube/facelets.js";
import { cubeApi, ApiError } from "../lib/api.js";
import { useCubeStore } from "../store/cubeStore.js";

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

  // --- input mode: "text" | "manual" | "camera" ---
  const [inputMode, setInputMode] = useState("text");
  const [netKey, setNetKey] = useState(0);
  const [netInitial, setNetInitial] = useState(null);
  const [scanNotice, setScanNotice] = useState("");

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
            <div className="text-xs p-3 rounded-2xl border border-neon-blue/40 bg-neon-blue/10 text-neon-blue flex items-center justify-between shadow-sm">
              <span className="flex items-center gap-2">
                <span>ℹ️</span>
                <span>{scanNotice}</span>
              </span>
              <button
                type="button"
                onClick={() => setScanNotice("")}
                className="text-gray-400 hover:text-white ml-2 text-sm cursor-pointer"
              >
                ✕
              </button>
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
    </AppShell>
  );
}
