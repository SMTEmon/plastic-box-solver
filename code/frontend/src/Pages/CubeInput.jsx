import { useState } from "react";
import AppShell from "../Layout/AppShell";
import { Link } from "react-router-dom";
import { parseCubeString } from "../lib/cubeInput.js";
import CubeScene from "../Three/CubeScene";

function Card({ title, children }) {
  return (
    <div
      style={{
        background: "#121221",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function CubeInput() {
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

  return (
    <AppShell>
      <div style={{ display: "flex", gap: 12, height: "calc(100vh - 32px)" }}>
        {/* Center area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Cube Input</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={topButtonStyle}>Camera</button>
              <button style={{ ...topButtonStyle, background: "#2d4cff" }}>Manual</button>
            </div>
          </div>

          <Card title="Input workspace">
            <textarea
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 420,
                borderRadius: 12,
                padding: 16,
                background: "#0a0a12",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                fontFamily: "monospace",
                resize: "none"
              }}
              value={inputStr}
              onChange={handleInputChange}
              placeholder="Paste 54-char string here..."
            />

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Select color</div>
                {["#ffffff", "#ffd400", "#ff4d4d", "#ff8c00", "#2d4cff", "#2ecc71"].map((c) => (
                  <div key={c} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
                ))}
              </div>

              <div style={{ fontSize: 11, opacity: 0.6 }}>
                Tip: tap faces to apply colors (later)
              </div>
            </div>
          </Card>
        </div>

        {/* Right panel */}
        <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title="Status">
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8, color: errorMsg ? "#ff4d4d" : validFaces ? "#2ecc71" : "#fff" }}>
              {errorMsg ? errorMsg : validFaces ? "Valid State!" : "Waiting for input..."}
            </div>
            <button
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#aab7ff",
                color: "#101020",
                cursor: "pointer",
                fontWeight: 700,
              }}
              onClick={() => alert("Later: call backend / solve")}
            >
              Solve Cube
            </button>

            <div style={{ marginTop: 10 }}>
              <Link to="/solve" style={{ color: "#aab7ff", fontSize: 12 }}>
                Go to Solve Workspace →
              </Link>
            </div>
          </Card>

          <Card title="Algorithm">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Kociemba 2-phase</div>
          </Card>

          <Card title="Preview">
            <div style={{ height: 200, borderRadius: 8, overflow: "hidden", background: "#000" }}>
              {validFaces ? <CubeScene initialFaces={validFaces} /> : <div style={{padding: 10, fontSize: 12, opacity: 0.7}}>Invalid/Empty state</div>}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

const topButtonStyle = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#171726",
  color: "#fff",
  cursor: "pointer",
};