import { describe, expect, it } from "vitest";
import { localizedDealTitle, localizedDealDescription } from "../../lib/deal-i18n";
import { localizedCategoryName, FALLBACK_CATEGORIES } from "../../lib/categories";

describe("strict locale isolation", () => {
  it("never displays Latvian deal content for untranslated English or Russian", () => {
    const deal = { title: "Latviešu virsraksts", description: "Latviešu apraksts", title_lv: "Akcija", description_lv: "Apraksts", title_en: " ", description_ru: " " };
    expect(localizedDealTitle(deal, "en")).toBe("");
    expect(localizedDealTitle(deal, "ru")).toBe("");
    expect(localizedDealDescription(deal, "en")).toBeNull();
    expect(localizedDealDescription(deal, "ru")).toBeNull();
    expect(localizedDealTitle(deal, "lv")).toBe("Akcija");
  });
  it("keeps source fields available only in Latvian", () => {
    expect(localizedDealTitle({ title: "Akcija" }, "lv")).toBe("Akcija");
    expect(localizedDealDescription({ description: "Apraksts" }, "lv")).toBe("Apraksts");
  });
  it("uses a same-language category placeholder rather than a slug", () => {
    const category = { slug: "food", name_lv: null, name_en: " ", name_ru: null };
    expect(localizedCategoryName(category, "lv")).toBe("Kategorija");
    expect(localizedCategoryName(category, "en")).toBe("Category");
    expect(localizedCategoryName(category, "ru")).toBe("Категория");
  });
  it("translates fallback categories while retaining the same IDs", () => {
    const food = FALLBACK_CATEGORIES.find(c => c.id === "food");
    expect(food?.name_lv).toBe("Ēdiens");
    expect(food?.name_en).toBe("Food");
    expect(food?.name_ru).toBe("Еда");
  });
});