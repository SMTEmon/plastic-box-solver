import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import { Panel, PageHeader, Button, Note } from "../Components/ui.jsx";
import CubeNetEditor from "../Components/CubeNetEditor";
import { cubeApi } from "../lib/api.js";
import { FACE_ORDER } from "../cube/facelets.js";
import { COLOUR_HEX, COLOUR_NAMES } from "../cube/notation.js";
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

/**
 * How far the guide frame sits in from the edge of the square preview.
 * The capture crops to exactly this box, so the 3x3 grid the detector splits
 * is the same 3x3 grid the user lined the cube up against.
 */
const GUIDE_INSET = 0.1;

const FACES = [
  { key: "U", name: "Up (top)", hint: "Hold the cube so this face points at the camera. Keep the same up-direction for every shot." },
  { key: "R", name: "Right", hint: "Turn the cube left by 90° from Front, so the right side faces you." },
  { key: "F", name: "Front", hint: "The face towards you in your normal grip." },
  { key: "D", name: "Down (bottom)", hint: "Tip the cube forward so the bottom faces the camera." },
  { key: "L", name: "Left", hint: "Turn the cube right by 90° from Front." },
  { key: "B", name: "Back", hint: "Turn the cube 180° from Front." },
];

export default function CameraScan() {
  const navigate = useNavigate();
  const loadScramble = useCubeStore((s) => s.loadScramble);

  const [files, setFiles] = useState({}); // { U: File, R: File, ... }
  const [previews, setPreviews] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState(null);   // facelets after manual fixes
  const [editValid, setEditValid] = useState(null);

  // --- webcam -------------------------------------------------------------
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [camSlot, setCamSlot] = useState(0);
  const [camReady, setCamReady] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const camOn = Boolean(stream);

  /**
   * Attach the stream AFTER the <video> element exists.
   *
   * This is what made the preview render solid black: the element lives
   * inside `{camOn && ...}`, so at the moment getUserMedia resolved,
   * videoRef.current was still null and `srcObject` was assigned to nothing.
   * Setting the stream in state renders the element first; this effect then
   * attaches it. play() is called explicitly because autoPlay does not always
   * fire when srcObject is set after mount.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    const onReady = () => setCamReady(v.videoWidth > 0);
    v.addEventListener("loadedmetadata", onReady);
    if (v.readyState >= 1) onReady(); // metadata already there, no event coming
    v.play().catch(() => {});
    return () => v.removeEventListener("loadedmetadata", onReady);
  }, [stream]);

  // Stop the camera when leaving the page -- otherwise the webcam LED stays on.
  useEffect(
    () => () => stream?.getTracks().forEach((t) => t.stop()),
    [stream],
  );

  /**
   * Re-check with the solver on every edit. Local colour counts are not
   * enough: only the solver can catch a PARITY violation, a cube with nine of
   * every colour that still cannot physically exist.
   */
  useEffect(() => {
    if (!edited) return;
    let cancelled = false;
    const t = setTimeout(() => {
      cubeApi
        .validate(edited)
        .then((r) => !cancelled && setEditValid(r))
        .catch(() => {});
    }, 250);   // debounce: painting is fast, the solver is not
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [edited]);

  const setFace = (key, file) => {
    setFiles((f) => ({ ...f, [key]: file }));
    setPreviews((p) => {
      if (p[key]) URL.revokeObjectURL(p[key]);
      return { ...p, [key]: URL.createObjectURL(file) };
    });
    setResult(null);
    setError("");
  };

  const startCamera = async (preferredId = deviceId) => {
    setError("");
    setCamReady(false);

    // getUserMedia only exists in a secure context: HTTPS, or localhost.
    // Opening the dev server via a LAN IP (192.168.x.x:5173) silently has no
    // navigator.mediaDevices at all, which is a confusing way to fail.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        `Camera access needs a secure context. You are on "${window.location.origin}" — ` +
          "open the app at http://localhost:5173 instead, or use HTTPS. " +
          "Uploading six photos below works either way.",
      );
      return;
    }

    stream?.getTracks().forEach((t) => t.stop());

    try {
      // Constraints are all "ideal", never "exact": a laptop webcam that
      // cannot do 1280x720, or has no rear camera, should still open rather
      // than throwing OverconstrainedError.
      const s = await navigator.mediaDevices.getUserMedia({
        video: preferredId
          ? { deviceId: { ideal: preferredId } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      });
      setStream(s);

      // Labels are only populated after permission is granted, so enumerate
      // now rather than on mount.
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === "videoinput");
      setDevices(cams);
      if (!preferredId && cams[0]) setDeviceId(cams[0].deviceId);
    } catch (err) {
      const messages = {
        NotAllowedError:
          "Camera permission was blocked. Allow it in the padlock menu in the address bar, then try again.",
        NotFoundError: "No camera was found on this device.",
        NotReadableError:
          "The camera is already in use by another app (Zoom, Meet, another browser tab). Close it and try again.",
        OverconstrainedError:
          "This camera does not support the requested resolution. Try a different camera below.",
      };
      setError(
        (messages[err.name] ?? `Could not open the camera (${err.name}).`) +
          " You can still upload six photos below.",
      );
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCamReady(false);
  };

  const switchCamera = (id) => {
    setDeviceId(id);
    startCamera(id);
  };

  /**
   * Capture exactly the region inside the on-screen guide box.
   *
   * This was a real source of wrong readings: the guide frame is drawn inset
   * from the edge of the preview, so the user lines the cube up inside it --
   * but the capture took the whole centre square and the detector then split
   * THAT into thirds. The grid the detector used and the grid the user aimed
   * at were different rectangles, so every cell sampled slightly off-centre
   * and edge cells picked up background.
   *
   * GUIDE_INSET must stay equal to the inset used to draw the overlay.
   */
  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) {
      setError("The camera has not produced a frame yet — give it a second.");
      return;
    }

    const side = Math.min(v.videoWidth, v.videoHeight);
    const sx = (v.videoWidth - side) / 2;
    const sy = (v.videoHeight - side) / 2;

    const inset = side * GUIDE_INSET;
    const box = side - inset * 2;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.round(box);
    canvas
      .getContext("2d")
      .drawImage(v, sx + inset, sy + inset, box, box, 0, 0, box, box);

    canvas.toBlob(
      (blob) => {
        const key = FACES[camSlot].key;
        setFace(key, new File([blob], `${key}.jpg`, { type: "image/jpeg" }));
        setCamSlot((s) => Math.min(s + 1, FACES.length - 1));
      },
      "image/jpeg",
      0.95,
    );
  };

  const allSix = FACES.every((f) => files[f.key]);

  const runScan = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      // Order matters: the backend reads them as URFDLB.
      const ordered = FACES.map((f) => files[f.key]);
      const r = await cubeApi.scan(ordered);
      setResult(r);
      setEdited(r.facelets);
      setEditValid(r.valid ? { valid: true } : { valid: false, detail: r.detail });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const useThisCube = async () => {
    const fl = edited ?? result?.facelets;
    if (!fl) return;
    setBusy(true);
    try {
      const optimal = await cubeApi.solve(fl, "optimal");
      loadScramble(fl, optimal.optimalMoveCount);
      navigate("/solve");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const centres = edited
    ? Object.fromEntries(FACE_ORDER.split("").map((f, i) => [f, edited[i * 9 + 4]]))
    : {};
  const flagged = new Set(
    (result?.faces ?? []).filter((f) => f.blurry || f.dark).map((f) => f.face),
  );

  return (
    <AppShell>
      <PageHeader
        title="Camera Scan"
        subtitle="Six photos, in order, each face filling the guide box"
      >
        {!camOn ? (
          <Button variant="primary" onClick={() => startCamera()}>
            Use webcam
          </Button>
        ) : (
          <Button onClick={stopCamera}>Stop camera</Button>
        )}
        <Button onClick={() => navigate("/cube-input")}>Manual input</Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] items-start">
        <div className="min-w-0 space-y-4">

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
                {/* 3x3 guide frame. The capture crops to exactly this box
                    (GUIDE_INSET), so what the detector splits into thirds is
                    what the user aligned the cube against. Fill it, keep the
                    cube square-on, and put one sticker in each square. */}
                <div className="absolute inset-[10%] grid grid-cols-3 grid-rows-3 pointer-events-none ring-2 ring-neon-blue/80 rounded-sm">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="border border-neon-blue/40" />
                  ))}
                </div>
                {!camReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-gray-400">
                    Waiting for the first frame...
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {FACES[camSlot].hint}
              </p>

              {devices.length > 1 && (
                <select
                  value={deviceId}
                  onChange={(e) => switchCamera(e.target.value)}
                  className="w-full mt-3 bg-dark-bg border border-dark-border rounded-lg px-2 py-2 text-xs text-gray-300"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

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
                  disabled={!camReady}
                  className="flex-1 py-2 rounded-lg bg-neon-blue text-dark-bg text-xs font-bold cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
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
                        ? "border-accent-amber/60 bg-accent-amber/5"
                        : "border-neon-green/50 bg-neon-green/5"
                      : "border-dark-border bg-dark-bg hover:border-neon-blue"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    {/* Before a scan we can only name the position. After one,
                        lead with the CENTRE COLOUR: "the red side" is something
                        you can check against the cube in your hand, "face 2 of
                        6" is not. */}
                    {centres[f.key] ? (
                      <>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded border border-white/25 shrink-0"
                            style={{ background: COLOUR_HEX[centres[f.key]] }}
                          />
                          <span className="text-xs font-bold text-white capitalize truncate">
                            {COLOUR_NAMES[centres[f.key]]} side
                          </span>
                        </span>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {i + 1}. {f.key}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-white">
                          {i + 1}. {f.name}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          {f.key}
                        </span>
                      </>
                    )}
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

          {edited && (
            <Panel
              title="Check and fix the scan"
              tone={editValid?.valid ? "green" : "amber"}
            >
              <CubeNetEditor
                facelets={edited}
                onChange={setEdited}
                flaggedFaces={flagged}
              />
            </Panel>
          )}
        </div>

        {/* --- sidebar --- */}
        <div className="space-y-4">
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
            <Note tone="error">{error}</Note>
          )}

          {result && (
            <>
              <Panel
                title="Result"
                tone={editValid?.valid ? "green" : "amber"}
                action={
                  edited !== result.facelets && (
                    <button
                      onClick={() => setEdited(result.facelets)}
                      className="text-[11px] text-gray-500 hover:text-white cursor-pointer"
                    >
                      undo edits
                    </button>
                  )
                }
              >
                <div
                  className={`text-sm font-bold ${
                    editValid?.valid ? "text-neon-green" : "text-accent-amber"
                  }`}
                >
                  {editValid === null
                    ? "Checking..."
                    : editValid.valid
                      ? "Legal, solvable cube"
                      : "Not a legal cube yet"}
                </div>
                {!editValid?.valid && editValid?.detail && (
                  <p className="text-xs text-gray-400 mt-1">{editValid.detail}</p>
                )}
                {!editValid?.valid && (
                  <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                    Fix it in the editor below — click any wrong sticker and
                    repaint it. You do not need to re-shoot the photos.
                  </p>
                )}

                <Button
                  variant="primary"
                  size="md"
                  className="w-full mt-3"
                  onClick={useThisCube}
                  disabled={!editValid?.valid || busy}
                >
                  Solve this cube
                </Button>
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
                            ? "border-accent-amber/40 bg-accent-amber/5 text-accent-amber"
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
