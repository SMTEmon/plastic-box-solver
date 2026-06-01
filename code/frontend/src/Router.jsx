import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./Pages/Dashboard";
import CubeInput from "./Pages/CubeInput";
import SolveWorkspace from "./Pages/SolveWorkspace";
import Leaderboard from "./Pages/Leaderboard";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cube-input" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cube-input" element={<CubeInput />} />
        <Route path="/solve" element={<SolveWorkspace />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </BrowserRouter>
  );
}