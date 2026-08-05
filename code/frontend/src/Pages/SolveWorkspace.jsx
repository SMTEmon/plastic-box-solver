import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";
import { useLocation } from "react-router-dom";

export default function SolveWorkspace() {
  const location = useLocation();
  const initialFaces = location.state?.initialFaces;

  return (
    <AppShell>
      <h2 className="text-xl font-bold mb-3 text-white">Solve Workspace</h2>

      <div className="h-[520px] rounded-xl overflow-hidden border border-dark-border bg-dark-bg">
        <CubeScene initialFaces={initialFaces} interactive={true} />
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Keyboard (for now): U/D/L/R/F/B turns. Hold Shift for reverse.
      </p>
    </AppShell>
  );
}