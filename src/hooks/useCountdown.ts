import { useEffect, useState } from "react";

export type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function compute(targetMs: number): CountdownParts {
  const totalMs = targetMs - Date.now();
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const seconds = Math.floor(totalMs / 1000) % 60;
  const minutes = Math.floor(totalMs / (1000 * 60)) % 60;
  const hours = Math.floor(totalMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  return { totalMs, days, hours, minutes, seconds, expired: false };
}

export function useCountdown(expiresAt: number): CountdownParts {
  const [parts, setParts] = useState(() => compute(expiresAt));

  useEffect(() => {
    setParts(compute(expiresAt));
    const id = window.setInterval(() => setParts(compute(expiresAt)), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return parts;
}
