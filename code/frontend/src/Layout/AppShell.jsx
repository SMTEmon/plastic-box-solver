import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useBackendStatus } from "../lib/useBackendStatus.js";
import { useAuthStore } from "../store/authStore.js";

export function CubeLogo({ size = 34, className = "" }) {
  return (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-xl bg-dark-bg/80 border border-white/10 shadow-lg shadow-neon-blue/15 p-1 transition-all ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]"
      >
        {/* Top face */}
        <path
          d="M18 3L32 10.5L18 18L4 10.5L18 3Z"
          fill="url(#cube-top-grad)"
          stroke="#00f0ff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Left face */}
        <path
          d="M4 10.5L18 18V33L4 25.5V10.5Z"
          fill="url(#cube-left-grad)"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Right face */}
        <path
          d="M18 18L32 10.5V25.5L18 33V18Z"
          fill="url(#cube-right-grad)"
          stroke="#0284c7"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Subtle 3x3 Rubik internal grid lines */}
        <path
          d="M13.3 5.5L27.3 13M8.7 8L22.7 15.5"
          stroke="#00f0ff"
          strokeWidth="0.7"
          strokeOpacity="0.5"
        />
        <path
          d="M8.7 13L22.7 5.5M13.3 15.5L27.3 8"
          stroke="#00f0ff"
          strokeWidth="0.7"
          strokeOpacity="0.5"
        />
        {/* Left face internal lines */}
        <path
          d="M8.7 13V28M13.3 15.5V30.5"
          stroke="#38bdf8"
          strokeWidth="0.7"
          strokeOpacity="0.4"
        />
        <path
          d="M4 15.5L18 23M4 20.5L18 28"
          stroke="#38bdf8"
          strokeWidth="0.7"
          strokeOpacity="0.4"
        />
        {/* Right face internal lines */}
        <path
          d="M22.7 15.5V30.5M27.3 13V28"
          stroke="#0284c7"
          strokeWidth="0.7"
          strokeOpacity="0.4"
        />
        <path
          d="M18 23L32 15.5M18 28L32 20.5"
          stroke="#0284c7"
          strokeWidth="0.7"
          strokeOpacity="0.4"
        />

        <defs>
          <linearGradient id="cube-top-grad" x1="4" y1="3" x2="32" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00f0ff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#0284c7" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="cube-left-grad" x1="4" y1="10.5" x2="18" y2="33" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="cube-right-grad" x1="18" y1="18" x2="32" y2="33" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0369a1" stopOpacity="0.5" />
            <stop offset="1" stopColor="#0284c7" stopOpacity="0.85" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function NavItem({ to, icon, onClick, collapsed = false, children }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? children : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-xl text-xs font-medium my-1 transition-all border ${
          collapsed
            ? "justify-center p-2.5"
            : "gap-2.5 px-3 py-2"
        } ${
          isActive
            ? "bg-neon-blue/10 text-white border-neon-blue/30 shadow-sm"
            : "text-gray-400 border-transparent hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{children}</span>}
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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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
        <div className="flex items-center gap-2.5">
          <CubeLogo size={28} />
          <div>
            <span className="font-extrabold text-xs tracking-tight text-white block leading-tight">{title}</span>
            <span className="text-[9px] text-gray-400 font-medium block">Interactive 3D Solver</span>
          </div>
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
      <aside
        className={`hidden md:flex flex-col border-r border-dark-border bg-dark-surface/90 backdrop-blur-md relative shrink-0 transition-all duration-300 ease-in-out ${
          collapsed ? "w-16 p-2" : "w-56 p-3.5"
        }`}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 mb-1 mt-0.5">
            <div title={`${title} - Interactive 3D Solver`}>
              <CubeLogo size={34} />
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-neon-blue hover:bg-neon-blue/10 transition-colors cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-1 mb-1 mt-0.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <CubeLogo size={36} />
              <div className="min-w-0">
                <div className="font-extrabold text-[15px] leading-tight tracking-tight text-white truncate">
                  {title}
                </div>
                <div className="text-[10px] text-gray-400 font-medium tracking-wide truncate mt-0.5">
                  Interactive 3D Solver
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        )}

        <div className={`my-2 ${collapsed ? "flex justify-center" : ""}`}>
          <BackendBadge compact={collapsed} />
        </div>

        <nav className="flex-1 space-y-0.5">
          <NavItem 
            to="/dashboard"
            collapsed={collapsed}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>}
          >
            Dashboard
          </NavItem>
          <NavItem 
            to="/cube-input"
            collapsed={collapsed}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
          >
            Cube Input
          </NavItem>
          <NavItem 
            to="/solve"
            collapsed={collapsed}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
          >
            Solve Workspace
          </NavItem>
          <NavItem 
            to="/tutorial"
            collapsed={collapsed}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>}
          >
            Tutorials
          </NavItem>
          <NavItem 
            to="/leaderboard"
            collapsed={collapsed}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>}
          >
            Leaderboard
          </NavItem>
        </nav>

        <div className="mt-auto pt-3 space-y-2.5 border-t border-dark-border">
          {user ? (
            collapsed ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLogout}
                  title={`Signed in as ${user.display_name}. Click to logout.`}
                  className="w-8 h-8 rounded-full bg-neon-blue/20 text-neon-blue text-xs font-bold flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer border border-neon-blue/30"
                >
                  {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                </button>
              </div>
            ) : (
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
            )
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              title="Login / Register"
              className={`w-full rounded-xl border border-neon-blue/40 text-neon-blue bg-neon-blue/10 hover:bg-neon-blue hover:text-black transition-all font-semibold cursor-pointer flex items-center justify-center ${
                collapsed ? "py-2 text-xs" : "px-3 py-1.5 text-xs"
              }`}
            >
              {collapsed ? "👤" : "Login / Register"}
            </button>
          )}

          <button
            type="button"
            title="New Solve"
            className={`w-full rounded-xl bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black font-bold flex items-center justify-center shadow-md shadow-neon-blue/20 transition-all cursor-pointer active:scale-95 ${
              collapsed ? "py-2 text-base" : "py-2 px-3 text-xs font-semibold gap-1.5"
            }`}
            onClick={() => navigate("/cube-input")}
          >
            <span>+</span>
            {!collapsed && <span>New Solve</span>}
          </button>
          {!collapsed && (
            <div className="text-center text-[10px] text-gray-600">v1.0.0</div>
          )}
        </div>
      </aside>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto min-w-0">{children}</main>
    </div>
  );
}
