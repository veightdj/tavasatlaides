import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/categories";

// Radius in METERS. null = unlimited (no distance filter).
export type RadiusM = 500 | 1000 | 3000 | 5000 | null;
export const RADIUS_OPTIONS_M: Array<{ value: RadiusM; label: string }> = [
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 3000, label: "3 km" },
  { value: 5000, label: "5 km" },
  { value: null, label: "No distance limit" },
];

export type NotificationFrequency = "instant" | "daily_1" | "daily_2" | "daily_3";
export const FREQUENCY_OPTIONS: Array<{ value: NotificationFrequency; label: string }> = [
  { value: "instant", label: "Instant" },
  { value: "daily_1", label: "1 time per day" },
  { value: "daily_2", label: "2 times per day" },
  { value: "daily_3", label: "3 times per day" },
];

export type NotificationPrefs = {
  enabled: boolean;
  radiusM: RadiusM;
  frequency: NotificationFrequency;
  latitude: number | null;
  longitude: number | null;
  categories: CategorySlug[];
  quietStart: number;
  quietEnd: number;
  soundVibration: boolean;
  newDeals: boolean;
  favoriteBusinesses: boolean;
  expiringDeals: boolean;
  specialOffers: boolean;
  announcements: boolean;
  nearbyDeals: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  radiusM: 3000,
  frequency: "instant",
  latitude: null,
  longitude: null,
  categories: [...CATEGORY_SLUGS],
  quietStart: 22,
  quietEnd: 8,
  soundVibration: true,
  newDeals: true,
  favoriteBusinesses: true,
  expiringDeals: true,
  specialOffers: true,
  announcements: true,
  nearbyDeals: true,
};

const PREFS_KEY = "tavasatlaides.notif.prefs";

export function loadPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: NotificationPrefs) {
  if (typeof window !== "undefined") {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  }
}

export function isInQuietHours(p: NotificationPrefs, now = new Date()): boolean {
  const h = now.getHours();
  const { quietStart: s, quietEnd: e } = p;
  if (s === e) return false;
  if (s < e) return h >= s && h < e;
  return h >= s || h < e;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

// User-friendly geolocation messaging
export const GEOLOCATION_FRIENDLY_MESSAGE =
  "Couldn't determine your location. Allow location access in your browser settings, or enter an address manually.";

// Last-known location cache (used when device GPS isn't available)
const LAST_LOC_KEY = "tavasatlaides.lastLocation";
export type SavedCoords = { lat: number; lng: number; at: string };

export function getSavedLocation(): SavedCoords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_LOC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSavedLocation(lat: number, lng: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_LOC_KEY, JSON.stringify({ lat, lng, at: new Date().toISOString() }));
}
