import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./Pages/Dashboard";
import CubeInput from "./Pages/CubeInput";
import SolveWorkspace from "./Pages/SolveWorkspace";
import Leaderboard from "./Pages/Leaderboard";
import CameraScan from "./Pages/CameraScan";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cube-input" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cube-input" element={<CubeInput />} />
        <Route path="/scan" element={<CameraScan />} />
        <Route path="/solve" element={<SolveWorkspace />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        {/* Catch-all: an unknown URL used to render a blank page. */}
        <Route path="*" element={<Navigate to="/cube-input" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
