import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/use-i18n";
import { CATEGORY_SLUGS, CITIES, slugify } from "@/lib/categories";
import { LogoUploader } from "@/components/merchant/LogoUploader";


export const Route = createFileRoute("/_authenticated/store")({
  component: StoreEditor,
});

function StoreEditor() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: store, isLoading } = useQuery({
    queryKey: ["my-store-edit", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    name: "", category: "food", address: "", city: "Riga",
    phone: "", website: "", description: "", logo_url: "", cover_image_url: "",
  });

  useEffect(() => {
    if (store) setForm({
      name: store.name, category: store.category, address: store.address, city: store.city,
      phone: store.phone ?? "", website: store.website ?? "",
      description: store.description ?? "", logo_url: store.logo_url ?? "",
      cover_image_url: (store as any).cover_image_url ?? "",
    });
  }, [store]);


  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authed");
      const payload = {
        ...form,
        owner_id: user.id,
        slug: store?.slug ?? `${slugify(form.name)}-${Date.now().toString(36)}`,
      };
      const { error } = store
        ? await supabase.from("stores").update(payload).eq("id", store.id)
        : await supabase.from("stores").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.common.saved);
      qc.invalidateQueries({ queryKey: ["my-store", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-store-edit", user?.id] });
      if (!store) navigate({ to: "/dashboard" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div>{t.common.loading}</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.merchant.store}</h1>

      <div className="space-y-2">
        <Label>{t.merchant.logo}</Label>
        {user && (
          <LogoUploader
            value={form.logo_url}
            userId={user.id}
            prefix="logo"
            shape="round"
            onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Cover image</Label>
        {user && (
          <LogoUploader
            value={form.cover_image_url}
            userId={user.id}
            prefix="cover"
            shape="wide"
            onChange={(url) => setForm((f) => ({ ...f, cover_image_url: url }))}
          />
        )}
      </div>



      <Field label={t.merchant.storeName}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
      <Field label={t.merchant.category}>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORY_SLUGS.map((c) => <SelectItem key={c} value={c}>{(t.cat as any)[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t.merchant.city}>
        <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CITIES.map((c) => <SelectItem key={c} value={c}>{c === "Riga" ? t.city.riga : t.city.jurmala}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t.merchant.address}><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></Field>
      <Field label={t.merchant.phone}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label={t.merchant.website}><Input type="url" placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
      <Field label={t.merchant.description}><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>{t.merchant.save}</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
