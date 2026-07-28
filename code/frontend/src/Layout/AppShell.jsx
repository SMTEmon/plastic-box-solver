import { NavLink } from "react-router-dom";

const linkBase = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: "#cfcfe6",
  fontSize: 13,
  margin: "6px 0",
};

const linkActive = {
  background: "#2b2a38",
  color: "#ffffff",
};

export default function AppShell({ title = "Plastic_box_solver", children }) {
  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b0b10" }}>
      <aside
        style={{
          width: 230,
          padding: 14,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "#0f0f16",
          color: "#fff",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 16 }}>
          Precision cube tool
        </div>

        <nav>
          <NavLink
            to="/dashboard"
            style={({ isActive }) => ({
              ...linkBase,
              ...(isActive ? linkActive : null),
            })}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/cube-input"
            style={({ isActive }) => ({
              ...linkBase,
              ...(isActive ? linkActive : null),
            })}
          >
            Cube Input
          </NavLink>

          <NavLink
            to="/solve"
            style={({ isActive }) => ({
              ...linkBase,
              ...(isActive ? linkActive : null),
            })}
          >
            Solve Workspace
          </NavLink>

          <NavLink
            to="/leaderboard"
            style={({ isActive }) => ({
              ...linkBase,
              ...(isActive ? linkActive : null),
            })}
          >
            Leaderboard
          </NavLink>
        </nav>

        <div style={{ position: "absolute", bottom: 14, left: 14, right: 14 }}>
          <button
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#171726",
              color: "#fff",
              cursor: "pointer",
            }}
            onClick={() => alert("Later: create new solve")}
          >
            + New Solve
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            <div style={{ padding: "6px 4px" }}>Help</div>
            <div style={{ padding: "6px 4px" }}>Logout</div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 16, color: "#fff" }}>{children}</main>
    </div>
  );
}