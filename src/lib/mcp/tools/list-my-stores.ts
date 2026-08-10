import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_stores",
  title: "List my stores",
  description: "List the stores (businesses) owned by the signed-in user.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("stores")
      .select(
        "id, name, slug, category, city, address, phone, contact_email, website, is_verified, is_hidden, partner_status, subscription_plan, created_at",
      )
      .eq("owner_id", ctx.getUserId() ?? "")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { stores: data ?? [] },
    };
  },
});
