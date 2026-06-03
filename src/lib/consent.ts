// Centralized cookie-consent helpers. Any analytics/ads script MUST go
// through `loadIfConsented` (or check `hasConsent()`) so nothing fires
// before the user accepts the banner.

const STORAGE_KEY = "tavasatlaides.cookie-consent";
const EVENT = "cookie-consent-change";

export type ConsentChoice = "accepted" | "rejected";

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function hasConsent(): boolean {
  return getConsent() === "accepted";
}

export function setConsent(choice: ConsentChoice) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, choice);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: choice }));
}

export function onConsentChange(cb: (c: ConsentChoice) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as ConsentChoice;
    cb(detail);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/**
 * Loads a third-party script only if the user has accepted cookies.
 * If consent is not yet given, waits for the next consent event.
 * Returns a cleanup function.
 */
export function loadIfConsented(loader: () => void | (() => void)): () => void {
  if (typeof window === "undefined") return () => {};
  let cleanup: void | (() => void);
  let off: (() => void) | null = null;

  const run = () => {
    if (cleanup) return;
    cleanup = loader();
  };

  if (hasConsent()) {
    run();
  } else {
    off = onConsentChange((c) => {
      if (c === "accepted") {
        run();
        off?.();
        off = null;
      }
    });
  }

  return () => {
    off?.();
    if (typeof cleanup === "function") cleanup();
  };
}
