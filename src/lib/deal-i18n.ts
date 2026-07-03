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
 * LV is mandatory in the editor, so it is the guaranteed fallback for EN/RU
 * when a partner has not translated their deal yet.
 */
export function localizedDealTitle(deal: Translatable, lang: Lang): string {
  const per = lang === "en" ? deal.title_en : lang === "ru" ? deal.title_ru : deal.title_lv;
  const trimmed = per?.trim();
  if (trimmed) return trimmed;
  return (deal.title_lv?.trim() || deal.title?.trim() || "") as string;
}

export function localizedDealDescription(deal: Translatable, lang: Lang): string | null {
  const per =
    lang === "en" ? deal.description_en : lang === "ru" ? deal.description_ru : deal.description_lv;
  const trimmed = per?.trim();
  if (trimmed) return trimmed;
  const fallback = deal.description_lv?.trim() || deal.description?.trim();
  return fallback || null;
}
