/**
 * CameraScan — Multi-step camera capture interface for physical Rubik's Cube (FR-04, FR-06a).
 *
 * Captures 6 face images in an intuitive, continuous rotation sequence:
 *   1. Front (F)  — Green center (White on Top)
 *   2. Right (R)  — Red center   (Turn 90° left, White on Top)
 *   3. Back (B)   — Blue center  (Turn 90° left, White on Top)
 *   4. Left (L)   — Orange center(Turn 90° left, White on Top)
 *   5. Up (U)     — White center (Tilt cube down toward you)
 *   6. Down (D)   — Yellow center(Tilt cube up away from you)
 *
 * Packages captured images into canonical URFDLB order when submitting to POST /api/cube/scan.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { cubeApi, ApiError } from "../lib/api.js";

// Canonical western scheme: White opposite Yellow, Green opposite Blue, Red opposite Orange
export const SCAN_STEPS = [
  {
    key: "F",
    canonicalName: "Front Face",
    center: "Green",
    color: "#10b981",
    action: "Hold Green facing camera",
    subAction: "Keep White center on TOP edge",
    icon: "🟩",
    edges: {
      top: { label: "White", color: "#ffffff", textDark: true },
      bottom: { label: "Yellow", color: "#ffd400", textDark: true },
      left: { label: "Orange", color: "#ff8c00", textDark: false },
      right: { label: "Red", color: "#ff4d4d", textDark: false },
    },
  },
  {
    key: "R",
    canonicalName: "Right Face",
    center: "Red",
    color: "#ff4d4d",
    action: "Turn cube 90° to the left",
    subAction: "Red faces camera. White stays on TOP edge",
    icon: "🔄",
    edges: {
      top: { label: "White", color: "#ffffff", textDark: true },
      bottom: { label: "Yellow", color: "#ffd400", textDark: true },
      left: { label: "Green", color: "#10b981", textDark: false },
      right: { label: "Blue", color: "#3b82f6", textDark: false },
    },
  },
  {
    key: "B",
    canonicalName: "Back Face",
    center: "Blue",
    color: "#3b82f6",
    action: "Turn cube 90° to the left again",
    subAction: "Blue faces camera. White stays on TOP edge",
    icon: "🔄",
    edges: {
      top: { label: "White", color: "#ffffff", textDark: true },
      bottom: { label: "Yellow", color: "#ffd400", textDark: true },
      left: { label: "Red", color: "#ff4d4d", textDark: false },
      right: { label: "Orange", color: "#ff8c00", textDark: false },
    },
  },
  {
    key: "L",
    canonicalName: "Left Face",
    center: "Orange",
    color: "#ff8c00",
    action: "Turn cube 90° to the left again",
    subAction: "Orange faces camera. White stays on TOP edge",
    icon: "🔄",
    edges: {
      top: { label: "White", color: "#ffffff", textDark: true },
      bottom: { label: "Yellow", color: "#ffd400", textDark: true },
      left: { label: "Blue", color: "#3b82f6", textDark: false },
      right: { label: "Green", color: "#10b981", textDark: false },
    },
  },
  {
    key: "U",
    canonicalName: "Up / Top Face",
    center: "White",
    color: "#ffffff",
    action: "Tilt cube down towards you",
    subAction: "White faces camera. Green is at BOTTOM, Blue at TOP",
    icon: "⬇️",
    edges: {
      top: { label: "Blue", color: "#3b82f6", textDark: false },
      bottom: { label: "Green", color: "#10b981", textDark: false },
      left: { label: "Orange", color: "#ff8c00", textDark: false },
      right: { label: "Red", color: "#ff4d4d", textDark: false },
    },
  },
  {
    key: "D",
    canonicalName: "Down / Bottom Face",
    center: "Yellow",
    color: "#ffd400",
    action: "Tilt cube up (away from you)",
    subAction: "Yellow faces camera. Green is at TOP, Blue at BOTTOM",
    icon: "⬆️",
    edges: {
      top: { label: "Green", color: "#10b981", textDark: false },
      bottom: { label: "Blue", color: "#3b82f6", textDark: false },
      left: { label: "Orange", color: "#ff8c00", textDark: false },
      right: { label: "Red", color: "#ff4d4d", textDark: false },
    },
  },
];

// Backend OpenCV detector strictly expects images in URFDLB order
const CANONICAL_ORDER = ["U", "R", "F", "D", "L", "B"];

export default function CameraScan({ onScanComplete, onCancel }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState({
    U: null,
    R: null,
    F: null,
    D: null,
    L: null,
    B: null,
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { valid, detail, faces }
  const [apiError, setApiError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isMountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const sessionIdRef = useRef(0);
  const blobUrlsRef = useRef(new Set());

  const currentFace = SCAN_STEPS[currentStepIndex];

  // Stop webcam and release video element source
  const stopCamera = useCallback(() => {
    sessionIdRef.current += 1;
    isStartingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      if (videoRef.current.srcObject && "getTracks" in videoRef.current.srcObject) {
        try {
          videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        } catch {
          // Ignore
        }
      }
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Start webcam
  const startCamera = useCallback(async () => {
    if (isStartingRef.current) {
      return;
    }
    isStartingRef.current = true;
    const currentSession = ++sessionIdRef.current;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser or context (requires HTTPS).");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      });

      if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          if (playErr.name === "AbortError") {
            if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
              stream.getTracks().forEach((t) => t.stop());
            }
            return;
          }
          throw playErr;
        }
      }

      if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        return;
      }

      setCameraError("");
      setCameraActive(true);
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      if (!isMountedRef.current || sessionIdRef.current !== currentSession) {
        return;
      }
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser or use Manual Net."
          : `Unable to access camera: ${err.message}`
      );
      setCameraActive(false);
    } finally {
      if (sessionIdRef.current === currentSession) {
        isStartingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      await startCamera();
    })();
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // Capture current video frame
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    // Center crop to square
    const sx = ((video.videoWidth || size) - size) / 2;
    const sy = ((video.videoHeight || size) - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${currentFace.key}.jpg`, {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.add(previewUrl);

        setCapturedImages((prev) => {
          if (prev[currentFace.key]?.previewUrl) {
            URL.revokeObjectURL(prev[currentFace.key].previewUrl);
            blobUrlsRef.current.delete(prev[currentFace.key].previewUrl);
          }
          const next = {
            ...prev,
            [currentFace.key]: { file, previewUrl },
          };

          // Advance to next uncaptured face in natural sequence
          const nextIdx = SCAN_STEPS.findIndex(
            (step, idx) => idx > currentStepIndex && !next[step.key],
          );
          if (nextIdx !== -1) {
            setCurrentStepIndex(nextIdx);
          } else {
            const anyMissing = SCAN_STEPS.findIndex(
              (step) => !next[step.key],
            );
            if (anyMissing !== -1) {
              setCurrentStepIndex(anyMissing);
            }
          }

          return next;
        });
      },
      "image/jpeg",
      0.92,
    );
  };

  // Submit all 6 captured images to the backend in canonical URFDLB order
  const handleProcessScan = async () => {
    const missing = SCAN_STEPS.filter((f) => !capturedImages[f.key]);
    if (missing.length > 0) {
      setApiError(`Please capture all 6 faces first. Missing: ${missing.map((m) => m.canonicalName).join(", ")}`);
      return;
    }

    setScanning(true);
    setApiError("");
    setScanResult(null);

    try {
      const files = CANONICAL_ORDER.map((key) => capturedImages[key].file);
      const res = await cubeApi.scan(files);
      setScanResult(res);

      if (res.facelets) {
        stopCamera();
        onScanComplete?.(res.facelets, res);
      }
    } catch (err) {
      setApiError(
        err instanceof ApiError && err.status === 0
          ? "Backend offline — ensure backend is running on port 8000."
          : err.message
      );
    } finally {
      setScanning(false);
    }
  };

  const capturedCount = Object.values(capturedImages).filter(Boolean).length;
  const allCaptured = capturedCount === 6;

  return (
    <div className="bg-dark-bg border border-dark-border rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
            Camera Cube Scanner
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Hold your cube up to the camera and align it inside the grid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-neon-blue bg-neon-blue/10 px-2.5 py-1 rounded-lg border border-neon-blue/30">
            {capturedCount}/6 Faces
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-dark-border hover:bg-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* ── Orientation Anchor Banner ── */}
      <div className="bg-neon-blue/[0.06] border border-neon-blue/20 rounded-xl px-3.5 py-2.5 text-xs text-gray-300 flex items-center gap-2.5">
        <span className="text-base shrink-0">🧭</span>
        <div>
          <span className="font-bold text-white">Starting Reference: </span>
          <span>Start with <span className="font-semibold text-emerald-400">Green in Front</span> and <span className="font-semibold text-white">White on Top</span>. Follow the rotation steps below for a seamless 6-face scan.</span>
        </div>
      </div>

      {/* ── Error messages ── */}
      {cameraError && (
        <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 p-3 rounded-xl flex items-center justify-between">
          <span>{cameraError}</span>
          <button
            type="button"
            onClick={startCamera}
            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
          >
            Retry Camera
          </button>
        </div>
      )}

      {apiError && (
        <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 p-3 rounded-xl">
          {apiError}
        </div>
      )}

      {/* ── Active Viewport with Surrounding Edge Badges & Alignment Guide ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Camera Feed with Edge Indicators */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative aspect-square max-w-[360px] w-full bg-black rounded-2xl overflow-hidden border border-dark-border flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* ── Surrounding Edge Color Badges ── */}
            {cameraActive && (
              <>
                {/* Top Edge Pill */}
                <div className="absolute top-2.5 inset-x-0 flex justify-center pointer-events-none z-10">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-bold shadow-md">
                    <span className="text-gray-400">▲ TOP:</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-black/30"
                      style={{ background: currentFace.edges.top.color }}
                    />
                    <span className="text-white">{currentFace.edges.top.label}</span>
                  </div>
                </div>

                {/* Bottom Edge Pill */}
                <div className="absolute bottom-2.5 inset-x-0 flex justify-center pointer-events-none z-10">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-bold shadow-md">
                    <span className="text-gray-400">▼ BOTTOM:</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-black/30"
                      style={{ background: currentFace.edges.bottom.color }}
                    />
                    <span className="text-white">{currentFace.edges.bottom.label}</span>
                  </div>
                </div>

                {/* Left Edge Pill */}
                <div className="absolute left-2.5 inset-y-0 flex items-center pointer-events-none z-10">
                  <div className="flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-[9px] font-bold shadow-md">
                    <span className="text-gray-400">◀</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30"
                      style={{ background: currentFace.edges.left.color }}
                    />
                    <span className="text-white rotate-180 [writing-mode:vertical-rl]">{currentFace.edges.left.label}</span>
                  </div>
                </div>

                {/* Right Edge Pill */}
                <div className="absolute right-2.5 inset-y-0 flex items-center pointer-events-none z-10">
                  <div className="flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-[9px] font-bold shadow-md">
                    <span className="text-gray-400">▶</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30"
                      style={{ background: currentFace.edges.right.color }}
                    />
                    <span className="text-white rotate-180 [writing-mode:vertical-rl]">{currentFace.edges.right.label}</span>
                  </div>
                </div>
              </>
            )}

            {/* 3x3 Reticle Overlay */}
            <div className="absolute inset-11 pointer-events-none border-2 border-neon-blue rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.3)] grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-neon-blue/30 flex items-center justify-center relative"
                >
                  {i === 4 && (
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white shadow-md animate-pulse"
                        style={{ background: currentFace.color }}
                        title={`Target center: ${currentFace.center}`}
                      />
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {currentFace.center}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 bg-dark-bg/90 flex flex-col items-center justify-center text-xs text-gray-400 gap-2">
                <span className="animate-spin text-lg">⏳</span>
                <span>Initializing camera stream...</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Step Guidance & Action Controls ── */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Target Face & Rotation Instructions Card */}
          <div className="bg-dark-surface p-4 rounded-2xl border border-dark-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neon-blue bg-neon-blue/10 px-2.5 py-0.5 rounded-md border border-neon-blue/30">
                Step {currentStepIndex + 1} of 6
              </span>
              <div className="flex items-center gap-1.5 text-xs text-gray-300">
                <span>Center:</span>
                <span
                  className="w-3 h-3 rounded-full border border-white/20 inline-block"
                  style={{ background: currentFace.color }}
                />
                <span className="font-bold text-white">{currentFace.center}</span>
              </div>
            </div>

            {/* Clear Rotation Action */}
            <div className="bg-dark-bg/80 border border-dark-border rounded-xl p-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                <span className="text-base">{currentFace.icon}</span>
                <span>{currentFace.action}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {currentFace.subAction}
              </p>
            </div>

            {/* Edge Color Checklist */}
            <div className="space-y-1.5 pt-1 border-t border-dark-border/60">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                Verify Edge Alignment:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 bg-dark-bg/60 p-1.5 rounded-lg border border-dark-border/40">
                  <span className="text-gray-500 font-semibold">Top:</span>
                  <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ background: currentFace.edges.top.color }} />
                  <span className="text-gray-200 font-medium">{currentFace.edges.top.label}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-dark-bg/60 p-1.5 rounded-lg border border-dark-border/40">
                  <span className="text-gray-500 font-semibold">Bottom:</span>
                  <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ background: currentFace.edges.bottom.color }} />
                  <span className="text-gray-200 font-medium">{currentFace.edges.bottom.label}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-dark-bg/60 p-1.5 rounded-lg border border-dark-border/40">
                  <span className="text-gray-500 font-semibold">Left:</span>
                  <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ background: currentFace.edges.left.color }} />
                  <span className="text-gray-200 font-medium">{currentFace.edges.left.label}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-dark-bg/60 p-1.5 rounded-lg border border-dark-border/40">
                  <span className="text-gray-500 font-semibold">Right:</span>
                  <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ background: currentFace.edges.right.color }} />
                  <span className="text-gray-200 font-medium">{currentFace.edges.right.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Capture Action Button */}
          <button
            type="button"
            onClick={captureFrame}
            disabled={!cameraActive}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black cursor-pointer shadow-lg shadow-neon-blue/20 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>📸</span>
            <span>Capture {currentFace.canonicalName} ({currentFace.center})</span>
          </button>

          {/* Quality flags feedback if returned */}
          {scanResult?.faces && (
            <div className="bg-dark-surface p-3 rounded-xl border border-dark-border text-xs">
              <div className="font-semibold text-gray-300 mb-1.5">
                Image Quality Feedback:
              </div>
              <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
                {scanResult.faces.map((f) => (
                  <div
                    key={f.face}
                    className={`p-1.5 rounded-lg border text-center ${
                      f.blurry || f.dark
                        ? "bg-red-500/10 border-red-500/30 text-red-300"
                        : "bg-neon-green/10 border-neon-green/30 text-neon-green"
                    }`}
                  >
                    <span>{f.face}: </span>
                    {f.blurry
                      ? "Blurry ⚠️"
                      : f.dark
                      ? "Dark ⚠️"
                      : "Good ✓"}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Process Button */}
          <button
            type="button"
            onClick={handleProcessScan}
            disabled={!allCaptured || scanning}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              allCaptured && !scanning
                ? "bg-gradient-to-r from-neon-green to-emerald-500 text-black hover:opacity-90 cursor-pointer shadow-lg shadow-neon-green/20 active:scale-98"
                : "bg-dark-surface text-gray-500 border border-dark-border cursor-not-allowed"
            }`}
          >
            <span>{scanning ? "⏳" : "🔍"}</span>
            <span>{scanning ? "Analyzing Faces with OpenCV..." : "Analyze & Extract Facelets"}</span>
          </button>
        </div>
      </div>

      {/* ── 6-Face Thumbnail Strip (Natural Sequence F → R → B → L → U → D) ── */}
      <div className="border-t border-dark-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-400">
            6-Face Capture Progress (Click any to retake):
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {capturedCount === 6 ? "✓ All 6 ready" : `${6 - capturedCount} remaining`}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {SCAN_STEPS.map((step, idx) => {
            const cap = capturedImages[step.key];
            const isSelected = currentStepIndex === idx;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`relative aspect-square rounded-xl border overflow-hidden p-0 transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? "border-neon-blue ring-2 ring-neon-blue/40 shadow-md shadow-neon-blue/20"
                    : cap
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-dark-border bg-dark-surface/60 hover:border-gray-500"
                }`}
              >
                {cap?.previewUrl ? (
                  <>
                    <img
                      src={cap.previewUrl}
                      alt={step.key}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center shadow">
                      ✓
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-1 text-center">
                    <span
                      className="w-3 h-3 rounded-full mb-1 border border-black/30"
                      style={{ background: step.color }}
                    />
                    <span className="text-[10px] font-bold text-gray-300">
                      {step.key}
                    </span>
                  </div>
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs text-[9px] font-semibold text-center text-gray-300 py-0.5 truncate px-0.5">
                  {idx + 1}. {step.center}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
