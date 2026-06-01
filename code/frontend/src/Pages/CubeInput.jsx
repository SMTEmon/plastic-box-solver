import AppShell from "../Layout/AppShell";
import { Link } from "react-router-dom";

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
            <div
              style={{
                height: 420,
                borderRadius: 12,
                border: "1px dashed rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.65)",
                fontSize: 13,
              }}
            >
              (Later: 2D net / photo input)
            </div>

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
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
              invalid state
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
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              (Later: 3D cube preview or 2D preview)
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