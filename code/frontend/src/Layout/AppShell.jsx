import { NavLink } from "react-router-dom";

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

export default function AppShell({ title = "Plastic_box_solver", children }) {
  return (
    <div className="flex h-screen bg-dark-bg text-white overflow-hidden">
      <aside className="w-[230px] p-4 border-r border-dark-border bg-dark-surface flex flex-col relative shrink-0">
        <div className="font-bold text-sm mb-0.5 text-neon-blue">
          {title}
        </div>
        <div className="text-xs text-gray-400 mb-4">Precision cube tool</div>

        <nav className="flex-1">
          <NavItem to="/dashboard">Dashboard</NavItem>
          <NavItem to="/cube-input">Cube Input</NavItem>
          <NavItem to="/solve">Solve Workspace</NavItem>
          <NavItem to="/leaderboard">Leaderboard</NavItem>
        </nav>

        <div className="mt-auto pt-4">
          <button
            className="w-full px-3 py-2.5 rounded-lg border border-dark-border bg-dark-bg text-white cursor-pointer transition-colors hover:border-neon-green hover:text-neon-green"
            onClick={() => alert("Later: create new solve")}
          >
            + New Solve
          </button>

          <div className="mt-3 text-xs text-gray-400 flex flex-col gap-1">
            <button className="text-left px-1 py-1.5 hover:text-white transition-colors cursor-pointer">Help</button>
            <button className="text-left px-1 py-1.5 hover:text-white transition-colors cursor-pointer">Logout</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 overflow-y-auto">{children}</main>
    </div>
  );
}