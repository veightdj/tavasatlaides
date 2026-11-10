import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dict } from "@/i18n/dictionaries";

// Fallback static list — kept for typing & i18n keys. Source of truth is the
// `categories` table managed by admins.
export const CATEGORY_SLUGS = [
  "food",
  "auto",
  "beauty",
  "electronics",
  "home",
  "kids",
  "cafes",
  "events",
] as const;

export type CategorySlug = typeof CATEGORY_SLUGS[number];

export const CITIES = ["Riga", "Jurmala", "Liepaja", "Daugavpils", "Jelgava", "Valmiera", "Ventspils"] as const;
export type City = typeof CITIES[number];

export const CITY_CENTERS: Record<City, { lat: number; lng: number }> = {
  Riga: { lat: 56.9496, lng: 24.1052 },
  Jurmala: { lat: 56.9720, lng: 23.7893 },
  Liepaja: { lat: 56.5053, lng: 21.0108 },
  Daugavpils: { lat: 55.8747, lng: 26.5362 },
  Jelgava: { lat: 56.6511, lng: 23.7129 },
  Valmiera: { lat: 57.5385, lng: 25.4264 },
  Ventspils: { lat: 57.3939, lng: 21.5647 },
};

export function localizedCityName(city: string, locale: Locale): string {
  const key = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const names = dict[locale].city as unknown as Record<string, string>;
  return names[key] ?? city;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export type Locale = "lv" | "en" | "ru";

export type Category = {
  id: string;
  name: string;
  name_lv: string | null;
  name_en: string | null;
  name_ru: string | null;
  slug: string;
  icon: string;
  sort_order: number;
  active: boolean;
  color: string;
};

/**
 * Strict per-locale name resolver.
 * No cross-language fallback: missing labels use the selected locale's placeholder.
 */
export function localizedCategoryName(c: Pick<Category, "slug" | "name_lv" | "name_en" | "name_ru">, locale: Locale): string {
  const value = locale === "lv" ? c.name_lv : locale === "en" ? c.name_en : c.name_ru;
  return (value ?? "").trim() || dict[locale].deals.category;
}

const CATEGORY_COLS = "id,name,name_lv,name_en,name_ru,slug,icon,sort_order,active,color";

export const FALLBACK_CATEGORIES: Category[] = CATEGORY_SLUGS.map((slug, i) => ({
  id: slug,
  name: dict.lv.cat[slug],
  name_lv: dict.lv.cat[slug],
  name_en: dict.en.cat[slug],
  name_ru: dict.ru.cat[slug],
  slug,
  icon: "Tag",
  sort_order: (i + 1) * 10,
  active: true,
  color: "oklch(0.6 0.12 245)",
}));

/** Active categories, ordered by sort_order. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories", "active"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select(CATEGORY_COLS)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error || !data || data.length === 0) return FALLBACK_CATEGORIES;
      return data as Category[];
    },
    staleTime: 60_000,
  });
}

/** All categories (admin). */
export function useAllCategories() {
  return useQuery({
    queryKey: ["categories", "all"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select(CATEGORY_COLS)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}
