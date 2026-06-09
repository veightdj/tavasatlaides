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
import { geocodeAddress } from "@/lib/geocode.functions";
import { AddressAutocomplete } from "@/components/merchant/AddressAutocomplete";
import { HoursEditor } from "@/components/merchant/HoursEditor";
import { DEFAULT_HOURS, parseHours, type Hours } from "@/lib/hours";

export const Route = createFileRoute("/_authenticated/profile/store")({
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
    postal_code: "", country: "Latvia",
    phone: "", website: "", description: "", logo_url: "", cover_image_url: "",
  });
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  // lat/lng captured directly from address autocomplete (skips server geocode)
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name, category: store.category, address: store.address, city: store.city,
        postal_code: (store as any).postal_code ?? "",
        country: (store as any).country ?? "Latvia",
        phone: store.phone ?? "", website: store.website ?? "",
        description: store.description ?? "", logo_url: store.logo_url ?? "",
        cover_image_url: (store as any).cover_image_url ?? "",
      });
      setHours(parseHours((store as any).hours_json) ?? DEFAULT_HOURS);
    }
  }, [store]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authed");

      // Geocode whenever the address-related fields are present
      let lat: number | null = (store as any)?.lat ?? null;
      let lng: number | null = (store as any)?.lng ?? null;
      let geocodeStatus: "OK" | "FAILED" | "SKIPPED" = "SKIPPED";

      if (pickedCoords) {
        lat = pickedCoords.lat;
        lng = pickedCoords.lng;
        geocodeStatus = "OK";
      } else if (form.address) {
        try {
          const res = await geocodeAddress({
            data: {
              address: form.address,
              city: form.city,
              postalCode: form.postal_code || undefined,
              country: form.country || "Latvia",
            },
          });
          if (res.lat != null && res.lng != null) {
            lat = res.lat; lng = res.lng; geocodeStatus = "OK";
          } else {
            geocodeStatus = "FAILED";
          }
        } catch {
          geocodeStatus = "FAILED";
        }
      }

      const payload = {
        ...form,
        lat, lng,
        hours_json: hours as any,
        owner_id: user.id,
        slug: store?.slug ?? `${slugify(form.name)}-${Date.now().toString(36)}`,
      };
      const { error } = store
        ? await supabase.from("stores").update(payload).eq("id", store.id)
        : await supabase.from("stores").insert(payload);
      if (error) throw error;
      return geocodeStatus;
    },
    onSuccess: (geocodeStatus) => {
      toast.success(t.common.saved);
      if (geocodeStatus === "OK") toast.success(t.merchant.geocoded);
      if (geocodeStatus === "FAILED") toast.warning(t.merchant.geocodeFailed);
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
      <Field label={t.merchant.address}>
        <AddressAutocomplete
          value={form.address}
          onChange={(v) => { setForm((f) => ({ ...f, address: v })); setPickedCoords(null); }}
          onPick={(p) => {
            setForm((f) => ({
              ...f,
              address: p.address,
              city: p.city && (p.city === "Riga" || p.city === "Rīga") ? "Riga"
                : p.city && (p.city === "Jurmala" || p.city === "Jūrmala") ? "Jurmala"
                : f.city,
              postal_code: p.postalCode ?? f.postal_code,
              country: p.country ?? f.country,
            }));
            setPickedCoords({ lat: p.lat, lng: p.lng });
          }}
          placeholder="Brīvības iela 155, Rīga"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.merchant.city}>
          <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c === "Riga" ? t.city.riga : t.city.jurmala}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t.merchant.postalCode}>
          <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="LV-1012" />
        </Field>
      </div>
      <Field label={t.merchant.country}><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Latvia" /></Field>
      <Field label={t.merchant.phone}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label={t.merchant.website}><Input type="url" placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
      <Field label={t.merchant.description}><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

      <HoursEditor value={hours} onChange={setHours} />



      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? t.common.loading : t.merchant.save}
      </Button>
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
