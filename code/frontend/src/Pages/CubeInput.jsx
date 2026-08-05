import { useState } from "react";
import AppShell from "../Layout/AppShell";
import { Link, useNavigate } from "react-router-dom";
import { parseCubeString } from "../lib/cubeInput.js";
import CubeScene from "../Three/CubeScene";

function Card({ title, children }) {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

export default function CubeInput() {
  const navigate = useNavigate();
  const [inputStr, setInputStr] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [validFaces, setValidFaces] = useState(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputStr(val);
    if (!val.trim()) {
      setErrorMsg("");
      setValidFaces(null);
      return;
    }
    try {
      const parsed = parseCubeString(val);
      setValidFaces(parsed);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message);
      setValidFaces(null);
    }
  };

  const handleSolveClick = () => {
    if (validFaces) {
      navigate("/solve", { state: { initialFaces: validFaces } });
    }
  };

  return (
    <AppShell>
      <div className="flex gap-4 h-[calc(100vh-2rem)]">
        {/* Center area */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Cube Input</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg border border-dark-border bg-dark-surface text-gray-300 text-xs font-medium cursor-pointer hover:text-white transition-colors">
                Camera
              </button>
              <button className="px-3 py-1.5 rounded-lg border border-neon-blue bg-neon-blue/10 text-neon-blue text-xs font-medium cursor-pointer">
                Manual
              </button>
            </div>
          </div>

          <Card title="Input workspace">
            <textarea
              className="w-full h-[420px] rounded-xl p-4 bg-dark-bg text-white border border-dark-border font-mono text-sm resize-none focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-colors placeholder:text-gray-600"
              value={inputStr}
              onChange={handleInputChange}
              placeholder="Paste 54-char string here..."
            />

            <div className="flex items-center justify-between mt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Select color</span>
                {["#ffffff", "#ffd400", "#ff4d4d", "#ff8c00", "#2d4cff", "#2ecc71"].map((c) => (
                  <div
                    key={c}
                    className="w-4 h-4 rounded border border-white/10"
                    style={{ background: c }}
                  />
                ))}
              </div>

              <span className="text-gray-500">
                Tip: tap faces to apply colors (later)
              </span>
            </div>
          </Card>
        </div>

        {/* Right panel */}
        <div className="w-80 flex flex-col gap-4">
          <Card title="Status">
            <div
              className={`text-xs font-medium mb-3 ${
                errorMsg
                  ? "text-red-400"
                  : validFaces
                  ? "text-neon-green"
                  : "text-gray-400"
              }`}
            >
              {errorMsg ? errorMsg : validFaces ? "✓ Valid State!" : "Waiting for input..."}
            </div>

            <button
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                validFaces
                  ? "bg-neon-blue text-dark-bg hover:opacity-90"
                  : "bg-gray-800 text-gray-500 border border-dark-border cursor-not-allowed"
              }`}
              onClick={handleSolveClick}
              disabled={!validFaces}
            >
              Solve Cube
            </button>

            <div className="mt-3 text-center">
              <Link
                to="/solve"
                className="text-xs text-neon-blue hover:underline transition-colors"
              >
                Go to Solve Workspace →
              </Link>
            </div>
          </Card>

          <Card title="Algorithm">
            <div className="text-xs text-gray-300 font-medium">Kociemba 2-phase</div>
          </Card>

          <Card title="Preview">
            <div className="h-48 rounded-xl overflow-hidden bg-black border border-dark-border flex items-center justify-center">
              {validFaces ? (
                <CubeScene initialFaces={validFaces} />
              ) : (
                <span className="text-xs text-gray-600">Invalid / Empty state</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}