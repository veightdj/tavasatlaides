import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_deal",
  title: "Update deal",
  description:
    "Update an existing deal owned by the signed-in user: titles, pricing, dates, publish status or visibility.",
  inputSchema: {
    id: z.string().describe("Deal (ad) id."),
    title_lv: z.string().optional().describe("Latvian title."),
    title_en: z.string().optional().describe("English title."),
    title_ru: z.string().optional().describe("Russian title."),
    description_lv: z.string().optional().describe("Latvian description."),
    discount_pct: z.number().optional().describe("Discount percentage, 1-100."),
    price_original: z.number().optional().describe("Original price in EUR."),
    price_sale: z.number().optional().describe("Sale price in EUR."),
    starts_at: z.string().optional().describe("ISO start timestamp."),
    ends_at: z.string().optional().describe("ISO end timestamp."),
    status: z.string().optional().describe("Deal status, e.g. 'draft' or 'published'."),
    is_hidden: z.boolean().optional().describe("Hide the deal from public listings."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id, title_lv, ...rest }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) patch[key] = value;
    }
    if (title_lv !== undefined) {
      patch.title_lv = title_lv;
      patch.title = title_lv;
    }
    if (rest.description_lv !== undefined) patch.description = rest.description_lv;
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "No fields to update" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("ads")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id, title, status, is_hidden, starts_at, ends_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: `Deal ${id} not found or not owned by you.` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { deal: data } };
  },
});
