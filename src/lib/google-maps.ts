// Shared singleton loader for the Google Maps JS API.
// Ensures the script is injected exactly once per page, no matter how many
// components request it concurrently. Prevents the "you have included the
// Google Maps JavaScript API multiple times" warning and race conditions
// between components.

let loaderPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  const w = window as any;
  if (w.google?.maps?.Map && w.google?.maps?.importLibrary) {
    return Promise.resolve(w.google);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) {
      loaderPromise = null;
      reject(new Error("Missing VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"));
      return;
    }

    // If a previous (non-shared) script tag is already in the DOM, reuse it.
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-loader="1"]',
    );

    const waitReady = () => {
      const start = Date.now();
      const tick = () => {
        if (w.google?.maps?.Map && w.google?.maps?.importLibrary) {
          resolve(w.google);
        } else if (Date.now() - start > 15000) {
          loaderPromise = null;
          reject(new Error("Google Maps load timeout"));
        } else {
          setTimeout(tick, 50);
        }
      };
      tick();
    };

    if (existing) {
      waitReady();
      return;
    }

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&loading=async&libraries=places${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMapsLoader = "1";
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps JS"));
    };
    s.onload = waitReady;
    document.head.appendChild(s);
  });

  return loaderPromise;
}
