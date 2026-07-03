import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
 * No cross-language fallback: if a translation is missing we return the slug,
 * never another language's text.
 */
export function localizedCategoryName(c: Pick<Category, "slug" | "name_lv" | "name_en" | "name_ru">, locale: Locale): string {
  const value = locale === "lv" ? c.name_lv : locale === "en" ? c.name_en : c.name_ru;
  return (value ?? "").trim() || c.slug;
}

const CATEGORY_COLS = "id,name,name_lv,name_en,name_ru,slug,icon,sort_order,active,color";

const FALLBACK_CATEGORIES: Category[] = CATEGORY_SLUGS.map((slug, i) => ({
  id: slug,
  name: slug,
  name_lv: slug,
  name_en: slug,
  name_ru: slug,
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
