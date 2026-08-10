import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_deal",
  title: "Create deal",
  description:
    "Create a new deal (ad) for a store owned by the signed-in user. Created as a draft unless publish is true.",
  inputSchema: {
    store_id: z.string().describe("Store id owned by the signed-in user."),
    title_lv: z.string().describe("Latvian title (required)."),
    title_en: z.string().optional().describe("English title."),
    title_ru: z.string().optional().describe("Russian title."),
    description_lv: z.string().optional().describe("Latvian description."),
    category: z.string().describe("Category slug, e.g. 'veikali'."),
    discount_pct: z.number().optional().describe("Discount percentage, 1-100."),
    price_original: z.number().optional().describe("Original price in EUR."),
    price_sale: z.number().optional().describe("Sale price in EUR."),
    starts_at: z.string().optional().describe("ISO start timestamp; defaults to now."),
    ends_at: z.string().optional().describe("ISO end timestamp."),
    publish: z.boolean().optional().describe("Publish immediately instead of saving as draft."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("ads")
      .insert({
        store_id: input.store_id,
        title: input.title_lv,
        title_lv: input.title_lv,
        title_en: input.title_en ?? null,
        title_ru: input.title_ru ?? null,
        description: input.description_lv ?? null,
        description_lv: input.description_lv ?? null,
        category: input.category,
        discount_pct: input.discount_pct ?? null,
        price_original: input.price_original ?? null,
        price_sale: input.price_sale ?? null,
        starts_at: input.starts_at ?? new Date().toISOString(),
        ends_at: input.ends_at ?? null,
        status: input.publish ? "published" : "draft",
      })
      .select("id, title, status, starts_at, ends_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { deal: data } };
  },
});
