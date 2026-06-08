// Shared singleton loader for the Google Maps JS API.
// Ensures the script is injected exactly once per page, no matter how many
// components request it concurrently. Prevents the "you have included the
// Google Maps JavaScript API multiple times" warning and race conditions
// between components.

type GoogleMapsWindow = Window &
  typeof globalThis & {
    google?: { maps?: { Map?: unknown; importLibrary?: unknown } };
    [key: string]: unknown;
  };

let loaderPromise: Promise<unknown> | null = null;

function isLovableHost(hostname: string): boolean {
  return hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com");
}

async function resolveGoogleMapsKey(): Promise<string> {
  const managedKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const customPublicKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ?? import.meta.env.VITE_MAPS;

  if (customPublicKey) return customPublicKey;

  // On custom domains, prefer the owner's browser key from backend config.
  // The managed connector key is restricted to Lovable preview/published hosts.
  if (!isLovableHost(window.location.hostname)) {
    try {
      const res = await fetch("/api/public/config/maps", {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as { key?: string };
        if (data.key) return data.key;
      }
    } catch {
      /* fall back to the managed key below */
    }
  }

  if (managedKey) return managedKey;
  throw new Error("Missing Google Maps browser key");
}

export function loadGoogleMaps(): Promise<unknown> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  const w = window as GoogleMapsWindow;
  if (w.google?.maps?.Map && w.google?.maps?.importLibrary) {
    return Promise.resolve(w.google);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

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

    const callbackName = `__tavasAtlaidesGoogleMapsReady_${Date.now()}`;
    const timeout = window.setTimeout(() => {
      delete w[callbackName];
      loaderPromise = null;
      reject(new Error("Google Maps load timeout"));
    }, 15000);

    w[callbackName] = () => {
      window.clearTimeout(timeout);
      delete w[callbackName];
      waitReady();
    };

    resolveGoogleMapsKey()
      .then((key) => {
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callbackName}&libraries=places${channel ? `&channel=${encodeURIComponent(channel)}` : ""}`;
        s.async = true;
        s.defer = true;
        s.dataset.googleMapsLoader = "1";
        s.onerror = () => {
          window.clearTimeout(timeout);
          delete w[callbackName];
          loaderPromise = null;
          reject(new Error("Failed to load Google Maps JS"));
        };
        document.head.appendChild(s);
      })
      .catch((error) => {
        window.clearTimeout(timeout);
        delete w[callbackName];
        loaderPromise = null;
        reject(error);
      });
  });

  return loaderPromise;
}
