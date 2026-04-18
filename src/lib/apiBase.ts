/**
 * In dev, Vite proxies `/api` to the local Express server.
 * In production (Firebase Hosting), set `VITE_API_BASE_URL` to your deployed API origin (no trailing slash).
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!base) return normalized;
  return `${base}${normalized}`;
}
