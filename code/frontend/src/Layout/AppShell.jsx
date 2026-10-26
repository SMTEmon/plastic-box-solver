import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useBackendStatus } from "../lib/useBackendStatus.js";
import { useAuthStore } from "../store/authStore.js";

function NavItem({ to, icon, onClick, children }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium my-1 transition-all border ${
          isActive
            ? "bg-neon-blue/10 text-white border-neon-blue/30 shadow-sm"
            : "text-gray-400 border-transparent hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <span className="opacity-80">{icon}</span>
      <span>{children}</span>
    </NavLink>
  );
}

/** Live indicator that the frontend can actually reach the FastAPI backend. */
function BackendBadge({ compact = false }) {
  const status = useBackendStatus();
  const map = {
    checking: ["bg-gray-400", "text-gray-400", "Checking API..."],
    online: ["bg-emerald-400", "text-emerald-400", "API connected"],
    offline: ["bg-rose-400", "text-rose-400", "API offline"],
  };
  const [dot, text, label] = map[status];

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[11px]"
        title={label}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'online' ? 'animate-pulse' : ''}`} />
        <span className={`font-medium text-[10px] ${text}`}>{status}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] mb-3"
      title={
        status === "offline"
          ? "Start the backend: cd code/backend && uvicorn app.main:app --port 8000"
          : "Backend running on port 8000"
      }
    >
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'online' ? 'animate-pulse' : ''}`} />
        <span className={`font-medium ${text}`}>{label}</span>
      </div>
      <span className="text-[10px] font-mono text-gray-500">8000</span>
    </div>
  );
}

export default function AppShell({ title = "Plastic Box Solver", children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-dark-bg text-gray-100 overflow-hidden font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-3 py-2.5 border-b border-dark-border bg-dark-surface/95 backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-neon-blue to-blue-600 flex items-center justify-center font-bold text-black text-xs shadow-md shadow-neon-blue/20">
            ⬡
          </div>
          <span className="font-bold text-xs tracking-tight text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <BackendBadge compact />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="p-1.5 rounded-lg border border-dark-border bg-dark-bg text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden flex flex-col p-3 border-b border-dark-border bg-dark-surface/95 backdrop-blur-md shrink-0 z-20 space-y-1 shadow-xl max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-morph-in">
          <nav className="space-y-0.5">
            <NavItem
              to="/dashboard"
              onClick={closeMenu}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>}
            >
              Dashboard
            </NavItem>
            <NavItem
              to="/cube-input"
              onClick={closeMenu}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
            >
              Cube Input
            </NavItem>
            <NavItem
              to="/solve"
              onClick={closeMenu}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
            >
              Solve Workspace
            </NavItem>
            <NavItem
              to="/tutorial"
              onClick={closeMenu}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>}
            >
              Tutorials
            </NavItem>
            <NavItem
              to="/leaderboard"
              onClick={closeMenu}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>}
            >
              Leaderboard
            </NavItem>
          </nav>

          <div className="pt-2 border-t border-dark-border space-y-2">
            {user ? (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-neon-blue/20 text-neon-blue text-[10px] font-bold flex items-center justify-center shrink-0 border border-neon-blue/30">
                    {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="text-xs font-medium text-gray-300 truncate">
                    {user.display_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[11px] text-gray-500 hover:text-rose-400 transition-colors ml-1 shrink-0"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/login");
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-neon-blue/40 text-neon-blue bg-neon-blue/10 hover:bg-neon-blue hover:text-black transition-all text-xs font-semibold cursor-pointer"
              >
                Login / Register
              </button>
            )}

            <button
              type="button"
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-neon-blue/20 transition-all cursor-pointer active:scale-95"
              onClick={() => {
                closeMenu();
                navigate("/cube-input");
              }}
            >
              <span>+</span>
              <span>New Solve</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 p-3.5 border-r border-dark-border bg-dark-surface/90 backdrop-blur-md flex-col relative shrink-0">
        <div className="flex items-center gap-2.5 px-1 mb-1 mt-0.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-neon-blue to-blue-600 flex items-center justify-center font-bold text-black text-xs shadow-md shadow-neon-blue/20">
            ⬡
          </div>
          <div>
            <div className="font-bold text-xs tracking-tight text-white">{title}</div>
            <div className="text-[10px] text-gray-400 tracking-wide">Precision cube tool</div>
          </div>
        </div>

        <div className="my-2.5">
          <BackendBadge />
        </div>

        <nav className="flex-1 space-y-0.5">
          <NavItem 
            to="/dashboard"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>}
          >
            Dashboard
          </NavItem>
          <NavItem 
            to="/cube-input"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
          >
            Cube Input
          </NavItem>
          <NavItem 
            to="/solve"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
          >
            Solve Workspace
          </NavItem>
          <NavItem 
            to="/tutorial"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>}
          >
            Tutorials
          </NavItem>
          <NavItem 
            to="/leaderboard"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>}
          >
            Leaderboard
          </NavItem>
        </nav>

        <div className="mt-auto pt-3 space-y-2.5 border-t border-dark-border">
          {user ? (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-neon-blue/20 text-neon-blue text-[10px] font-bold flex items-center justify-center shrink-0 border border-neon-blue/30">
                  {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="text-xs font-medium text-gray-300 truncate">
                  {user.display_name}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] text-gray-500 hover:text-rose-400 transition-colors ml-1 shrink-0 cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full px-3 py-1.5 rounded-xl border border-neon-blue/40 text-neon-blue bg-neon-blue/10 hover:bg-neon-blue hover:text-black transition-all text-xs font-semibold cursor-pointer"
            >
              Login / Register
            </button>
          )}

          <button
            type="button"
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-neon-blue/20 transition-all cursor-pointer active:scale-95"
            onClick={() => navigate("/cube-input")}
          >
            <span>+</span>
            <span>New Solve</span>
          </button>
          <div className="text-center text-[10px] text-gray-600">v1.0.0</div>
        </div>
      </aside>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto min-w-0">{children}</main>
    </div>
  );
}
