// Lightweight anonymous device fingerprint stored in localStorage.
// Not for tracking — used only to soft-dedupe abuse reports.
const KEY = "tavasatlaides.fp";

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "ssr-no-fp";
  let v = window.localStorage.getItem(KEY);
  if (!v) {
    v = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36))
      .replace(/-/g, "")
      .slice(0, 32);
    window.localStorage.setItem(KEY, v);
  }
  return v;
}
