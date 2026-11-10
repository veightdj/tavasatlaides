import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealCard, type Deal } from "@/components/DealCard";
import { CategoryCirclesFilter } from "@/components/CategoryCirclesFilter";
import { HomeBannerSlider } from "@/components/HomeBannerSlider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";
import { localizedCategoryName, useCategories } from "@/lib/categories";
import {
  CuratedCollections,
  HomeHero,
  HomeSearch,
  LocalBusinesses,
  MapDiscovery,
  SectionHeading,
} from "@/components/home/HomeSections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TavasAtlaides — vietējie piedāvājumi tuvumā" },
      { name: "description", content: "Atklāj vietējos piedāvājumus, atlaides un pakalpojumus Rīgā, Jūrmalā un citās Latvijas pilsētās." },
      { property: "og:title", content: "TavasAtlaides — vietējie piedāvājumi tuvumā" },
      { property: "og:description", content: "Atklāj vietējos piedāvājumus, atlaides un pakalpojumus Rīgā, Jūrmalā un citās Latvijas pilsētās." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tavasatlaides.lv/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TavasAtlaides — vietējie piedāvājumi tuvumā" },
      { name: "twitter:description", content: "Atklāj vietējos piedāvājumus, atlaides un pakalpojumus Rīgā, Jūrmalā un citās Latvijas pilsētās." },
    ],
    links: [{ rel: "canonical", href: "https://tavasatlaides.lv/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "TavasAtlaides",
              url: "https://tavasatlaides.lv/",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://tavasatlaides.lv/deals?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "Organization",
              name: "TavasAtlaides",
              url: "https://tavasatlaides.lv/",
              logo: "https://tavasatlaides.lv/icons/icon-512.png",
            },
          ],
        }),
      },
    ],
  }),
  component: Home,
});

const DEAL_COLUMNS = "id,title,title_lv,title_en,title_ru,description_lv,description_en,description_ru,category,discount_pct,price_original,price_sale,cover_image_url,starts_at,status,ends_at,created_at,stores!inner(id,name,city,slug,logo_url,is_verified,category,hours_json,lat,lng,address)";

function Home() {
  const { t, lang } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [city, setCity] = useState("all");
  const { data: categories = [] } = useCategories();
  const metadata = t.homePages.marketplace;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = metadata.metaTitle;
    const values: Array<[string, string, string]> = [
      ["name", "description", metadata.metaDescription],
      ["property", "og:title", metadata.metaTitle],
      ["property", "og:description", metadata.metaDescription],
      ["name", "twitter:title", metadata.metaTitle],
      ["name", "twitter:description", metadata.metaDescription],
    ];
    values.forEach(([attribute, key, content]) => {
      document.querySelector(`meta[${attribute}="${key}"]`)?.setAttribute("content", content);
    });
  }, [lang, metadata.metaTitle, metadata.metaDescription]);

  const { data: deals = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["home-marketplace-deals", lang, city, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("ads")
        .select(DEAL_COLUMNS)
        .eq("status", "active");
      if (selectedCategory) query = query.eq("category", selectedCategory);
      if (city !== "all") query = query.eq("stores.city", city);
      const { data, error } = await query
        .order("discount_pct", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(32);
      if (error) throw error;
      return (data ?? []) as unknown as Deal[];
    },
    staleTime: 60_000,
  });

  const popularDeals = deals.slice(0, 8);
  const categorySections = categories
    .map((category) => ({
      category,
      deals: deals.filter((deal) => deal.category === category.slug).slice(0, 4),
    }))
    .filter((section) => section.deals.length > 0)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-5 sm:py-7 md:space-y-14 md:py-8">
      <HomeSearch city={city} onCityChange={setCity} />

      <section aria-labelledby="home-categories">
        <SectionHeading
          id="home-categories"
          title={t.homePages.marketplace.categoriesTitle}
          subtitle={t.homePages.marketplace.categoriesSubtitle}
        />
        <div className="mt-2">
          <CategoryCirclesFilter activeSlug={selectedCategory} onSelect={setSelectedCategory} />
        </div>
      </section>

      <HomeHero />
      <HomeBannerSlider />

      {!selectedCategory && <CuratedCollections deals={deals} />}

      <section aria-labelledby="popular-offers">
        <SectionHeading
          id="popular-offers"
          title={t.homePages.marketplace.popularTitle}
          subtitle={t.homePages.marketplace.popularSubtitle}
          linkTo="/deals"
          linkLabel={t.home.seeAll}
        />
        <div className="mt-5">
          {isLoading ? (
            <DealGridSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t.common.loadError}</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                {t.common.retry}
              </Button>
            </div>
          ) : popularDeals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
              {t.deals.empty}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {popularDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} showNavigation={false} />
              ))}
            </div>
          )}
        </div>
      </section>

      {!selectedCategory && categorySections.map(({ category, deals: categoryDeals }) => (
        <section key={category.id} aria-labelledby={`home-category-${category.slug}`}>
          <SectionHeading
            id={`home-category-${category.slug}`}
            title={localizedCategoryName(category, lang)}
            linkTo="/deals"
            linkLabel={t.home.seeAll}
            linkSearch={{ cat: category.slug }}
          />
          <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 lg:overflow-visible">
            <div className="flex gap-4 lg:grid lg:grid-cols-4 lg:gap-5">
              {categoryDeals.map((deal) => (
                <div key={deal.id} className="w-[230px] shrink-0 sm:w-[270px] lg:w-auto">
                  <DealCard deal={deal} showNavigation={false} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <MapDiscovery city={city} />
      <LocalBusinesses city={city} />
    </div>
  );
}

function DealGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="aspect-[16/10] animate-pulse bg-muted" />
          <div className="space-y-3 p-3 sm:p-4">
            <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
