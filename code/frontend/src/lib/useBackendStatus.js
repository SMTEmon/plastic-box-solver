import { useEffect, useState } from "react";
import { ping } from "./api.js";

/**
 * Polls the backend's /health endpoint so the UI can show whether the two
 * halves are actually talking. Returns "checking" | "online" | "offline".
 */
export function useBackendStatus(intervalMs = 15000) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const ok = await ping();
      if (!cancelled) setStatus(ok ? "online" : "offline");
    };

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}
