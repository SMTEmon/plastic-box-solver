import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { Button, Note } from "../Components/ui.jsx";
import { useAuthStore } from "../store/authStore.js";

/**
 * Login and Register share a layout, so they share a file.
 *
 * Client-side rules mirror the backend exactly, or the messages surprise
 * people: password >= 8 characters (backend returns 422), duplicate email and
 * duplicate display name both return 400 with a readable message.
 */

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          {/* Static class names only -- Tailwind scans the source text, so a
              template literal like `bg-${c}` never generates any CSS. */}
          <div className="inline-flex gap-1 mb-4">
            <span className="w-3 h-3 rounded-sm bg-cube-r" />
            <span className="w-3 h-3 rounded-sm bg-cube-g" />
            <span className="w-3 h-3 rounded-sm bg-cube-b" />
            <span className="w-3 h-3 rounded-sm bg-cube-y" />
            <span className="w-3 h-3 rounded-sm bg-cube-o" />
            <span className="w-3 h-3 rounded-sm bg-cube-w" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>

        <div className="bg-dark-surface/85 backdrop-blur border border-dark-border rounded-2xl p-5">
          {children}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">{footer}</p>
      </div>
    </div>
  );
}

function Field({ label, hint, ...rest }) {
  return (
    <label className="block mb-3">
      <span className="block text-[11px] uppercase tracking-[0.12em] text-gray-400 mb-1.5">
        {label}
      </span>
      <input
        className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-neon-blue focus:ring-1 focus:ring-neon-blue placeholder:text-gray-600"
        {...rest}
      />
      {hint && <span className="block text-[10px] text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const justRegistered = location.state?.registered;
  const from = location.state?.from ?? "/dashboard";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.status === 401
          ? "Wrong email or password."
          : err.message || "Could not sign in.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to save your solves and appear on the leaderboard"
      footer={
        <>
          No account?{" "}
          <Link to="/register" className="text-neon-blue hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {justRegistered && (
        <Note tone="success" className="mb-4">
          Account created. Sign in to continue.
        </Note>
      )}

      <form onSubmit={submit}>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error && (
          <Note tone="error" className="mb-3">
            {error}
          </Note>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          disabled={busy}
        >
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-[11px] text-gray-500 mt-4 text-center leading-relaxed">
        You can solve cubes without an account &mdash;{" "}
        <Link to="/cube-input" className="text-gray-400 hover:text-white underline">
          skip for now
        </Link>
        . Solves are only saved when signed in.
      </p>
    </AuthShell>
  );
}

export function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Mirror the backend's rules so the feedback is instant and identical.
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (password !== confirm) {
      return setError("The two passwords do not match.");
    }

    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim());
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.message || "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create an account"
      subtitle="Track your solve times, efficiency and personal best"
      footer={
        <>
          Already have one?{" "}
          <Link to="/login" className="text-neon-blue hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit}>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Field
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional"
          hint="Shown on the leaderboard. Defaults to the part of your email before the @."
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error && (
          <Note tone="error" className="mb-3">
            {error}
          </Note>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          disabled={busy}
        >
          {busy ? "Creating..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
