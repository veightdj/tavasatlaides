import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
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
import { CITIES, useCategories } from "@/lib/categories";
import { distanceKm as haversineKm } from "@/lib/distance";

type SortMode = "newest" | "discount" | "expiring" | "nearest";
type Radius = "any" | "1" | "5" | "10";

const PAGE_SIZE = 24;
const NEAR_FETCH_CAP = 200; // when sorting by distance we need a wider pool to sort client-side

type DealsSearch = { near?: string };

function parseNear(v: unknown): { lat: number; lng: number } | null {
  if (typeof v !== "string") return null;
  const [a, b] = v.split(",");
  const lat = Number(a), lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export const Route = createFileRoute("/deals/")({
  validateSearch: (search: Record<string, unknown>): DealsSearch => ({
    near: typeof search.near === "string" ? search.near : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All deals — TavasAtlaides" },
      { name: "description", content: "Browse all active discounts in Riga by category, city or distance from you." },
      { property: "og:title", content: "All deals — TavasAtlaides" },
      { property: "og:description", content: "Browse all active discounts in Riga by category, city or distance from you." },
      { property: "og:url", content: "https://superatlaides.lovable.app/deals" },
      { name: "twitter:title", content: "All deals — TavasAtlaides" },
      { name: "twitter:description", content: "Browse all active discounts in Riga by category, city or distance from you." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/deals" }],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { t } = useI18n();
  const navigate = useNavigate({ from: "/deals/" });
  const { near } = Route.useSearch();
  const origin = useMemo(() => parseNear(near), [near]);

  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [radius, setRadius] = useState<Radius>("any");
  const { data: categories } = useCategories();

  // Debounce the search query for server-side filtering
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (origin && sort !== "nearest") setSort("nearest");
    if (!origin && sort === "nearest") setSort("newest");
    if (!origin && radius !== "any") setRadius("any");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!origin]);

  // When sorting nearest, fetch a larger pool once (no pagination) and sort/limit client-side.
  // Otherwise use server-side pagination (24 per page) with "Load more".
  const nearestMode = sort === "nearest" && !!origin;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["deals", city, cat, sort, debouncedQ, nearestMode],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const size = nearestMode ? NEAR_FETCH_CAP : PAGE_SIZE;
      const from = nearestMode ? 0 : page * PAGE_SIZE;
      const to = from + size - 1;

      let query = supabase
        .from("ads")
        .select(
          "id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,created_at,stores!inner(id,name,city,slug,lat,lng,address,logo_url,is_verified,category,hours_json)"
        )
        .eq("status", "active");

      if (cat !== "all") query = query.eq("category", cat);
      if (city !== "all") query = query.eq("stores.city", city);
      if (debouncedQ) query = query.ilike("title", `%${debouncedQ}%`);

      if (sort === "newest") query = query.order("created_at", { ascending: false });
      else if (sort === "discount") query = query.order("discount_pct", { ascending: false, nullsFirst: false });
      else if (sort === "expiring") query = query.order("ends_at", { ascending: true, nullsFirst: false });
      else if (sort === "nearest") query = query.order("created_at", { ascending: false });

      const { data, error } = await query.range(from, to);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (nearestMode) return undefined; // single fetch
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
  });

  const allDeals = useMemo(() => data?.pages.flat() ?? [], [data]);

  // Distance enrichment (client-side) only when an origin is set
  const filtered = useMemo(() => {
    let list = allDeals as any[];
    if (origin) {
      list = list
        .map((d) => {
          const lat = d.stores?.lat, lng = d.stores?.lng;
          const dist = typeof lat === "number" && typeof lng === "number"
            ? haversineKm(origin, { lat, lng })
            : Number.POSITIVE_INFINITY;
          return { ...d, _distanceKm: dist };
        })
        .filter((d) => Number.isFinite(d._distanceKm));
      if (radius !== "any") {
        const max = Number(radius);
        list = list.filter((d) => d._distanceKm <= max);
      }
      if (sort === "nearest") {
        list = list.sort((a, b) => a._distanceKm - b._distanceKm);
      }
    }
    return list;
  }, [allDeals, origin, radius, sort]);

  const clearNear = () =>
    navigate({ search: (prev: DealsSearch) => ({ ...prev, near: undefined }), replace: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 pb-24 md:pb-10">
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

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <Input placeholder={t.deals.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="min-w-[140px]"><SelectValue placeholder={t.deals.city} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.city.all}</SelectItem>
            {CITIES.map((c) => <SelectItem key={c} value={c}>{c === "Riga" ? t.city.riga : t.city.jurmala}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="min-w-[150px]"><SelectValue placeholder={t.deals.category} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.cat.all}</SelectItem>
            {(categories ?? []).map((c) => <SelectItem key={c.slug} value={c.slug}>{(t.cat as any)[c.slug] ?? c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {origin && (
          <Select value={radius} onValueChange={(v) => setRadius(v as Radius)}>
            <SelectTrigger className="min-w-[150px]"><SelectValue placeholder={t.deals.radius} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t.deals.radiusAny}</SelectItem>
              <SelectItem value="1">{t.deals.radius1}</SelectItem>
              <SelectItem value="5">{t.deals.radius5}</SelectItem>
              <SelectItem value="10">{t.deals.radius10}</SelectItem>
            </SelectContent>
          </Select>
        )}
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
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((d: any) => (
                <DealCard key={d.id} deal={d} distanceKm={d._distanceKm} />
              ))}
            </div>
            {hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fetchNextPage()}
                  disabled={isFetching}
                >
                  {isFetching ? t.common.loading : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky mobile near-me button */}
      {!origin && (
        <div
          className="md:hidden fixed right-4 z-30"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
        >
          <StickyNearMe />
        </div>
      )}
    </div>
  );
}

function useGetLocation() {
  const { t } = useI18n();
  const navigate = useNavigate({ from: "/deals/" });
  const [loading, setLoading] = useState(false);
  const fetch = () => {
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
  return { loading, fetch };
}

function NearMeButton() {
  const { t } = useI18n();
  const { loading, fetch } = useGetLocation();
  return (
    <Button onClick={fetch} disabled={loading} variant="outline" className="rounded-full h-10">
      <LocateFixed className="h-4 w-4 mr-1.5" />
      {loading ? t.deals.nearLocating : t.deals.nearMe}
    </Button>
  );
}

function StickyNearMe() {
  const { t } = useI18n();
  const { loading, fetch } = useGetLocation();
  return (
    <Button onClick={fetch} disabled={loading} size="lg" className="rounded-full shadow-xl shadow-black/20 h-12 px-5">
      <LocateFixed className={`h-5 w-5 mr-2 ${loading ? "animate-pulse" : ""}`} />
      {loading ? t.deals.nearLocating : t.deals.nearMe}
    </Button>
  );
}
