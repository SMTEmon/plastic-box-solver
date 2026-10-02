import { NavLink, useNavigate } from "react-router-dom";
import { useBackendStatus } from "../lib/useBackendStatus.js";
import { useAuthStore } from "../store/authStore.js";

function NavItem({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm my-1.5 transition-colors border ${
          isActive
            ? "bg-dark-surface text-white border-neon-blue"
            : "text-gray-300 border-transparent hover:bg-gray-800 hover:text-white"
        }`
      }
    >
      {icon}
      <span>{children}</span>
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
      <span className={`w-2 h-2 rounded-full ${dot} ${status === 'online' ? 'animate-pulse' : ''}`} />
      <span className={text}>{label}</span>
    </div>
  );
}

export default function AppShell({ title = "Plastic_box_solver", children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-dark-bg text-white overflow-hidden">
      <aside className="w-[230px] p-4 border-r border-dark-border bg-dark-surface flex flex-col relative shrink-0">
        <div className="font-bold text-sm mb-0.5 text-neon-blue">{title}</div>
        <div className="text-xs text-gray-400 mb-3">Precision cube tool</div>

        <BackendBadge />

        <nav className="flex-1">
          <NavItem 
            to="/dashboard"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>}
          >
            Dashboard
          </NavItem>
          <NavItem 
            to="/cube-input"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
          >
            Cube Input
          </NavItem>
          <NavItem 
            to="/solve"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
          >
            Solve Workspace
          </NavItem>
          <NavItem 
            to="/leaderboard"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>}
          >
            Leaderboard
          </NavItem>
        </nav>

        <div className="mt-auto pt-4 space-y-3 border-t border-dark-border">
          {user ? (
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-gray-300 truncate pr-2">
                {user.display_name}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full px-3 py-2 rounded-lg border border-neon-blue text-neon-blue bg-dark-bg hover:bg-neon-blue hover:text-white transition-colors text-sm"
            >
              Login / Register
            </button>
          )}

          <button
            className="w-full px-3 py-2.5 rounded-lg border border-dark-border bg-dark-bg text-white cursor-pointer transition-all hover:border-neon-green hover:text-neon-green hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate("/cube-input")}
          >
            + New Solve
          </button>
          <div className="text-center text-[10px] text-gray-500 mt-1">v1.0.0</div>
        </div>
      </aside>

      <main className="flex-1 p-4 overflow-y-auto">{children}</main>
    </div>
  );
}
