import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_URL =
  process.env.SITE_URL || "https://tavasatlaides.lv";

async function sendActivationEmail(args: {
  email: string;
  businessName: string;
}): Promise<{ sent: boolean; error?: string; action_link?: string | null }> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { sendTransactional } = await import("@/lib/email/send.server");

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: args.email,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    });
    if (error) return { sent: false, error: error.message };
    const action_link = link?.properties?.action_link ?? null;
    if (!action_link) return { sent: false, error: "no_action_link" };

    await sendTransactional({
      templateName: "partner-activation",
      recipientEmail: args.email,
      idempotencyKey: `partner-activation-${args.email}-${Date.now()}`,
      templateData: {
        businessName: args.businessName,
        activationUrl: action_link,
        siteName: "Tavasatlaides",
        siteUrl: SITE_URL,
      },
    });
    return { sent: true, action_link };
  } catch (e: any) {
    return { sent: false, error: e?.message ?? "send_failed" };
  }
}


type Plan = "bronze" | "silver" | "gold";
type Status =
  | "pending_activation"
  | "active"
  | "managed_by_admin"
  | "suspended"
  | "expired";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "business";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin only");
}

const emptyToNull = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.any(),
);
const optStr = (max = 255) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

const CreateInput = z.object({
  name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(255),
  phone: optStr(50),
  category: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(255),
  website: optStr(255),
  description: optStr(2000),
  logo_url: optStr(500),
  subscription_plan: z.enum(["bronze", "silver", "gold"]).default("bronze"),
});
void emptyToNull;

export const createBusinessWithPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create auth user (random password; admin will trigger reset email later)
    const tempPassword =
      crypto.randomUUID().replace(/-/g, "") + "Aa1!";
    const { data: userRes, error: userErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.contact_email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: { full_name: data.name, created_by_admin: true },
      });
    if (userErr || !userRes.user) {
      throw new Error(`Could not create partner user: ${userErr?.message ?? "unknown"}`);
    }
    const partnerUserId = userRes.user.id;

    // 2. Assign partner role
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: partnerUserId, role: "partner" });
    if (roleErr && !roleErr.message.includes("duplicate")) {
      // Rollback user
      await supabaseAdmin.auth.admin.deleteUser(partnerUserId);
      throw new Error(`Could not assign partner role: ${roleErr.message}`);
    }

    // 3. Create unique slug
    const base = slugify(data.name);
    let slug = base;
    for (let i = 0; i < 20; i++) {
      const { data: ex } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!ex) break;
      slug = `${base}-${Math.floor(Math.random() * 9999)}`;
    }

    // 4. Create store
    const { data: store, error: storeErr } = await supabaseAdmin
      .from("stores")
      .insert({
        owner_id: partnerUserId,
        name: data.name,
        slug,
        category: data.category,
        city: data.city,
        address: data.address,
        phone: data.phone || null,
        website: data.website || null,
        description: data.description || null,
        logo_url: data.logo_url || null,
        contact_email: data.contact_email,
        subscription_plan: data.subscription_plan,
        partner_status: "pending_activation",
      } as any)
      .select("id, slug")
      .single();
    if (storeErr || !store) {
      await supabaseAdmin.auth.admin.deleteUser(partnerUserId);
      throw new Error(`Could not create store: ${storeErr?.message ?? "unknown"}`);
    }

    // 5. Audit
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: context.userId,
      action: "create_business",
      target_user_id: partnerUserId,
      target_store_id: store.id,
      payload: { name: data.name, plan: data.subscription_plan },
    });

    // 6. Send branded activation email (non-fatal if it fails)
    const emailResult = await sendActivationEmail({
      email: data.contact_email,
      businessName: data.name,
    });
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: context.userId,
      action: emailResult.sent
        ? "send_activation"
        : "send_activation_failed",
      target_user_id: partnerUserId,
      target_store_id: store.id,
      payload: { email: data.contact_email, error: emailResult.error ?? null },
    });

    return {
      store_id: store.id,
      partner_user_id: partnerUserId,
      slug: store.slug,
      activation_email_sent: emailResult.sent,
      activation_email_error: emailResult.error ?? null,
    };
  });


const UpdateInput = z.object({
  id: z.string().uuid(),
  patch: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    contact_email: z.string().trim().email().max(255).optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    category: z.string().trim().min(1).max(80).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    address: z.string().trim().min(1).max(255).optional(),
    website: z.string().trim().max(255).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    logo_url: z.string().trim().max(500).nullable().optional(),
  }),
});

export const updateBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("stores")
      .update(data.patch as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setBusinessPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), plan: z.enum(["bronze", "silver", "gold"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("stores")
      .update({ subscription_plan: data.plan as Plan } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_logs").insert({
      admin_id: context.userId,
      action: "set_plan",
      target_store_id: data.id,
      payload: { plan: data.plan },
    });
    return { ok: true };
  });

export const setBusinessStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "pending_activation",
          "active",
          "managed_by_admin",
          "suspended",
          "expired",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("stores")
      .update({ partner_status: data.status as Status } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_logs").insert({
      admin_id: context.userId,
      action: "set_status",
      target_store_id: data.id,
      payload: { status: data.status },
    });
    return { ok: true };
  });

export const sendPartnerActivationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: store } = await context.supabase
      .from("stores")
      .select("id, contact_email, owner_id, name")
      .eq("id", data.id)
      .single();
    if (!store?.contact_email) throw new Error("Store has no contact email");

    const result = await sendActivationEmail({
      email: store.contact_email,
      businessName: store.name,
    });

    await context.supabase.from("admin_audit_logs").insert({
      admin_id: context.userId,
      action: result.sent ? "send_activation" : "send_activation_failed",
      target_store_id: store.id,
      target_user_id: store.owner_id,
      payload: { email: store.contact_email, error: result.error ?? null },
    });

    if (!result.sent) throw new Error(result.error || "Failed to send activation email");
    return { ok: true, action_link: result.action_link ?? null };
  });


export const resetPartnerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await context.supabase
      .from("stores")
      .select("id, contact_email, owner_id")
      .eq("id", data.id)
      .single();
    if (!store?.contact_email) throw new Error("Store has no contact email");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: store.contact_email,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_logs").insert({
      admin_id: context.userId,
      action: "reset_password",
      target_store_id: store.id,
      target_user_id: store.owner_id,
      payload: {},
    });
    return { ok: true, action_link: link?.properties?.action_link ?? null };
  });

export const deleteBusinessAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: store } = await context.supabase
      .from("stores")
      .select("id, owner_id, name")
      .eq("id", data.id)
      .single();
    if (!store) throw new Error("Store not found");

    // Delete store first (cascades ads, gallery)
    const { error: dErr } = await supabaseAdmin
      .from("stores")
      .delete()
      .eq("id", store.id);
    if (dErr) throw new Error(dErr.message);

    // Then delete auth user
    await supabaseAdmin.auth.admin.deleteUser(store.owner_id);

    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: context.userId,
      action: "delete_business",
      target_store_id: store.id,
      target_user_id: store.owner_id,
      payload: { name: store.name },
    });

    return { ok: true };
  });

export const logImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ store_id: z.string().uuid(), event: z.enum(["start", "stop"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: store } = await context.supabase
      .from("stores")
      .select("id, owner_id, name")
      .eq("id", data.store_id)
      .single();
    if (!store) throw new Error("Store not found");
    await context.supabase.from("admin_audit_logs").insert({
      admin_id: context.userId,
      action: data.event === "start" ? "impersonation_start" : "impersonation_stop",
      target_store_id: store.id,
      target_user_id: store.owner_id,
      payload: { name: store.name },
    });
    return { ok: true, owner_id: store.owner_id };
  });
