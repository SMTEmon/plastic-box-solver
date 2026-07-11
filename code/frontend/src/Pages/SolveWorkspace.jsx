import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";

export default function SolveWorkspace() {
  return (
    <AppShell>
      <h2 style={{ margin: 0, fontSize: 18, marginBottom: 12 }}>
        Solve Workspace
      </h2>

      <div
        style={{
          height: 520,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "#0a0a12",
        }}
      >
        <CubeScene interactive={true} />
      </div>

      <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Keyboard (for now): U/D/L/R/F/B turns. Hold Shift for reverse.
      </p>
    </AppShell>
  );
}