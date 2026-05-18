import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { useI18n } from "@/i18n/use-i18n";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORY_SLUGS, CITIES } from "@/lib/categories";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "All deals — DealsLV" },
      { name: "description", content: "Browse all active discounts in Riga and Jurmala by category, city or expiring soon." },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "discount" | "expiring">("newest");

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", city, cat, sort],
    queryFn: async () => {
      let query = supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,created_at,stores!inner(id,name,city,slug)")
        .eq("status", "active");
      if (cat !== "all") query = query.eq("category", cat);
      if (city !== "all") query = query.eq("stores.city", city);
      if (sort === "newest") query = query.order("created_at", { ascending: false });
      if (sort === "discount") query = query.order("discount_pct", { ascending: false, nullsFirst: false });
      if (sort === "expiring") query = query.order("ends_at", { ascending: true, nullsFirst: false });
      const { data, error } = await query.limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return deals;
    const needle = q.toLowerCase();
    return deals.filter((d: any) => d.title.toLowerCase().includes(needle) || d.stores?.name.toLowerCase().includes(needle));
  }, [deals, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.deals.title}</h1>

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
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="min-w-[160px]"><SelectValue placeholder={t.deals.sort} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t.deals.sortNewest}</SelectItem>
            <SelectItem value="discount">{t.deals.sortDiscount}</SelectItem>
            <SelectItem value="expiring">{t.deals.sortExpiring}</SelectItem>
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
            {filtered.map((d: any) => <DealCard key={d.id} deal={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}
