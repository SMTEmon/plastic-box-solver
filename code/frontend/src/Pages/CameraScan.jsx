import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import { cubeApi } from "../lib/api.js";
import { faceletsToFaces } from "../cube/facelets.js";
import { COLOUR_HEX } from "../cube/notation.js";
import { useCubeStore } from "../store/cubeStore.js";

/**
 * FR-04 / FR-06a / FR-17 -- the camera UI for the OpenCV pipeline.
 *
 * The backend wants exactly six images, field name "images", in URFDLB order,
 * each captured upright and roughly filling the frame. Wrong order or a
 * rotated face produces a physically inconsistent cube, which validate()
 * rejects -- so the order is enforced by the slots below rather than left to
 * the user.
 *
 * The endpoint returns the detected facelets EVEN WHEN INVALID, plus per-face
 * blurry/dark flags, specifically so the user can fix a couple of stickers
 * instead of re-shooting everything.
 */

const FACES = [
  { key: "U", name: "Up (top)", hint: "Hold the cube so this face points at the camera. Keep the same up-direction for every shot." },
  { key: "R", name: "Right", hint: "Turn the cube left by 90° from Front, so the right side faces you." },
  { key: "F", name: "Front", hint: "The face towards you in your normal grip." },
  { key: "D", name: "Down (bottom)", hint: "Tip the cube forward so the bottom faces the camera." },
  { key: "L", name: "Left", hint: "Turn the cube right by 90° from Front." },
  { key: "B", name: "Back", hint: "Turn the cube 180° from Front." },
];

function Panel({ title, children, className = "" }) {
  return (
    <div className={`bg-dark-surface border border-dark-border rounded-xl p-4 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

/** 3x3 grid preview of a detected face, straight from the facelet string. */
function FaceGrid({ letters, label, warn }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`grid grid-cols-3 gap-0.5 p-1 rounded ${
          warn ? "ring-1 ring-yellow-500" : ""
        }`}
      >
        {letters.map((c, i) => (
          <span
            key={i}
            className="w-5 h-5 rounded-sm border border-black/40"
            style={{ background: COLOUR_HEX[c.toLowerCase()] ?? "#333" }}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

export default function CameraScan() {
  const navigate = useNavigate();
  const loadScramble = useCubeStore((s) => s.loadScramble);

  const [files, setFiles] = useState({}); // { U: File, R: File, ... }
  const [previews, setPreviews] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // webcam capture
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [camSlot, setCamSlot] = useState(0);

  useEffect(
    () => () => streamRef.current?.getTracks().forEach((t) => t.stop()),
    [],
  );

  const setFace = (key, file) => {
    setFiles((f) => ({ ...f, [key]: file }));
    setPreviews((p) => {
      if (p[key]) URL.revokeObjectURL(p[key]);
      return { ...p, [key]: URL.createObjectURL(file) };
    });
    setResult(null);
    setError("");
  };

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 640 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
    } catch {
      setError(
        "Could not open the camera. Browsers only allow this on localhost or HTTPS — " +
          "you can still upload six photos below.",
      );
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };

  /** Grab a centre square from the video -- the detector splits a 3x3 grid. */
  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = side;
    canvas
      .getContext("2d")
      .drawImage(
        v,
        (v.videoWidth - side) / 2,
        (v.videoHeight - side) / 2,
        side,
        side,
        0,
        0,
        side,
        side,
      );
    canvas.toBlob((blob) => {
      const key = FACES[camSlot].key;
      setFace(key, new File([blob], `${key}.jpg`, { type: "image/jpeg" }));
      setCamSlot((s) => Math.min(s + 1, FACES.length - 1));
    }, "image/jpeg", 0.92);
  };

  const allSix = FACES.every((f) => files[f.key]);

  const runScan = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      // Order matters: the backend reads them as URFDLB.
      const ordered = FACES.map((f) => files[f.key]);
      setResult(await cubeApi.scan(ordered));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const useThisCube = async () => {
    if (!result?.facelets) return;
    setBusy(true);
    try {
      const optimal = await cubeApi.solve(result.facelets, "optimal");
      loadScramble(result.facelets, optimal.optimalMoveCount);
      navigate("/solve");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const detectedFaces = result?.facelets ? faceletsToFaces(result.facelets) : null;
  const flagged = new Set(
    (result?.faces ?? []).filter((f) => f.blurry || f.dark).map((f) => f.face),
  );

  return (
    <AppShell>
      <div className="flex gap-4 h-[calc(100vh-2rem)]">
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Camera Scan</h2>
            <div className="flex gap-2">
              {!camOn ? (
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg border border-neon-green/60 bg-neon-green/10 text-neon-green text-xs font-medium cursor-pointer hover:bg-neon-green/20"
                >
                  Use webcam
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 rounded-lg border border-dark-border bg-dark-surface text-gray-300 text-xs cursor-pointer hover:text-white"
                >
                  Stop camera
                </button>
              )}
              <button
                onClick={() => navigate("/cube-input")}
                className="px-3 py-1.5 rounded-lg border border-dark-border bg-dark-surface text-gray-300 text-xs cursor-pointer hover:text-white"
              >
                Manual input
              </button>
            </div>
          </div>

          {camOn && (
            <Panel title={`Capturing: ${FACES[camSlot].name}`}>
              <div className="relative w-full max-w-md mx-auto aspect-square rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* 3x3 guide frame -- the detector splits the frame into
                    thirds, so the cube must fill it and be axis-aligned. */}
                <div className="absolute inset-[12%] grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="border border-neon-blue/70" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {FACES[camSlot].hint}
              </p>
              <div className="flex gap-2 mt-3">
                <select
                  value={camSlot}
                  onChange={(e) => setCamSlot(Number(e.target.value))}
                  className="bg-dark-bg border border-dark-border rounded-lg px-2 py-2 text-xs text-gray-300"
                >
                  {FACES.map((f, i) => (
                    <option key={f.key} value={i}>
                      {i + 1}. {f.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={capture}
                  className="flex-1 py-2 rounded-lg bg-neon-blue text-dark-bg text-xs font-bold cursor-pointer hover:opacity-90"
                >
                  Capture {FACES[camSlot].key}
                </button>
              </div>
            </Panel>
          )}

          <Panel title="Six faces, in this exact order">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FACES.map((f, i) => (
                <label
                  key={f.key}
                  className={`block rounded-xl border p-3 cursor-pointer transition-colors ${
                    files[f.key]
                      ? flagged.has(f.key)
                        ? "border-yellow-500/60 bg-yellow-500/5"
                        : "border-neon-green/50 bg-neon-green/5"
                      : "border-dark-border bg-dark-bg hover:border-neon-blue"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">
                      {i + 1}. {f.name}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      {f.key}
                    </span>
                  </div>
                  <div className="aspect-square rounded-lg overflow-hidden bg-black border border-dark-border flex items-center justify-center">
                    {previews[f.key] ? (
                      <img
                        src={previews[f.key]}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-600">
                        click to add photo
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 leading-snug">
                    {f.hint}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && setFace(f.key, e.target.files[0])
                    }
                  />
                </label>
              ))}
            </div>
          </Panel>
        </div>

        {/* --- sidebar --- */}
        <div className="w-80 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <Panel title="Scan">
            <div className="text-xs text-gray-400 mb-3">
              {Object.keys(files).length}/6 faces ready
            </div>
            <button
              onClick={runScan}
              disabled={!allSix || busy}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                allSix && !busy
                  ? "bg-neon-blue text-dark-bg hover:opacity-90 cursor-pointer"
                  : "bg-gray-800 text-gray-500 border border-dark-border cursor-not-allowed"
              }`}
            >
              {busy ? "Detecting..." : "Detect cube state"}
            </button>
            <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
              Sends all six images to <span className="font-mono">/api/cube/scan</span>.
              Colours are classified against each face&apos;s own centre
              cubelet, so lighting can vary between shots.
            </p>
          </Panel>

          {error && (
            <Panel title="Error" className="border-red-500/40">
              <div className="text-xs text-red-400">{error}</div>
            </Panel>
          )}

          {result && (
            <>
              <Panel
                title="Result"
                className={result.valid ? "border-neon-green/50" : "border-yellow-500/50"}
              >
                <div
                  className={`text-sm font-bold ${
                    result.valid ? "text-neon-green" : "text-yellow-400"
                  }`}
                >
                  {result.valid ? "Legal, solvable cube" : "Detected, but not legal"}
                </div>
                {result.detail && (
                  <p className="text-xs text-gray-400 mt-1">{result.detail}</p>
                )}
                <div className="mt-3 text-[10px] font-mono text-gray-500 break-all">
                  {result.facelets}
                </div>
                <button
                  onClick={useThisCube}
                  disabled={!result.valid || busy}
                  className={`w-full mt-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    result.valid && !busy
                      ? "bg-neon-blue text-dark-bg hover:opacity-90 cursor-pointer"
                      : "bg-gray-800 text-gray-500 border border-dark-border cursor-not-allowed"
                  }`}
                >
                  Solve this cube
                </button>
              </Panel>

              <Panel title="What it saw">
                <div className="grid grid-cols-3 gap-3">
                  {["U", "R", "F", "D", "L", "B"].map((k) => (
                    <FaceGrid
                      key={k}
                      letters={detectedFaces[k]}
                      label={k}
                      warn={flagged.has(k)}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                  Compare these against your cube. If one or two stickers are
                  wrong, that is normal &mdash; the scan only has to be close
                  enough to beat typing 54 letters by hand.
                </p>
              </Panel>

              <Panel title="Capture quality">
                <div className="space-y-1.5">
                  {result.faces.map((f) => {
                    const bad = f.blurry || f.dark;
                    return (
                      <div
                        key={f.face}
                        className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-2 border ${
                          bad
                            ? "border-yellow-500/40 bg-yellow-500/5 text-yellow-400"
                            : "border-transparent text-neon-green/70"
                        }`}
                      >
                        <span className="font-mono">{f.face}</span>
                        <span>
                          {f.blurry && f.dark
                            ? "blurry + dark — retake"
                            : f.blurry
                              ? "blurry — retake"
                              : f.dark
                                ? "too dark — retake"
                                : "ok"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
