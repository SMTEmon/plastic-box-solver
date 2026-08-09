import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Dashboard from "./Pages/Dashboard";
import CubeInput from "./Pages/CubeInput";
import SolveWorkspace from "./Pages/SolveWorkspace";
import Leaderboard from "./Pages/Leaderboard";
import CameraScan from "./Pages/CameraScan";
import { Login, Register } from "./Pages/AuthPages";
import { useAuthStore } from "./store/authStore.js";

/**
 * Gate for pages that need an account.
 *
 * `loading` matters: on a refresh we have a token but not yet a user, and
 * without waiting the page would flash to /login before the profile arrives.
 * `from` is remembered so signing in returns you where you were going.
 */
function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen grid place-items-center text-xs text-gray-500 pbs-pulse">
        Loading your session...
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

/** Already signed in? Then /login and /register are pointless. */
function RedirectIfAuthed({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/dashboard" replace /> : children;
}

export default function Router() {
  const loadUser = useAuthStore((s) => s.loadUser);

  // Turn a stored token back into a user exactly once, on app start.
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cube-input" replace />} />

        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <Register />
            </RedirectIfAuthed>
          }
        />

        {/* Solving works logged out; only saving requires an account. */}
        <Route path="/cube-input" element={<CubeInput />} />
        <Route path="/scan" element={<CameraScan />} />
        <Route path="/solve" element={<SolveWorkspace />} />

        {/* Public, but personalised when signed in (the backend's is_me flag). */}
        <Route path="/leaderboard" element={<Leaderboard />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        {/* Catch-all: an unknown URL used to render a blank page. */}
        <Route path="*" element={<Navigate to="/cube-input" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
