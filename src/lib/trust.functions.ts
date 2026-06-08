import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ReportSchema = z.object({
  adId: z.string().uuid(),
  reason: z.enum(["spam", "scam", "expired", "wrong_info", "inappropriate", "duplicate", "other"]),
  note: z.string().max(1000).optional(),
  fingerprint: z.string().min(8).max(128),
});

/** Anonymous: submit a report on a deal. Soft-deduped (one open report per fingerprint+ad). */
export const submitDealReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Soft dedupe
    const { data: existing } = await supabaseAdmin
      .from("deal_reports")
      .select("id")
      .eq("ad_id", data.adId)
      .eq("reporter_fingerprint", data.fingerprint)
      .eq("status", "open")
      .maybeSingle();
    if (existing) return { ok: true, duplicate: true };
    const { error } = await supabaseAdmin.from("deal_reports").insert({
      ad_id: data.adId,
      reason: data.reason,
      note: data.note ?? null,
      reporter_fingerprint: data.fingerprint,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list reports with deal + store context. */
export const listDealReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["open", "resolved", "dismissed"]).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roles) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("deal_reports")
      .select("id, ad_id, reason, note, status, created_at, ads(title, store_id, stores(name, owner_id))")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { reports: rows ?? [] };
  });

/** Admin: resolve/dismiss a report and recompute the partner's trust score. */
export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["resolved", "dismissed"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roles) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("deal_reports")
      .update({ status: data.action, resolved_by: context.userId, resolved_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("ad_id, ads(store_id, stores(owner_id))")
      .single();
    if (error) throw new Error(error.message);
    const ownerId = (row as any)?.ads?.stores?.owner_id as string | undefined;
    if (ownerId) {
      await supabaseAdmin.rpc("recalculate_trust_score", { _user_id: ownerId });
    }
    return { ok: true };
  });

/** Admin: verify or block a store; recomputes trust. */
export const setStoreTrust = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      storeId: z.string().uuid(),
      isVerified: z.boolean().optional(),
      isBlocked: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roles) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, boolean> = {};
    if (data.isVerified !== undefined) patch.is_verified = data.isVerified;
    if (data.isBlocked !== undefined) patch.is_blocked = data.isBlocked;
    const { data: store, error } = await supabaseAdmin
      .from("stores").update(patch).eq("id", data.storeId).select("owner_id").single();
    if (error) throw new Error(error.message);
    if (store?.owner_id) {
      await supabaseAdmin.rpc("recalculate_trust_score", { _user_id: store.owner_id });
    }
    return { ok: true };
  });

/** Owner: get my trust score. */
export const getMyTrustScore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure a row exists
    await supabaseAdmin.rpc("recalculate_trust_score", { _user_id: context.userId });
    const { data } = await supabaseAdmin
      .from("partner_trust_scores").select("*").eq("user_id", context.userId).maybeSingle();
    return { trust: data };
  });
