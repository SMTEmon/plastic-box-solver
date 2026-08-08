import { NavLink, useNavigate } from "react-router-dom";
import { useBackendStatus } from "../lib/useBackendStatus.js";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2.5 rounded-lg text-sm my-1.5 transition-colors border ${
          isActive
            ? "bg-dark-surface text-white border-neon-blue"
            : "text-gray-300 border-transparent hover:bg-gray-800 hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

/** Live indicator that the frontend can actually reach the FastAPI backend. */
function BackendBadge() {
  const status = useBackendStatus();
  const map = {
    checking: ["bg-gray-500", "text-gray-400", "Checking API..."],
    online: ["bg-neon-green", "text-neon-green", "API connected"],
    offline: ["bg-red-500", "text-red-400", "API offline"],
  };
  const [dot, text, label] = map[status];

  return (
    <div
      className="flex items-center gap-2 text-xs mb-4"
      title={
        status === "offline"
          ? "Start the backend: cd code/backend && uvicorn app.main:app --port 8000"
          : "http://localhost:8000"
      }
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className={text}>{label}</span>
    </div>
  );
}

export default function AppShell({ title = "Plastic_box_solver", children }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-dark-bg text-white overflow-hidden">
      <aside className="w-[230px] p-4 border-r border-dark-border bg-dark-surface flex flex-col relative shrink-0">
        <div className="font-bold text-sm mb-0.5 text-neon-blue">{title}</div>
        <div className="text-xs text-gray-400 mb-3">Precision cube tool</div>

        <BackendBadge />

        <nav className="flex-1">
          <NavItem to="/dashboard">Dashboard</NavItem>
          <NavItem to="/cube-input">Cube Input</NavItem>
          <NavItem to="/scan">Camera Scan</NavItem>
          <NavItem to="/solve">Solve Workspace</NavItem>
          <NavItem to="/leaderboard">Leaderboard</NavItem>
        </nav>

        <div className="mt-auto pt-4">
          <button
            className="w-full px-3 py-2.5 rounded-lg border border-dark-border bg-dark-bg text-white cursor-pointer transition-colors hover:border-neon-green hover:text-neon-green"
            onClick={() => navigate("/cube-input")}
          >
            + New Solve
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 overflow-y-auto">{children}</main>
    </div>
  );
}
