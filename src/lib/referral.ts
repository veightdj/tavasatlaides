// Tiny anonymous referral id, persisted per browser. Appended as ?ref= to
// shared links so we can later attribute viral traffic without tracking PII.
const KEY = "dealslv:ref";

export function getReferralId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id =
        (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 10);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function buildShareUrl(baseUrl: string): string {
  const ref = getReferralId();
  if (!ref) return baseUrl;
  try {
    const u = new URL(baseUrl);
    u.searchParams.set("ref", ref);
    u.searchParams.set("utm_source", "share");
    u.searchParams.set("utm_medium", "social");
    return u.toString();
  } catch {
    return baseUrl;
  }
}
