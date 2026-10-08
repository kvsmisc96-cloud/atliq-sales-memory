"use client";
import { useEffect, useState } from "react";

/** True when the server has an ANTHROPIC_API_KEY and live AI calls are possible. */
export function useAiStatus() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((d) => setOn(Boolean(d.ai))).catch(() => setOn(false));
  }, []);
  return on;
}
