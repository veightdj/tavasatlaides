import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Build the OneSignal tag payload for the current user from Supabase.
 * Used by the client to call `OneSignal.User.addTags(...)` after login.
 */
export const getOneSignalTagsForCurrentUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: roleRows }, { data: prefs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("notification_preferences")
        .select("categories,enabled,nearby_deals")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    const role = roles.includes("admin")
      ? "admin"
      : roles.includes("partner")
        ? "partner"
        : "client";

    const categories: string[] = Array.isArray(prefs?.categories) ? prefs!.categories : [];

    return {
      user_id: userId,
      role,
      categories: categories.join(","),
      notifications_enabled: prefs?.enabled === false ? "false" : "true",
      nearby_deals: prefs?.nearby_deals === false ? "false" : "true",
    } as Record<string, string>;
  });
