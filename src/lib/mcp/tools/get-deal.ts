import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_deal",
  title: "Get deal",
  description: "Fetch one deal by id, including its store details, prices and validity dates.",
  inputSchema: { id: z.string().describe("Deal (ad) id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("ads")
      .select(
        "id, title, title_lv, title_en, title_ru, description, description_lv, description_en, description_ru, category, discount_pct, price_original, price_sale, starts_at, ends_at, status, is_hidden, cover_image_url, stores(id, name, slug, city, address, phone, website)",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No deal found with id ${id}` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { deal: data } };
  },
});
