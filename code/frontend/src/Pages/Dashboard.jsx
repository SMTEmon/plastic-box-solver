import AppShell from "../Layout/AppShell";

export default function Dashboard() {
  return (
    <AppShell>
      <h2 className="text-xl font-bold text-white mb-2">Dashboard</h2>
      <p className="text-xs text-gray-400">Later: stats, recent solves, etc.</p>
    </AppShell>
  );
}