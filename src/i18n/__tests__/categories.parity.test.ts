import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY;

const skip = !url || !key;

describe.skipIf(skip)("categories table — full localization", () => {
  it("every category row has non-empty name_lv, name_en, name_ru", async () => {
    const supabase = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data, error } = await supabase
      .from("categories")
      .select("slug,name_lv,name_en,name_ru");
    expect(error).toBeNull();
    const bad: string[] = [];
    for (const row of data ?? []) {
      const r = row as { slug: string; name_lv: string | null; name_en: string | null; name_ru: string | null };
      if (!r.name_lv?.trim()) bad.push(`${r.slug} — missing name_lv`);
      if (!r.name_en?.trim()) bad.push(`${r.slug} — missing name_en`);
      if (!r.name_ru?.trim()) bad.push(`${r.slug} — missing name_ru`);
    }
    expect(bad).toEqual([]);
  });
});
