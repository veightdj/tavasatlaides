import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Eye, EyeOff, Instagram, Facebook, Youtube, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/use-i18n";
import { CITIES, slugify, useCategories } from "@/lib/categories";
import { LogoUploader } from "@/components/merchant/LogoUploader";
import { StoreGalleryManager } from "@/components/merchant/StoreGalleryManager";
import { geocodeAddress } from "@/lib/geocode.functions";
import { AddressAutocomplete } from "@/components/merchant/AddressAutocomplete";
import { HoursEditor } from "@/components/merchant/HoursEditor";
import { DEFAULT_HOURS, parseHours, type Hours } from "@/lib/hours";
import { computeProfileCompleteness } from "@/lib/profile-completeness";

export const Route = createFileRoute("/_authenticated/profile/store")({
  component: StoreEditor,
});

type Socials = { instagram: string; facebook: string; tiktok: string; youtube: string };
const EMPTY_SOCIALS: Socials = { instagram: "", facebook: "", tiktok: "", youtube: "" };

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
    contact_email: "",
  });
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [socials, setSocials] = useState<Socials>(EMPTY_SOCIALS);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { data: categories } = useCategories();

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name, category: store.category, address: store.address, city: store.city,
        postal_code: (store as any).postal_code ?? "",
        country: (store as any).country ?? "Latvia",
        phone: store.phone ?? "", website: store.website ?? "",
        description: store.description ?? "", logo_url: store.logo_url ?? "",
        cover_image_url: (store as any).cover_image_url ?? "",
        contact_email: (store as any).contact_email ?? "",
      });
      setHours(parseHours((store as any).hours_json) ?? DEFAULT_HOURS);
      const sl = (store as any).social_links ?? {};
      setSocials({
        instagram: sl.instagram ?? "",
        facebook: sl.facebook ?? "",
        tiktok: sl.tiktok ?? "",
        youtube: sl.youtube ?? "",
      });
    }
  }, [store]);

  const completeness = useMemo(
    () =>
      computeProfileCompleteness({
        ...form,
        hours_json: hours,
        social_links: socials,
      }),
    [form, hours, socials]
  );

  const buildPayload = () => {
    const cleanedSocials = Object.fromEntries(
      Object.entries(socials).filter(([, v]) => v && v.trim().length > 0)
    );
    return {
      ...form,
      contact_email: form.contact_email || null,
      hours_json: hours as any,
      social_links: cleanedSocials as any,
      owner_id: user!.id,
      slug: store?.slug ?? `${slugify(form.name)}-${Date.now().toString(36)}`,
    };
  };

  const geocodeIfNeeded = async () => {
    let lat: number | null = (store as any)?.lat ?? null;
    let lng: number | null = (store as any)?.lng ?? null;
    let status: "OK" | "FAILED" | "SKIPPED" = "SKIPPED";
    if (pickedCoords) {
      lat = pickedCoords.lat; lng = pickedCoords.lng; status = "OK";
    } else if (form.address) {
      try {
        const res = await geocodeAddress({
          data: { address: form.address, city: form.city, postalCode: form.postal_code || undefined, country: form.country || "Latvia" },
        });
        if (res.lat != null && res.lng != null) { lat = res.lat; lng = res.lng; status = "OK"; }
        else status = "FAILED";
      } catch { status = "FAILED"; }
    }
    return { lat, lng, status };
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authed");
      const { lat, lng, status } = await geocodeIfNeeded();
      const payload = { ...buildPayload(), lat, lng };
      const { error } = store
        ? await supabase.from("stores").update(payload).eq("id", store.id)
        : await supabase.from("stores").insert(payload);
      if (error) throw error;
      return status;
    },
    onSuccess: (geocodeStatus) => {
      toast.success(t.common.saved);
      if (geocodeStatus === "OK") toast.success(t.merchant.geocoded);
      if (geocodeStatus === "FAILED") toast.warning(t.merchant.geocodeFailed);
      qc.invalidateQueries({ queryKey: ["my-store", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-store-edit", user?.id] });
      if (!store) navigate({ to: "/profile/dashboard" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async (nextHidden: boolean) => {
      if (!store) throw new Error("Save your profile first");
      const { error } = await supabase.from("stores").update({ is_hidden: nextHidden }).eq("id", store.id);
      if (error) throw error;
      return nextHidden;
    },
    onSuccess: (nextHidden) => {
      toast.success(nextHidden ? "Profile unpublished" : "Profile published");
      qc.invalidateQueries({ queryKey: ["my-store-edit", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-store", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div>{t.common.loading}</div>;

  const isPublished = !!store && !(store as any).is_hidden;

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.merchant.store}</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage how your business looks on Tavasatlaides.</p>
        </div>
        {store && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/stores/$id" params={{ id: store.id }} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" /> Preview
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* Profile completeness */}
      <section className="rounded-2xl border bg-card p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold flex items-center gap-2">
              {completeness.percent === 100 ? (
                <><CheckCircle2 className="h-4 w-4 text-primary" /> Profile complete</>
              ) : (
                <>Profile completeness</>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completeness.filled} of {completeness.total} fields filled
              {completeness.missing.length > 0 && completeness.missing.length <= 4 && (
                <> · missing: {completeness.missing.join(", ")}</>
              )}
            </p>
          </div>
          <span className="text-2xl font-bold tabular-nums">{completeness.percent}%</span>
        </div>
        <Progress value={completeness.percent} className="h-2" />

        {store && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              {isPublished ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              <span className="font-medium">{isPublished ? "Published" : "Unpublished"}</span>
              <span className="text-xs text-muted-foreground">
                {isPublished ? "Visible to everyone" : "Hidden from public listings"}
              </span>
            </div>
            <Switch
              checked={isPublished}
              disabled={togglePublish.isPending}
              onCheckedChange={(v) => togglePublish.mutate(!v)}
            />
          </div>
        )}
      </section>

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
            {(categories ?? []).map((c) => <SelectItem key={c.slug} value={c.slug}>{(t.cat as any)[c.slug] ?? c.name}</SelectItem>)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={t.merchant.phone}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+371 …" /></Field>
        <Field label="Contact email"><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="hello@business.lv" /></Field>
      </div>

      <Field label={t.merchant.website}><Input type="url" placeholder="https://…" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
      <Field label={t.merchant.description}><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

      {/* Social media */}
      <section className="rounded-2xl border bg-card p-4 md:p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Social media</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Add the full URL to each profile.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SocialField icon={Instagram} label="Instagram" placeholder="https://instagram.com/…"
            value={socials.instagram} onChange={(v) => setSocials((s) => ({ ...s, instagram: v }))} />
          <SocialField icon={Facebook} label="Facebook" placeholder="https://facebook.com/…"
            value={socials.facebook} onChange={(v) => setSocials((s) => ({ ...s, facebook: v }))} />
          <SocialField icon={Youtube} label="YouTube" placeholder="https://youtube.com/@…"
            value={socials.youtube} onChange={(v) => setSocials((s) => ({ ...s, youtube: v }))} />
          <SocialField icon={Instagram} label="TikTok" placeholder="https://tiktok.com/@…"
            value={socials.tiktok} onChange={(v) => setSocials((s) => ({ ...s, tiktok: v }))} />
        </div>
      </section>

      <HoursEditor value={hours} onChange={setHours} />

      {store?.id && user && (
        <div className="space-y-2">
          <Label>Gallery</Label>
          <StoreGalleryManager storeId={store.id} userId={user.id} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 -mx-1 px-1 border-t">
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg">
          {save.isPending ? t.common.loading : t.merchant.save}
        </Button>
        {store && (
          <>
            <Button asChild variant="outline" size="lg">
              <Link to="/stores/$id" params={{ id: store.id }} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" /> Preview
              </Link>
            </Button>
            <Button
              variant={isPublished ? "ghost" : "secondary"}
              size="lg"
              disabled={togglePublish.isPending}
              onClick={() => togglePublish.mutate(isPublished)}
            >
              {isPublished ? (<><EyeOff className="h-4 w-4 mr-1.5" /> Unpublish</>) : (<><Eye className="h-4 w-4 mr-1.5" /> Publish</>)}
            </Button>
          </>
        )}
      </div>
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

function SocialField({
  icon: Icon, label, value, onChange, placeholder,
}: { icon: any; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</Label>
      <Input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
