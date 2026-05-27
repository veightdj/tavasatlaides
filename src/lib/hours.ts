// Working hours utilities. Times are HH:mm strings in the merchant's local time.
// We don't store a per-store timezone yet — Latvia-based platform uses Europe/Riga
// which matches the browser locale for the vast majority of users.

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export type DayHours = { closed: boolean; open: string; close: string };
export type Hours = Record<DayKey, DayHours>;

export const DEFAULT_HOURS: Hours = {
  mon: { closed: false, open: "09:00", close: "18:00" },
  tue: { closed: false, open: "09:00", close: "18:00" },
  wed: { closed: false, open: "09:00", close: "18:00" },
  thu: { closed: false, open: "09:00", close: "18:00" },
  fri: { closed: false, open: "09:00", close: "18:00" },
  sat: { closed: false, open: "10:00", close: "16:00" },
  sun: { closed: true, open: "10:00", close: "16:00" },
};

export function parseHours(value: unknown): Hours | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, any>;
  const out = {} as Hours;
  for (const d of DAYS) {
    const day = v[d];
    if (!day || typeof day !== "object") return null;
    const closed = !!day.closed;
    const open = typeof day.open === "string" ? day.open : "09:00";
    const close = typeof day.close === "string" ? day.close : "18:00";
    out[d] = { closed, open, close };
  }
  return out;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// JS getDay(): 0=Sun..6=Sat → map to our keys (Mon-first)
function dayKeyFromDate(d: Date): DayKey {
  return DAYS[(d.getDay() + 6) % 7];
}

export type Status =
  | { state: "open"; closesAt: string; minutesToClose: number }
  | { state: "closing_soon"; closesAt: string; minutesToClose: number }
  | { state: "closed"; opensAt: string | null; opensDay: DayKey | null };

export function computeStatus(hours: Hours, now: Date = new Date()): Status {
  const todayKey = dayKeyFromDate(now);
  const today = hours[todayKey];
  const mins = now.getHours() * 60 + now.getMinutes();

  if (today && !today.closed) {
    const openM = toMinutes(today.open);
    const closeM = toMinutes(today.close);
    if (mins >= openM && mins < closeM) {
      const minutesToClose = closeM - mins;
      return {
        state: minutesToClose <= 60 ? "closing_soon" : "open",
        closesAt: today.close,
        minutesToClose,
      };
    }
  }

  // Find next opening within 7 days
  for (let i = 0; i < 8; i++) {
    const key = DAYS[(DAYS.indexOf(todayKey) + i) % 7];
    const day = hours[key];
    if (!day || day.closed) continue;
    if (i === 0 && mins < toMinutes(day.open)) {
      return { state: "closed", opensAt: day.open, opensDay: key };
    }
    if (i > 0) {
      return { state: "closed", opensAt: day.open, opensDay: key };
    }
  }
  return { state: "closed", opensAt: null, opensDay: null };
}

export function todayRange(hours: Hours, now: Date = new Date()): string | null {
  const day = hours[dayKeyFromDate(now)];
  if (!day || day.closed) return null;
  return `${day.open} – ${day.close}`;
}
