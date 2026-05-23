import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { LocateFixed, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { useI18n } from "@/i18n/use-i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORY_SLUGS, CITIES } from "@/lib/categories";

type SortMode = "newest" | "discount" | "expiring" | "nearest";

type DealsSearch = {
  near?: string; // "lat,lng"
};

function parseNear(v: unknown): { lat: number; lng: number } | null {
  if (typeof v !== "string") return null;
  const [a, b] = v.split(",");
  const lat = Number(a), lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// Haversine distance in km
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const Route = createFileRoute("/deals")({
  validateSearch: (search: Record<string, unknown>): DealsSearch => ({
    near: typeof search.near === "string" ? search.near : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All deals — DealsLV" },
      { name: "description", content: "Browse all active discounts in Riga and Jurmala by category, city or expiring soon." },
      { property: "og:title", content: "All deals — DealsLV" },
      { property: "og:description", content: "Browse all active discounts in Riga and Jurmala by category, city or expiring soon." },
      { property: "og:url", content: "https://superatlaides.lovable.app/deals" },
      { name: "twitter:title", content: "All deals — DealsLV" },
      { name: "twitter:description", content: "Browse all active discounts in Riga and Jurmala by category, city or expiring soon." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/deals" }],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { t } = useI18n();
  const navigate = useNavigate({ from: "/deals" });
  const { near } = Route.useSearch();
  const origin = useMemo(() => parseNear(near), [near]);

  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("newest");

  // When ?near=... is present, default the sort to "nearest"
  useEffect(() => {
    if (origin && sort !== "nearest") setSort("nearest");
    if (!origin && sort === "nearest") setSort("newest");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!origin]);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", city, cat, sort, !!origin],
    queryFn: async () => {
      let query = supabase
        .from("ads")
        .select(
          "id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,created_at,stores!inner(id,name,city,slug,lat,lng)"
        )
        .eq("status", "active");
      if (cat !== "all") query = query.eq("category", cat);
      if (city !== "all") query = query.eq("stores.city", city);
      if (sort === "newest") query = query.order("created_at", { ascending: false });
      if (sort === "discount") query = query.order("discount_pct", { ascending: false, nullsFirst: false });
      if (sort === "expiring") query = query.order("ends_at", { ascending: true, nullsFirst: false });
      // For "nearest" we sort client-side after computing distance
      const { data, error } = await query.limit(120);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = deals as any[];
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (d) => d.title.toLowerCase().includes(needle) || d.stores?.name?.toLowerCase().includes(needle)
      );
    }
    if (origin) {
      list = list
        .map((d) => {
          const lat = d.stores?.lat, lng = d.stores?.lng;
          const dist = typeof lat === "number" && typeof lng === "number"
            ? distanceKm(origin, { lat, lng })
            : Number.POSITIVE_INFINITY;
          return { ...d, _distanceKm: dist };
        })
        .filter((d) => Number.isFinite(d._distanceKm))
        .sort((a, b) => a._distanceKm - b._distanceKm);
    }
    return list;
  }, [deals, q, origin]);

  const clearNear = () =>
    navigate({ search: (prev: DealsSearch) => ({ ...prev, near: undefined }), replace: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.deals.title}</h1>
        {!origin && <NearMeButton />}
      </div>

      {origin && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-brand-soft px-4 py-3 text-sm">
          <LocateFixed className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1">{t.deals.nearBanner}</span>
          <Button size="sm" variant="ghost" onClick={clearNear} className="h-8">
            <X className="h-4 w-4 mr-1" /> {t.deals.nearClear}
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <Input placeholder={t.deals.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="min-w-[140px]"><SelectValue placeholder={t.deals.city} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.city.all}</SelectItem>
            {CITIES.map((c) => <SelectItem key={c} value={c}>{c === "Riga" ? t.city.riga : t.city.jurmala}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="min-w-[160px]"><SelectValue placeholder={t.deals.category} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.cat.all}</SelectItem>
            {CATEGORY_SLUGS.map((c) => <SelectItem key={c} value={c}>{(t.cat as any)[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger className="min-w-[160px]"><SelectValue placeholder={t.deals.sort} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t.deals.sortNewest}</SelectItem>
            <SelectItem value="discount">{t.deals.sortDiscount}</SelectItem>
            <SelectItem value="expiring">{t.deals.sortExpiring}</SelectItem>
            {origin && <SelectItem value="nearest">{t.deals.sortNearest}</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t.deals.empty}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((d: any) => (
              <div key={d.id} className="relative">
                <DealCard deal={d} />
                {origin && Number.isFinite(d._distanceKm) && (
                  <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-[11px] font-semibold shadow-sm border">
                    <LocateFixed className="h-3 w-3 text-primary" />
                    {d._distanceKm < 1
                      ? `${Math.round(d._distanceKm * 1000)} m`
                      : `${d._distanceKm.toFixed(1)} ${t.deals.distanceKm}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NearMeButton() {
  const { t } = useI18n();
  const navigate = useNavigate({ from: "/deals" });
  const [loading, setLoading] = useState(false);

  const onClick = () => {
    if (!("geolocation" in navigator)) {
      toast.error(t.deals.nearError);
      return;
    }
    setLoading(true);
    const toastId = toast.loading(t.deals.nearLocating);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(toastId);
        setLoading(false);
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        navigate({ search: (prev: DealsSearch) => ({ ...prev, near: `${lat},${lng}` }), replace: true });
      },
      () => {
        toast.dismiss(toastId);
        setLoading(false);
        toast.error(t.deals.nearError);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <Button onClick={onClick} disabled={loading} variant="outline" className="rounded-full h-10">
      <LocateFixed className="h-4 w-4 mr-1.5" />
      {loading ? t.deals.nearLocating : t.home.heroCtaSecondary}
    </Button>
  );
}
