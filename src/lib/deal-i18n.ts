import type { Lang } from "@/i18n/dictionaries";

type Translatable = {
  title?: string | null;
  description?: string | null;
  title_lv?: string | null;
  title_en?: string | null;
  title_ru?: string | null;
  description_lv?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
};

/**
 * Resolve the deal title for the active language.
 * Legacy source fields are Latvian only. Never substitute them for EN/RU.
 */
export function localizedDealTitle(deal: Translatable, lang: Lang): string {
  const per = lang === "en" ? deal.title_en : lang === "ru" ? deal.title_ru : deal.title_lv;
  const trimmed = per?.trim();
  if (trimmed) return trimmed;
  return lang === "lv" ? deal.title?.trim() || "" : "";
}

export function localizedDealDescription(deal: Translatable, lang: Lang): string | null {
  const per =
    lang === "en" ? deal.description_en : lang === "ru" ? deal.description_ru : deal.description_lv;
  const trimmed = per?.trim();
  if (trimmed) return trimmed;
  return lang === "lv" ? deal.description?.trim() || null : null;
}
