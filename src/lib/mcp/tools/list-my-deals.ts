import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_deals",
  title: "List my deals",
  description: "List deals belonging to a store owned by the signed-in user, newest first.",
  inputSchema: {
    store_id: z.string().describe("Store id owned by the signed-in user."),
    status: z.string().optional().describe("Optional status filter, e.g. 'published' or 'draft'."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ store_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("ads")
      .select(
        "id, title, title_lv, category, discount_pct, price_original, price_sale, starts_at, ends_at, status, is_hidden, updated_at",
      )
      .eq("store_id", store_id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { deals: data ?? [] },
    };
  },
});
