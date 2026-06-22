// Computes a partner profile completeness score (0-100) based on filled fields.
// Used in the partner dashboard and the store editor to nudge owners toward
// a fully published profile.

type SocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
};

export type ProfileLike = {
  name?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  contact_email?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  hours_json?: unknown;
  social_links?: SocialLinks | null | Record<string, unknown>;
};

const FIELDS: Array<{ key: keyof ProfileLike; weight: number; label: string }> = [
  { key: "name", weight: 1, label: "Business name" },
  { key: "category", weight: 1, label: "Category" },
  { key: "address", weight: 1, label: "Address" },
  { key: "city", weight: 1, label: "City" },
  { key: "description", weight: 1, label: "Description" },
  { key: "logo_url", weight: 1, label: "Logo" },
  { key: "cover_image_url", weight: 1, label: "Cover image" },
  { key: "phone", weight: 1, label: "Phone" },
  { key: "website", weight: 1, label: "Website" },
  { key: "contact_email", weight: 1, label: "Contact email" },
  { key: "hours_json", weight: 1, label: "Business hours" },
  { key: "social_links", weight: 1, label: "Social media link" },
];

function hasValue(key: keyof ProfileLike, v: unknown): boolean {
  if (v == null) return false;
  if (key === "hours_json") return typeof v === "object" && Object.keys(v as object).length > 0;
  if (key === "social_links") {
    if (typeof v !== "object") return false;
    return Object.values(v as Record<string, unknown>).some(
      (s) => typeof s === "string" && s.trim().length > 0
    );
  }
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

export function computeProfileCompleteness(profile: ProfileLike | null | undefined): {
  percent: number;
  filled: number;
  total: number;
  missing: string[];
} {
  if (!profile) return { percent: 0, filled: 0, total: FIELDS.length, missing: FIELDS.map((f) => f.label) };
  let filled = 0;
  const missing: string[] = [];
  for (const f of FIELDS) {
    if (hasValue(f.key, profile[f.key])) filled += f.weight;
    else missing.push(f.label);
  }
  const total = FIELDS.reduce((s, f) => s + f.weight, 0);
  return { percent: Math.round((filled / total) * 100), filled, total, missing };
}
