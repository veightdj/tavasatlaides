export const CATEGORY_SLUGS = [
  "food",
  "grocery",
  "fashion",
  "beauty",
  "home",
  "services",
  "entertainment",
  "health",
  "other",
] as const;

export type CategorySlug = typeof CATEGORY_SLUGS[number];

export const CITIES = ["Riga", "Jurmala"] as const;
export type City = typeof CITIES[number];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}
