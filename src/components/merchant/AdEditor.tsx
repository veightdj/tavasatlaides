import { useNavigate } from "@tanstack/react-router";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";
import { useCategories } from "@/lib/categories";
import { uploadImage } from "@/lib/upload";

const LOCALE_TABS: { code: "lv" | "en" | "ru"; label: string; flag: string }[] = [
  { code: "lv", label: "Latviešu", flag: "🇱🇻" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

export function AdEditor({ adId, onSaved, embedded }: { adId?: string; onSaved?: () => void; embedded?: boolean }) {
  const isNew = !adId;
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("stores").select("id,category").eq("owner_id", user!.id).maybeSingle()).data,
  });
  const { data: categories } = useCategories();

  const { data: ad } = useQuery({
    queryKey: ["ad", adId],
    enabled: !isNew,
    queryFn: async () => (await supabase.from("ads").select("*").eq("id", adId!).maybeSingle()).data,
  });

  const [form, setForm] = useState({
    title_lv: "", title_en: "", title_ru: "",
    description_lv: "", description_en: "", description_ru: "",
    category: "food",
    discount_pct: "" as string,
    price_original: "" as string, price_sale: "" as string,
    starts_at: new Date().toISOString().slice(0, 10),
    ends_at: "",
    status: "active",
    cover_image_url: "",
  });

  const draftKey = isNew ? "draft:new-ad" : `draft:ad:${adId}`;

  useEffect(() => {
    if (!isNew && ad) {
      const a = ad as any;
      setForm({
        title_lv: a.title_lv ?? a.title ?? "",
        title_en: a.title_en ?? "",
        title_ru: a.title_ru ?? "",
        description_lv: a.description_lv ?? a.description ?? "",
        description_en: a.description_en ?? "",
        description_ru: a.description_ru ?? "",
        category: a.category,
        discount_pct: a.discount_pct?.toString() ?? "",
        price_original: a.price_original?.toString() ?? "",
        price_sale: a.price_sale?.toString() ?? "",
        starts_at: a.starts_at ? new Date(a.starts_at).toISOString().slice(0, 10) : "",
        ends_at: a.ends_at ? new Date(a.ends_at).toISOString().slice(0, 10) : "",
        status: a.status,
        cover_image_url: a.cover_image_url ?? "",
      });
    } else if (isNew && store) {
      // Restore draft from localStorage if present
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setForm((f) => ({ ...f, ...parsed, category: parsed.category || store.category }));
          return;
        }
      } catch {}
      if (!form.category) setForm((f) => ({ ...f, category: store.category }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad, isNew, store]);

  // Auto-save draft (new ad only) — debounced
  useEffect(() => {
    if (!isNew) return;
    const id = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [form, isNew, draftKey]);

  const save = useMutation({
    mutationFn: async () => {
      if (!store) throw new Error("Store not set up");
      const payload: any = {
        store_id: store.id,
        title: form.title_lv,
        description: form.description_lv || null,
        title_lv: form.title_lv,
        title_en: form.title_en || null,
        title_ru: form.title_ru || null,
        description_lv: form.description_lv || null,
        description_en: form.description_en || null,
        description_ru: form.description_ru || null,
        category: form.category,
        discount_pct: form.discount_pct ? Number(form.discount_pct) : null,
        price_original: form.price_original ? Number(form.price_original) : null,
        price_sale: form.price_sale ? Number(form.price_sale) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        status: form.status,
        cover_image_url: form.cover_image_url || null,
      };
      const { error } = isNew
        ? await supabase.from("ads").insert(payload)
        : await supabase.from("ads").update(payload).eq("id", adId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.common.saved);
      try { localStorage.removeItem(draftKey); } catch {}
      qc.invalidateQueries({ queryKey: ["my-ads"] });
      if (onSaved) onSaved();
      else navigate({ to: "/profile/ads" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const url = await uploadImage(file, user.id, "ad");
      setForm((f) => ({ ...f, cover_image_url: url }));
    } catch (err: any) { toast.error(err.message); }
  };

  if (!store) return <div>{t.merchant.setupStore}</div>;

  return (
    <div className="max-w-2xl space-y-5 [&_input]:h-12 [&_input]:text-base [&_button[role=combobox]]:h-12 [&_textarea]:text-base">
      {!embedded && <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{isNew ? t.merchant.newAd : t.merchant.edit}</h1>}

      <div className="flex items-center gap-4">
        {form.cover_image_url ? <img src={form.cover_image_url} className="h-24 w-32 rounded-lg object-cover" alt="" /> : <div className="h-24 w-32 rounded-lg bg-gradient-warm" />}
        <label className="text-sm cursor-pointer">
          <span className="inline-flex items-center min-h-[44px] rounded-md bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70">{t.merchant.coverImage}</span>
          <input type="file" accept="image/*" className="hidden" onChange={onCover} />
        </label>
      </div>

      <div className="space-y-2">
        <Label>{t.merchant.adTitle} / {t.merchant.adDescription}</Label>
        <Tabs defaultValue="lv" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {LOCALE_TABS.map((tab) => (
              <TabsTrigger key={tab.code} value={tab.code} className="text-sm">
                <span className="mr-1.5">{tab.flag}</span>
                {tab.code.toUpperCase()}
                {tab.code === "lv" && <span className="ml-1 text-destructive">*</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          {LOCALE_TABS.map((tab) => {
            const titleKey = `title_${tab.code}` as const;
            const descKey = `description_${tab.code}` as const;
            return (
              <TabsContent key={tab.code} value={tab.code} className="space-y-3 pt-3">
                <Input
                  placeholder={`${t.merchant.adTitle} (${tab.label})`}
                  value={form[titleKey]}
                  onChange={(e) => setForm({ ...form, [titleKey]: e.target.value })}
                  required={tab.code === "lv"}
                />
                <Textarea
                  placeholder={`${t.merchant.adDescription} (${tab.label})`}
                  rows={4}
                  className="min-h-[120px]"
                  value={form[descKey]}
                  onChange={(e) => setForm({ ...form, [descKey]: e.target.value })}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
      <F label={t.merchant.category}>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{(categories ?? []).map((c) => <SelectItem key={c.slug} value={c.slug}>{(t.cat as any)[c.slug] ?? c.name}</SelectItem>)}</SelectContent>
        </Select>
      </F>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <F label={t.merchant.discount}><Input type="number" inputMode="numeric" min="0" max="99" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} /></F>
        <F label={t.merchant.priceOriginal}><Input type="number" inputMode="decimal" step="0.01" value={form.price_original} onChange={(e) => setForm({ ...form, price_original: e.target.value })} /></F>
        <F label={t.merchant.priceSale}><Input type="number" inputMode="decimal" step="0.01" value={form.price_sale} onChange={(e) => setForm({ ...form, price_sale: e.target.value })} /></F>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label={t.merchant.startsAt}><Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></F>
        <F label={t.merchant.endsAt}><Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></F>
      </div>

      <F label={t.merchant.status}>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t.merchant.statusActive}</SelectItem>
            <SelectItem value="paused">{t.merchant.statusPaused}</SelectItem>
            <SelectItem value="draft">{t.merchant.statusDraft}</SelectItem>
          </SelectContent>
        </Select>
      </F>

      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="w-full sm:w-auto h-12 text-base font-semibold"
      >
        {t.merchant.save}
      </Button>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
