import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/categories";

export type Radius = 1 | 3 | 5 | 10 | 25 | 50;
export const RADIUS_OPTIONS: Radius[] = [1, 3, 5, 10, 25, 50];

export type NotificationPrefs = {
  enabled: boolean;
  radiusKm: Radius;
  categories: CategorySlug[];
  quietStart: number; // 0–23
  quietEnd: number; // 0–23
  maxPerDay: number;
  soundVibration: boolean;
  // OneSignal category toggles (Phase 1)
  newDeals: boolean;
  favoriteBusinesses: boolean;
  expiringDeals: boolean;
  specialOffers: boolean;
  announcements: boolean;
  nearbyDeals: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  radiusKm: 5,
  categories: [...CATEGORY_SLUGS],
  quietStart: 22,
  quietEnd: 8,
  maxPerDay: 5,
  soundVibration: true,
  newDeals: true,
  favoriteBusinesses: true,
  expiringDeals: true,
  specialOffers: true,
  announcements: true,
  nearbyDeals: true,
};

const PREFS_KEY = "tavasatlaides.notif.prefs";
const SENT_KEY = "tavasatlaides.notif.sent"; // { [adId]: isoString }
const COUNT_KEY = "tavasatlaides.notif.count"; // { date: 'YYYY-MM-DD', count: number }

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
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

export function isInQuietHours(p: NotificationPrefs, now = new Date()): boolean {
  const h = now.getHours();
  const { quietStart: s, quietEnd: e } = p;
  if (s === e) return false;
  if (s < e) return h >= s && h < e;
  return h >= s || h < e; // wraps midnight
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getSentMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
  } catch {
    return {};
  }
}

function setSentMap(m: Record<string, string>) {
  localStorage.setItem(SENT_KEY, JSON.stringify(m));
}

export function getTodayCount(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(COUNT_KEY) || "{}");
    if (raw.date !== todayKey()) return 0;
    return raw.count || 0;
  } catch {
    return 0;
  }
}

function bumpTodayCount() {
  const c = getTodayCount() + 1;
  localStorage.setItem(COUNT_KEY, JSON.stringify({ date: todayKey(), count: c }));
}

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // same ad: once per 6h

export function canNotify(adId: string, p: NotificationPrefs): boolean {
  if (!p.enabled) return false;
  if (isInQuietHours(p)) return false;
  if (getTodayCount() >= p.maxPerDay) return false;
  const sent = getSentMap()[adId];
  if (sent && Date.now() - new Date(sent).getTime() < COOLDOWN_MS) return false;
  return true;
}

export function markNotified(adId: string) {
  const m = getSentMap();
  m[adId] = new Date().toISOString();
  // prune entries older than 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const k of Object.keys(m)) {
    if (new Date(m[k]).getTime() < cutoff) delete m[k];
  }
  setSentMap(m);
  bumpTodayCount();
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export type DealNotifyPayload = {
  adId: string;
  title: string;
  body: string;
  distanceM: number;
  url: string;
  imageUrl?: string | null;
};

export async function showDealNotification(p: DealNotifyPayload, prefs: NotificationPrefs) {
  if (typeof window === "undefined") return;
  // Prefer service worker registration if available (better on mobile)
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && "showNotification" in reg) {
        await reg.showNotification(p.title, {
          body: p.body,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          tag: `deal-${p.adId}`,
          data: { url: p.url },
          silent: !prefs.soundVibration,
        });
        return;
      }
    }
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(p.title, {
        body: p.body,
        icon: "/favicon.svg",
        tag: `deal-${p.adId}`,
        silent: !prefs.soundVibration,
      });
    }
  } catch {
    // swallow — toast is fallback
  }
}
