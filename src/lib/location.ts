import { isNativePlatform } from "./platform";

export type Coords = { lat: number; lng: number; accuracy?: number };

export class LocationError extends Error {
  code: "permission_denied" | "unavailable" | "timeout" | "unsupported";
  constructor(code: LocationError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function getCurrentLocation(): Promise<Coords> {
  if (isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted") {
      const req = await Geolocation.requestPermissions();
      if (req.location !== "granted") {
        throw new LocationError("permission_denied", "Location permission denied");
      }
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
    };
  }

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    throw new LocationError("unsupported", "Geolocation is not supported in this browser");
  }

  return new Promise<Coords>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      (err) => {
        const code =
          err.code === err.PERMISSION_DENIED
            ? "permission_denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable";
        reject(new LocationError(code, err.message || "Could not get your location"));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 },
    );
  });
}
