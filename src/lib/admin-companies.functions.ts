import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "company";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin only");
}

const optStr = (max = 255) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

const BaseFields = {
  name: z.string().trim().min(2).max(120),
  description: optStr(2000),
  category: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(255),
  phone: optStr(50),
  contact_email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().email().max(255).nullable().optional(),
  ),
  website: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().url().max(255).nullable().optional(),
  ),
  logo_url: optStr(500),
  is_hidden: z.boolean().optional(),
} as const;

const CreateInput = z.object(BaseFields);
const UpdateInput = z.object({ id: z.string().uuid(), patch: z.object(BaseFields).partial() });

async function uniqueSlug(supabase: any, baseName: string, ignoreId?: string) {
  const base = slugify(baseName);
  let slug = base;
  for (let i = 0; i < 25; i++) {
    let q = supabase.from("stores").select("id").eq("slug", slug).limit(1);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    slug = `${base}-${Math.floor(Math.random() * 9999)}`;
  }
  return `${base}-${Date.now()}`;
}

async function assertNoDuplicateName(
  supabase: any,
  name: string,
  ignoreId?: string,
) {
  let q = supabase
    .from("stores")
    .select("id")
    .ilike("name", name.trim())
    .is("deleted_at", null)
    .limit(1);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data } = await q.maybeSingle();
  if (data) throw new Error("A company with this name already exists");
}

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertNoDuplicateName(context.supabase, data.name);
    const slug = await uniqueSlug(context.supabase, data.name);
    const { data: row, error } = await context.supabase
      .from("stores")
      .insert({
        name: data.name,
        slug,
        category: data.category,
        city: data.city,
        address: data.address,
        phone: data.phone ?? null,
        website: data.website ?? null,
        description: data.description ?? null,
        logo_url: data.logo_url ?? null,
        contact_email: data.contact_email ?? null,
        is_hidden: data.is_hidden ?? false,
      } as any)
      .select("id, slug")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create company");
    return { id: row.id, slug: row.slug };
  });

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.patch.name) {
      await assertNoDuplicateName(context.supabase, data.patch.name, data.id);
    }
    const patch: Record<string, any> = { ...data.patch };
    if (data.patch.name) {
      patch.slug = await uniqueSlug(context.supabase, data.patch.name, data.id);
    }
    const { error } = await context.supabase
      .from("stores")
      .update(patch as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
