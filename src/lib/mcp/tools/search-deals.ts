import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_deals",
  title: "Search deals",
  description:
    "Search published deals across TavasAtlaides by keyword, category slug or city. Returns deal title, discount, dates and store.",
  inputSchema: {
    query: z.string().optional().describe("Free-text match against the deal title."),
    category: z.string().optional().describe("Category slug, e.g. 'veikali'."),
    city: z.string().optional().describe("City name, e.g. 'Rīga'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, city, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("ads")
      .select(
        "id, title, title_lv, title_en, title_ru, category, discount_pct, price_original, price_sale, starts_at, ends_at, status, stores!inner(id, name, city, slug)",
      )
      .eq("status", "published")
      .eq("is_hidden", false)
      .is("deleted_at", null)
      .order("starts_at", { ascending: false })
      .limit(limit ?? 20);

    if (query) q = q.ilike("title", `%${query}%`);
    if (category) q = q.eq("category", category);
    if (city) q = q.eq("stores.city", city);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { deals: data ?? [] },
    };
  },
});
