/**
 * Pure, framework-free helpers describing what the role-based Profile page
 * exposes to each audience. The Profile route renders directly from these
 * lists, and the unit tests in `profile-visibility.test.ts` assert that
 * CLIENT and PARTNER (and ADMIN) see exactly their correct sections.
 *
 * Keep this module logic-only — no React, no Supabase, no i18n. That's
 * what makes it testable without a DOM.
 */

export type ProfileRole = "client" | "partner" | "admin";

export interface ProfileViewerInput {
  /** Signed-in user id, or null when not authenticated. */
  userId: string | null;
  /** Role rows from `public.user_roles` for this user. */
  roles: string[];
  /** True when the user owns a `stores` row (implicit partner). */
  hasStore: boolean;
}

export interface ProfileSection {
  id: string;
  title: string;
}

export interface ProfileTile {
  id: string;
  to: string;
  label: string;
}

export interface ProfileVisibility {
  /** Effective role used to render the Profile hub. */
  role: ProfileRole;
  /** Top-level sections shown in render order. */
  sections: ProfileSection[];
  /** Business tiles (partner/admin only). */
  businessTiles: ProfileTile[];
  /** Activity row keys shown to every signed-in user. */
  activityRows: string[];
  /** Preference accordion keys. */
  preferenceRows: string[];
  /** True when the partner badge should appear next to the user name. */
  showPartnerBadge: boolean;
  /** True when account-destructive actions (logout / deactivate / delete) render. */
  showAccountActions: boolean;
}

const SECTION_ACTIVITY: ProfileSection = { id: "activity", title: "Activity" };
const SECTION_PREFERENCES: ProfileSection = { id: "preferences", title: "Preferences" };
const SECTION_SUPPORT: ProfileSection = { id: "support", title: "Support" };
const SECTION_ACCOUNT: ProfileSection = { id: "account", title: "Account" };
const SECTION_BUSINESS: ProfileSection = { id: "business", title: "Business" };

export const PARTNER_TILES: ProfileTile[] = [
  { id: "dashboard", to: "/profile/dashboard", label: "Dashboard" },
  { id: "ads",       to: "/profile/ads",       label: "My deals" },
  { id: "ads-new",   to: "/profile/ads/new",   label: "New deal" },
  { id: "store",     to: "/profile/store",     label: "Store" },
  { id: "analytics", to: "/profile/analytics", label: "Performance" },
  { id: "billing",   to: "/profile/billing",   label: "Billing" },
];

export const CLIENT_ACTIVITY = ["favorites", "notifications", "nearby"] as const;
export const PARTNER_ACTIVITY = ["favorites", "notifications", "nearby"] as const;
export const PREFERENCE_ROWS = ["notifications", "language-theme"] as const;

export function resolveProfileRole(input: ProfileViewerInput): ProfileRole {
  if (!input.userId) return "client";
  if (input.roles.includes("admin")) return "admin";
  if (input.roles.includes("partner") || input.hasStore) return "partner";
  return "client";
}

export function getProfileVisibility(input: ProfileViewerInput): ProfileVisibility {
  const role = resolveProfileRole(input);
  const isPartnerLike = role === "partner" || role === "admin";

  const sections: ProfileSection[] = [];
  if (isPartnerLike) sections.push(SECTION_BUSINESS);
  sections.push(SECTION_ACTIVITY, SECTION_PREFERENCES, SECTION_SUPPORT, SECTION_ACCOUNT);

  return {
    role,
    sections,
    businessTiles: isPartnerLike ? PARTNER_TILES : [],
    activityRows: [...(isPartnerLike ? PARTNER_ACTIVITY : CLIENT_ACTIVITY)],
    preferenceRows: [...PREFERENCE_ROWS],
    showPartnerBadge: isPartnerLike,
    showAccountActions: !!input.userId,
  };
}
