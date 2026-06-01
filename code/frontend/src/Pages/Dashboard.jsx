import AppShell from "../Layout/AppShell";

export default function Dashboard() {
  return (
    <AppShell>
      <h2 style={{ margin: 0, fontSize: 18 }}>Dashboard</h2>
      <p style={{ opacity: 0.8 }}>Later: stats, recent solves, etc.</p>
    </AppShell>
  );
}