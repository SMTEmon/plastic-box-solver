/**
 * CameraScan — Multi-step camera capture interface for physical Rubik's Cube (FR-04, FR-06a).
 *
 * Captures 6 face images in canonical URFDLB order:
 *   1. U (Up / White center)
 *   2. R (Right / Red center)
 *   3. F (Front / Green center)
 *   4. D (Down / Yellow center)
 *   5. L (Left / Orange center)
 *   6. B (Back / Blue center)
 *
 * Features:
 *   - Video stream with 3x3 alignment guide overlay
 *   - Step-by-step guidance showing orientation and center color target
 *   - Image capture via HTML5 Canvas
 *   - Thumbnail gallery with individual retake capability
 *   - Sends 6 images to POST /api/cube/scan via cubeApi.scan()
 *   - Displays blurry / dark quality warnings per face
 *   - Passes detected facelets directly to the parent NetEditor for correction (FR-06c)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { cubeApi, ApiError } from "../lib/api.js";

const FACE_STEPS = [
  { key: "U", name: "Up (U)", center: "White", color: "#ffffff", hint: "Keep Green on Front, Yellow on Bottom" },
  { key: "R", name: "Right (R)", center: "Red", color: "#ff4d4d", hint: "Keep White on Top, Green on Left" },
  { key: "F", name: "Front (F)", center: "Green", color: "#2ecc71", hint: "Keep White on Top, Red on Right" },
  { key: "D", name: "Down (D)", center: "Yellow", color: "#ffd400", hint: "Keep Green on Top, Blue on Bottom" },
  { key: "L", name: "Left (L)", center: "Orange", color: "#ff8c00", hint: "Keep White on Top, Green on Right" },
  { key: "B", name: "Back (B)", center: "Blue", color: "#2d4cff", hint: "Keep White on Top, Orange on Right" },
];

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

  const currentFace = FACE_STEPS[currentStepIndex];

  // Start webcam
  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser or use Manual Net."
          : `Unable to access camera: ${err.message}`
      );
      setCameraActive(false);
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

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

        setCapturedImages((prev) => ({
          ...prev,
          [currentFace.key]: { file, previewUrl },
        }));

        // Advance to next uncaptured face or stay
        const nextIdx = FACE_STEPS.findIndex(
          (step, idx) => idx > currentStepIndex && !capturedImages[step.key]
        );
        if (nextIdx !== -1) {
          setCurrentStepIndex(nextIdx);
        } else {
          // Check if any prior face is missing
          const anyMissing = FACE_STEPS.findIndex(
            (step) => step.key !== currentFace.key && !capturedImages[step.key]
          );
          if (anyMissing !== -1) {
            setCurrentStepIndex(anyMissing);
          }
        }
      },
      "image/jpeg",
      0.92
    );
  };

  // Submit all 6 captured images to the backend
  const handleProcessScan = async () => {
    const missing = FACE_STEPS.filter((f) => !capturedImages[f.key]);
    if (missing.length > 0) {
      setApiError(`Please capture all 6 faces first. Missing: ${missing.map((m) => m.name).join(", ")}`);
      return;
    }

    setScanning(true);
    setApiError("");
    setScanResult(null);

    try {
      const files = FACE_STEPS.map((f) => capturedImages[f.key].file);
      const res = await cubeApi.scan(files);
      setScanResult(res);

      // Successfully processed: provide the facelets and quality info to parent
      if (res.facelets) {
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
    <div className="bg-dark-bg border border-dark-border rounded-xl p-4 flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
            Camera Scan (FR-04, FR-06a)
          </h3>
          <p className="text-xs text-gray-400">
            Align each cube face inside the 3×3 square guide.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neon-blue bg-neon-blue/10 px-2.5 py-1 rounded-md border border-neon-blue/30">
            {capturedCount}/6 Faces
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5 border border-dark-border"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* ── Error messages ── */}
      {cameraError && (
        <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 p-3 rounded-lg flex items-center justify-between">
          <span>{cameraError}</span>
          <button
            type="button"
            onClick={startCamera}
            className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded text-[11px]"
          >
            Retry Camera
          </button>
        </div>
      )}

      {apiError && (
        <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 p-3 rounded-lg">
          {apiError}
        </div>
      )}

      {/* ── Active Viewport & Alignment Guide ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="relative aspect-square max-w-[340px] mx-auto w-full bg-black rounded-xl overflow-hidden border border-dark-border flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* 3x3 Reticle Overlay */}
          <div className="absolute inset-8 pointer-events-none border-2 border-neon-blue/80 rounded-lg shadow-[0_0_20px_rgba(0,243,255,0.2)] grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="border border-neon-blue/40 flex items-center justify-center"
              >
                {i === 4 && (
                  <div
                    className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                    style={{ background: currentFace.color }}
                    title={`Target center: ${currentFace.center}`}
                  />
                )}
              </div>
            ))}
          </div>

          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 bg-dark-bg/90 flex flex-col items-center justify-center text-xs text-gray-400">
              <span>Initializing camera...</span>
            </div>
          )}
        </div>

        {/* ── Step Controls & Guidance ── */}
        <div className="flex flex-col gap-3">
          <div className="bg-dark-surface p-3.5 rounded-xl border border-dark-border">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Current Target Face ({currentStepIndex + 1} of 6)
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-4 h-4 rounded-md border border-white/20 inline-block"
                style={{ background: currentFace.color }}
              />
              <span className="text-base font-bold text-white">
                {currentFace.name}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                ({currentFace.center} Center)
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {currentFace.hint}
            </p>
          </div>

          {/* Capture action button */}
          <button
            type="button"
            onClick={captureFrame}
            disabled={!cameraActive}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-neon-blue text-dark-bg hover:opacity-90 cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📸 Capture {currentFace.name} Face
          </button>

          {/* Quality flags feedback if returned */}
          {scanResult?.faces && (
            <div className="bg-dark-surface p-3 rounded-lg border border-dark-border text-xs">
              <div className="font-semibold text-gray-300 mb-1.5">
                Image Quality Feedback:
              </div>
              <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
                {scanResult.faces.map((f) => (
                  <div
                    key={f.face}
                    className={`p-1.5 rounded border ${
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
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
              allCaptured && !scanning
                ? "bg-neon-green text-dark-bg hover:opacity-90 cursor-pointer shadow-[0_0_20px_rgba(57,255,20,0.3)]"
                : "bg-gray-800 text-gray-500 border border-dark-border cursor-not-allowed"
            }`}
          >
            {scanning ? "Processing Images with OpenCV..." : "🔍 Analyze & Extract Facelets"}
          </button>
        </div>
      </div>

      {/* ── 6-Face Thumbnail Strip (Click to select/retake) ── */}
      <div className="border-t border-dark-border pt-3">
        <div className="text-[11px] font-semibold text-gray-400 mb-2">
          Captured Faces (Click to switch or retake):
        </div>
        <div className="grid grid-cols-6 gap-2">
          {FACE_STEPS.map((step, idx) => {
            const cap = capturedImages[step.key];
            const isSelected = currentStepIndex === idx;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`relative aspect-square rounded-lg border overflow-hidden p-0 transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? "border-neon-blue ring-2 ring-neon-blue/30"
                    : cap
                    ? "border-neon-green/60"
                    : "border-dark-border bg-dark-surface/60"
                }`}
              >
                {cap?.previewUrl ? (
                  <img
                    src={cap.previewUrl}
                    alt={step.key}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-1 text-center">
                    <span
                      className="w-2.5 h-2.5 rounded-full mb-1"
                      style={{ background: step.color }}
                    />
                    <span className="text-[10px] font-mono text-gray-400">
                      {step.key}
                    </span>
                  </div>
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-mono text-center text-white py-0.5">
                  {step.key}
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
