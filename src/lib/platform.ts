/**
 * Detects whether the app is running inside a Capacitor native shell
 * (iOS / Android) or in a standard web browser.
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  // Capacitor v3+ exposes isNativePlatform(); older shells expose isNative.
  if (typeof cap.isNativePlatform === "function") return cap.isNativePlatform();
  return !!cap.isNative;
}

export function nativePlatformName(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as any).Capacitor;
  const name = cap?.getPlatform?.() ?? "web";
  return name === "ios" || name === "android" ? name : "web";
}
