import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { MapPin, Phone, Globe, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { StoreStatus, useStoreCardDecoration } from "@/components/StoreStatus";
import { ShareMenu } from "@/components/ShareMenu";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";

const PAGE_SIZE = 24;

export const Route = createFileRoute("/stores/")({
  head: () => ({
    meta: [
      { title: "Stores — TavasAtlaides" },
      { name: "description", content: "Browse local stores in Riga and see all their active deals." },
      { property: "og:title", content: "Stores — TavasAtlaides" },
      { property: "og:description", content: "Browse local stores in Riga and see all their active deals." },
      { property: "og:url", content: "https://superatlaides.lovable.app/stores" },
      { name: "twitter:title", content: "Stores — TavasAtlaides" },
      { name: "twitter:description", content: "Browse local stores in Riga and see all their active deals." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/stores" }],
  }),
  component: StoresIndex,
});

type Store = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  website: string | null;
  hours_json: unknown;
};

type Ad = {
  id: string;
  title: string;
  category: string;
  discount_pct: number | null;
  price_original: number | null;
  price_sale: number | null;
  cover_image_url: string | null;
  ends_at: string | null;
  store_id: string;
};

function StoresIndex() {
  const { t } = useI18n();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["stores-paged"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,slug,city,address,description,logo_url,cover_image_url,phone,website,hours_json")
        .order("name")
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as Store[];
    },
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length),
  });

  const stores = useMemo(() => data?.pages.flat() ?? [], [data]);
  const storeIds = useMemo(() => stores.map((s) => s.id), [stores]);

  // Only fetch active ads for stores currently visible on the page
  const { data: adsByStore = {} } = useQuery({
    queryKey: ["active-ads-for-stores", storeIds.join(",")],
    enabled: storeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,store_id")
        .eq("status", "active")
        .in("store_id", storeIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const grouped: Record<string, Ad[]> = {};
      for (const ad of (data ?? []) as Ad[]) {
        (grouped[ad.store_id] ||= []).push(ad);
      }
      return grouped;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{t.nav.deals}</h1>
      <p className="mt-2 text-muted-foreground">{t.home.heroSub}</p>

      {isLoading && <p className="mt-10 text-center text-muted-foreground">{t.common.loading}</p>}

      <div className="mt-8 space-y-8">
        {stores.map((s) => (
          <StoreSection key={s.id} store={s} ads={adsByStore[s.id] ?? []} seeAllLabel={t.home.seeAll} emptyLabel={t.deals.empty} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-10 flex justify-center">
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
    </div>
  );
}

function StoreSection({
  store: s, ads, seeAllLabel, emptyLabel,
}: { store: Store; ads: Ad[]; seeAllLabel: string; emptyLabel: string }) {
  const deco = useStoreCardDecoration(s.hours_json);
  const bestOffer = ads.length > 0
    ? ads.reduce((best, a) => (a.discount_pct ?? 0) > (best.discount_pct ?? 0) ? a : best, ads[0])
    : null;
  const offerText = bestOffer
    ? bestOffer.discount_pct
      ? `-${bestOffer.discount_pct}% ${bestOffer.title}`
      : bestOffer.title
    : undefined;
  return (
    <section
      className={`rounded-3xl border border-border bg-card overflow-hidden transition ${deco.ring} ${deco.dim}`}
    >
      {s.cover_image_url && (
        <div className="aspect-[16/5] w-full overflow-hidden bg-muted">
          <img src={s.cover_image_url} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          {s.logo_url ? (
            <img src={s.logo_url} alt={s.name} className="h-16 w-16 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-warm grid place-items-center text-primary-foreground font-bold text-xl shrink-0">
              {s.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link to="/stores/$id" params={{ id: s.id }} className="text-xl md:text-2xl font-bold hover:text-primary transition">
                  {s.name}
                </Link>
                <div className="mt-1.5">
                  <StoreStatus hours={s.hours_json} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{s.address}, {s.city}</span>
                  {s.phone && <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{s.phone}</span>}
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                      <Globe className="h-4 w-4" />{s.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShareMenu
                  entityId={s.id}
                  entityName={s.name}
                  entityLocation={s.city}
                  offerText={offerText}
                  buttonVariant="icon"
                />
                <Link
                  to="/stores/$id"
                  params={{ id: s.id }}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  {seeAllLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            {s.description && (
              <p className="mt-3 text-foreground/80 max-w-3xl">{s.description}</p>
            )}
          </div>
        </div>

        {ads.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((a) => (
              <DealCard
                key={a.id}
                deal={{ ...a, stores: { id: s.id, name: s.name, city: s.city, slug: s.slug } }}
              />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
    </section>
  );
}
