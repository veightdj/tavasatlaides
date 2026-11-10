import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronRight,
  LocateFixed,
  MapPin,
  Search,
  Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/use-i18n";
import { CITIES, CITY_CENTERS, localizedCategoryName, localizedCityName, useCategories } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Deal } from "@/components/DealCard";
import heroImage from "@/assets/home-marketplace-hero.jpg";

export function HomeSearch({ city, onCityChange }: { city: string; onCityChange: (city: string) => void }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const h = t.homePages.marketplace;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    navigate({
      to: "/deals",
      search: {
        q: query.trim() || undefined,
        city: city === "all" ? undefined : city,
      },
    });
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label={h.searchLabel}
      className="grid gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-[0_10px_35px_-24px_color-mix(in_oklab,var(--foreground)_35%,transparent)] sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:rounded-full"
    >
      <label className="flex min-w-0 items-center gap-3 px-3">
        <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={h.searchPlaceholder}
          className="h-11 min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </label>
      <Select value={city} onValueChange={onCityChange}>
        <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-muted/70 sm:rounded-full [&>span]:block [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left">
          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
          <SelectValue placeholder={t.deals.city} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.city.all}</SelectItem>
          {CITIES.map((item) => (
            <SelectItem key={item} value={item}>
              {localizedCityName(item, lang)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" className="h-11 rounded-xl px-6 sm:rounded-full">
        <Search className="h-4 w-4" />
        {h.searchButton}
      </Button>
    </form>
  );
}

export function HomeHero() {
  const { t } = useI18n();
  const h = t.homePages.marketplace;

  return (
    <section className="relative isolate h-[310px] overflow-hidden rounded-3xl bg-secondary sm:h-[280px] md:h-[220px]">
      <img
        src={heroImage}
        alt=""
        width={1600}
        height={800}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-y-0 right-0 h-full w-full object-cover object-[68%_center] md:w-[58%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/95 to-secondary/15" />
      <div className="relative z-10 flex h-full max-w-2xl flex-col items-start justify-center p-6 sm:p-8 md:max-w-[58%] md:p-8">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{h.heroEyebrow}</p>
        <h1 className="text-balance text-[1.65rem] font-extrabold leading-[1.12] tracking-[-0.035em] sm:text-3xl md:text-[2rem]">
          {h.heroTitle}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">{h.heroSub}</p>
        <Button asChild className="mt-5 rounded-full px-5">
          <Link to="/deals">
            {h.heroCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

const COLLECTION_FILTERS: Record<string, { cat?: string; city?: string }> = {
  week: {},
  spa: { cat: "beauty" },
  food: { cat: "food" },
  beauty: { cat: "beauty" },
  weekend: { cat: "events" },
  jurmala: { city: "Jurmala" },
};

export function CuratedCollections({ deals }: { deals: Deal[] }) {
  const { t } = useI18n();
  const h = t.homePages.marketplace;

  const collectionImage = (id: string) => {
    const match = deals.find((deal) => {
      if (!deal.cover_image_url) return false;
      if (id === "week") return true;
      if (id === "jurmala") return deal.stores?.city === "Jurmala";
      if (id === "food") return ["food", "cafes"].includes(deal.category);
      if (id === "weekend") return ["events", "kids"].includes(deal.category);
      return deal.category === "beauty";
    });
    return match?.cover_image_url ?? "/hero-riga.jpg";
  };

  return (
    <section aria-labelledby="curated-collections">
      <SectionHeading id="curated-collections" title={h.collectionsTitle} subtitle={h.collectionsSubtitle} />
      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="flex gap-4">
          {Object.entries(h.collections).map(([collectionId, collection]) => {
            const filter = COLLECTION_FILTERS[collectionId] ?? {};
            return (
              <Link
                key={collectionId}
                to="/deals"
                search={filter}
                className="group w-[236px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:w-[264px]"
              >
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img
                    src={collectionImage(collectionId)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold leading-snug">{collection.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{collection.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MapDiscovery({ city }: { city: string }) {
  const { t } = useI18n();
  const h = t.homePages.marketplace;
  const center = CITY_CENTERS[city as keyof typeof CITY_CENTERS] ?? CITY_CENTERS.Riga;
  const bbox = [center.lng - 0.15, center.lat - 0.08, center.lng + 0.15, center.lat + 0.08].join(",");
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;

  const { data: mappedStores = [] } = useQuery({
    queryKey: ["home-map-stores", city],
    queryFn: async () => {
      let query = supabase
        .from("stores")
        .select("id,ads(id,status)")
        .eq("is_hidden", false)
        .eq("is_blocked", false)
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (city !== "all") query = query.eq("city", city);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []).filter((store) => store.ads?.some((ad) => ad.status === "active"));
    },
    staleTime: 60_000,
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-border/60 bg-card" aria-labelledby="map-discovery">
      <div className="grid md:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-start justify-center p-6 sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <h2 id="map-discovery" className="mt-5 text-2xl font-extrabold tracking-tight">{h.mapTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.mapSubtitle}</p>
          {mappedStores.length > 0 && (
            <p className="mt-4 text-xs font-semibold text-muted-foreground">
              {mappedStores.length} {h.mapBusinesses}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="rounded-full">
              <Link to="/map">
                {h.mapCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/nearby">
                <LocateFixed className="h-4 w-4" />
                {h.mapNearbyCta}
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative min-h-[250px] border-t border-border/60 bg-muted md:min-h-[320px] md:border-l md:border-t-0">
          <iframe
            key={mapUrl}
            src={mapUrl}
            title={h.mapTitle}
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </section>
  );
}

type Business = {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  address: string;
  logo_url: string | null;
  cover_image_url: string | null;
  is_verified: boolean | null;
  ads: Array<{ id: string; status: string }> | null;
};

export function LocalBusinesses({ city }: { city: string }) {
  const { t, lang } = useI18n();
  const h = t.homePages.marketplace;
  const { data: categories = [] } = useCategories();
  const { data: businesses = [] } = useQuery({
    queryKey: ["home-local-businesses", city],
    queryFn: async () => {
      let query = supabase
        .from("stores")
        .select("id,name,slug,category,city,address,logo_url,cover_image_url,is_verified,ads(id,status)")
        .eq("is_hidden", false)
        .eq("is_blocked", false)
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false });
      if (city !== "all") query = query.eq("city", city);
      const { data, error } = await query.limit(12);
      if (error) throw error;
      return ((data ?? []) as Business[])
        .filter((business) => business.ads?.some((ad) => ad.status === "active"))
        .slice(0, 4);
    },
    staleTime: 60_000,
  });

  if (businesses.length === 0) return null;

  return (
    <section aria-labelledby="local-businesses">
      <SectionHeading id="local-businesses" title={h.businessesTitle} subtitle={h.businessesSubtitle} linkTo="/stores" linkLabel={t.home.seeAll} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {businesses.map((business) => {
          const category = categories.find((item) => item.slug === business.category);
          const activeOffers = business.ads?.filter((ad) => ad.status === "active").length ?? 0;
          return (
            <Link
              key={business.id}
              to="/stores/$id"
              params={{ id: business.id }}
              className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="relative h-24 overflow-hidden bg-brand-soft">
                {business.cover_image_url ? (
                  <img src={business.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Building2 className="h-9 w-9 text-primary/30" />
                  </div>
                )}
                <div className="absolute bottom-3 left-4 grid h-12 w-12 place-items-center overflow-hidden rounded-xl border-2 border-card bg-card shadow-sm">
                  {business.logo_url ? (
                    <img src={business.logo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
              <div className="p-4 pt-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-bold">{business.name}</h3>
                  {business.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label={h.verified} />}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {category ? localizedCategoryName(category, lang) : t.deals.category} · {localizedCityName(business.city, lang)}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-primary">{activeOffers} {h.activeOffers}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function SectionHeading({
  id,
  title,
  subtitle,
  linkTo,
  linkLabel,
  linkSearch,
}: {
  id: string;
  title: string;
  subtitle?: string;
  linkTo?: "/deals" | "/stores";
  linkLabel?: string;
  linkSearch?: { cat?: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-xl font-extrabold tracking-[-0.025em] sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {linkTo && linkLabel && (
        <Link to={linkTo} search={linkSearch} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
