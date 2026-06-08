// Host / audience routing for the multi-subdomain split.
//
// Production hosts:
//   tavasatlaides.lv / www.tavasatlaides.lv → client  (marketing / SEO)
//   app.tavasatlaides.lv                    → app     (anonymous consumer app)
//   partner.tavasatlaides.lv                → merchant
//   admin.tavasatlaides.lv                  → admin
//
// Preview/localhost/Lovable preview subdomains are treated as "any" — no
// cross-host redirects so we can develop everything from one URL.

export type Audience = "client" | "app" | "merchant" | "admin";

const PROD_HOSTS: Record<string, Audience> = {
  "tavasatlaides.lv": "client",
  "www.tavasatlaides.lv": "client",
  "tavasatlaides.lovable.app": "client",
  "app.tavasatlaides.lv": "app",
  "partner.tavasatlaides.lv": "merchant",
  "admin.tavasatlaides.lv": "admin",
};

export const AUDIENCE_HOSTS: Record<Audience, string> = {
  client: "tavasatlaides.lv",
  app: "app.tavasatlaides.lv",
  merchant: "partner.tavasatlaides.lv",
  admin: "admin.tavasatlaides.lv",
};

/** Returns the audience for the current hostname, or null when the host is
 *  not a recognised production host (preview, localhost, etc). */
export function getHostAudience(hostname?: string): Audience | null {
  if (typeof window === "undefined" && !hostname) return null;
  const h = (hostname ?? window.location.hostname).toLowerCase();
  return PROD_HOSTS[h] ?? null;
}

/** Paths that should live under each audience. The first matching rule wins. */
const MERCHANT_PREFIXES = ["/dashboard", "/ads", "/store"];
const ADMIN_PREFIXES = ["/admin"];

/** Consumer-app paths — anonymous browsing, GPS feed, saved deals, map. */
const APP_PREFIXES = [
  "/nearby",
  "/near-me",
  "/map",
  "/favorites",
  "/saved",
  "/deals",
  "/categories",
  "/stores",
];

/** Marketing / SEO paths — live on www. */
const CLIENT_PREFIXES = [
  "/about",
  "/for-merchants",
  "/contact",
  "/faq",
];

/** Paths that are allowed on any host (auth, legal, shared CTAs). */
const SHARED_PREFIXES = [
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/delete-account",
  "/settings/notifications",
  "/lovable", // internal hooks/preview endpoints
  "/api",
  "/sitemap.xml",
  "/robots.txt",
];

export function audienceForPath(pathname: string): Audience | "shared" {
  const p = pathname.toLowerCase();
  if (SHARED_PREFIXES.some((s) => p === s || p.startsWith(s + "/"))) return "shared";
  if (ADMIN_PREFIXES.some((s) => p === s || p.startsWith(s + "/"))) return "admin";
  if (MERCHANT_PREFIXES.some((s) => p === s || p.startsWith(s + "/"))) return "merchant";
  // /settings is the merchant settings hub
  if (p === "/settings" || p.startsWith("/settings/")) return "merchant";
  if (CLIENT_PREFIXES.some((s) => p === s || p.startsWith(s + "/"))) return "client";
  if (APP_PREFIXES.some((s) => p === s || p.startsWith(s + "/"))) return "app";
  // Root path is rendered on both client (marketing) and app (feed) hosts.
  if (p === "/") return "shared";
  return "app";
}

/** Build an absolute URL on the target audience's production host, preserving
 *  path + search + hash. Returns null when we shouldn't redirect. */
export function buildAudienceUrl(target: Audience, pathname: string, search = "", hash = ""): string {
  const host = AUDIENCE_HOSTS[target];
  return `https://${host}${pathname}${search}${hash}`;
}
