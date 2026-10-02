import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./Pages/Dashboard";
import CubeInput from "./Pages/CubeInput";
import SolveWorkspace from "./Pages/SolveWorkspace";
import Leaderboard from "./Pages/Leaderboard";
import Login from "./Pages/Login";
import { useAuthStore } from "./store/authStore";

export default function Router() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cube-input" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cube-input" element={<CubeInput />} />
        <Route path="/solve" element={<SolveWorkspace />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        {/* Catch-all: an unknown URL used to render a blank page. */}
        <Route path="*" element={<Navigate to="/cube-input" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
