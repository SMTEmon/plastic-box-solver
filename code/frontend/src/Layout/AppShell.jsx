import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useBackendStatus } from "../lib/useBackendStatus.js";
import { useAuthStore } from "../store/authStore.js";

const NAV = [
  { to: "/cube-input", label: "Cube Input", icon: "▣" },
  { to: "/scan", label: "Camera Scan", icon: "◉" },
  { to: "/solve", label: "Solve", icon: "◈" },
  { to: "/dashboard", label: "Dashboard", icon: "▤", auth: true },
  { to: "/leaderboard", label: "Leaderboard", icon: "▲" },
];

function NavItem({ to, icon, label, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm my-1 transition-all border ${
          isActive
            ? "bg-neon-blue/10 text-neon-blue border-neon-blue/40"
            : "text-gray-400 border-transparent hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <span className="text-xs opacity-70">{icon}</span>
      {label}
    </NavLink>
  );
}

function BackendBadge() {
  const status = useBackendStatus();
  const map = {
    checking: ["bg-gray-500", "text-gray-500", "Checking API"],
    online: ["bg-neon-green", "text-neon-green", "API connected"],
    offline: ["bg-accent-rose", "text-accent-rose", "API offline"],
  };
  const [dot, text, label] = map[status];
  return (
    <div
      className="flex items-center gap-2 text-[11px]"
      title={
        status === "offline"
          ? "Start the backend: cd code/backend && uvicorn app.main:app --port 8000"
          : "http://localhost:8000"
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dot} ${status === "checking" ? "pbs-pulse" : ""}`}
      />
      <span className={text}>{label}</span>
    </div>
  );
}

function UserBlock() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  if (!token) {
    return (
      <div className="rounded-xl border border-dark-border bg-dark-bg/60 p-3">
        <p className="text-[11px] text-gray-400 leading-relaxed mb-2.5">
          Sign in to save solves and join the leaderboard.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/login")}
            className="flex-1 py-2 rounded-lg bg-neon-blue text-dark-bg text-xs font-bold cursor-pointer hover:brightness-110 transition-all"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/register")}
            className="flex-1 py-2 rounded-lg border border-dark-border text-gray-300 text-xs cursor-pointer hover:text-white transition-colors"
          >
            Register
          </button>
        </div>
      </div>
    );
  }

  const name = user?.display_name ?? "...";
  return (
    <div className="rounded-xl border border-dark-border bg-dark-bg/60 p-3">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-accent-violet/20 border border-accent-violet/40 text-accent-violet grid place-items-center text-sm font-bold shrink-0">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white truncate">{name}</div>
          <div className="text-[10px] text-gray-500 truncate">{user?.email}</div>
        </div>
      </div>
      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
        className="w-full mt-2.5 py-1.5 rounded-lg text-[11px] text-gray-400 border border-dark-border cursor-pointer hover:text-accent-rose hover:border-accent-rose/40 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

export default function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const token = useAuthStore((s) => s.token);

  const sidebar = (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="flex gap-0.5">
          <span className="w-2 h-2 rounded-[2px] bg-cube-r" />
          <span className="w-2 h-2 rounded-[2px] bg-cube-g" />
          <span className="w-2 h-2 rounded-[2px] bg-cube-b" />
        </span>
        <span className="font-bold text-sm text-white">Plastic Box Solver</span>
      </div>
      <div className="text-[11px] text-gray-500 mb-3">Scan · Solve · Learn</div>
      <BackendBadge />

      <nav className="flex-1 mt-4">
        {NAV.filter((n) => !n.auth || token).map((n) => (
          <NavItem key={n.to} {...n} onNavigate={() => setOpen(false)} />
        ))}
      </nav>

      <div className="mt-auto pt-3">
        <UserBlock />
      </div>
    </>
  );

  return (
    <div className="flex h-screen text-white overflow-hidden">
      {/* Mobile: the sidebar becomes a drawer so the content is usable at 360px. */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 w-9 h-9 rounded-xl border border-dark-border bg-dark-surface/90 backdrop-blur text-gray-300 cursor-pointer"
        aria-label="Open menu"
      >
        ☰
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static z-40 h-full w-[240px] p-4 border-r border-dark-border bg-dark-surface/95 backdrop-blur flex flex-col shrink-0 transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {sidebar}
      </aside>

      <main className="flex-1 p-4 pt-14 md:pt-4 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
