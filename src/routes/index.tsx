import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, MapPin, RefreshCw, Sparkles, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";
import { CATEGORY_SLUGS } from "@/lib/categories";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DealsLV — Local store deals in Riga & Jurmala" },
      { name: "description", content: "Find active discounts and promotions from local shops, restaurants and services in Riga & Jurmala." },
      { property: "og:title", content: "DealsLV — Local store deals in Riga & Jurmala" },
      { property: "og:description", content: "Find active discounts and promotions from local shops, restaurants and services in Riga & Jurmala." },
      { property: "og:url", content: "https://superatlaides.lovable.app/" },
      { name: "twitter:title", content: "DealsLV — Local store deals in Riga & Jurmala" },
      { name: "twitter:description", content: "Find active discounts and promotions from local shops, restaurants and services in Riga & Jurmala." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/" }],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();

  const { data: featured = [] } = useQuery({
    queryKey: ["featured-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,stores(id,name,city,slug)")
        .eq("status", "active")
        .order("discount_pct", { ascending: false, nullsFirst: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background image with gradient overlay */}
        <div className="absolute inset-1 rounded-2xl md:rounded-3xl overflow-hidden -z-10 mx-3 md:mx-0">
          <img
            src="/hero-riga.jpg"
            alt="Riga cityscape"
            className="h-full w-full object-cover"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          <div className="absolute inset-2 rounded-xl md:rounded-2xl border border-white/10 pointer-events-none" />
        </div>

        <div className="mx-auto max-w-6xl px-5 md:px-4 py-16 sm:py-20 md:py-28">
          <div className="max-w-2xl">
            {/* Location pill */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-white/90">
              <Sparkles className="h-3.5 w-3.5" /> Rīga · Jūrmala · Latvia
            </span>

            {/* Headline */}
            <h1 className="mt-5 text-[2rem] sm:text-5xl md:text-6xl font-extrabold tracking-tight text-balance leading-[1.08] text-white">
              {t.home.heroTitle}
            </h1>

            {/* Subtitle */}
            <p className="mt-4 md:mt-5 text-base md:text-lg text-white/80 max-w-xl text-balance leading-relaxed">
              {t.home.heroSub}
            </p>

            {/* CTAs */}
            <div className="mt-7 md:mt-9 flex flex-col sm:flex-row flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-white text-foreground hover:bg-white/90 w-full sm:w-auto shadow-lg shadow-black/20 font-semibold">
                <Link to="/deals">{t.home.heroCtaPrimary} <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto font-semibold">
                <Link to="/map"><Compass className="h-4 w-4 mr-1.5" />{t.home.heroCtaSecondary}</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-4 md:gap-6">
              <span className="inline-flex items-center gap-1.5 text-xs md:text-sm text-white/70">
                <Store className="h-3.5 w-3.5 md:h-4 md:w-4 text-white/60" />
                {t.home.trustLocal}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs md:text-sm text-white/70">
                <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 text-white/60" />
                {t.home.trustDaily}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs md:text-sm text-white/70">
                <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-white/60" />
                {t.home.trustNearby}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-14">
        <div className="flex items-end justify-between mb-5 md:mb-6 gap-3">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t.home.featured}</h2>
          <Link to="/deals" className="text-sm text-primary font-medium hover:underline shrink-0">{t.home.seeAll} →</Link>
        </div>
        {featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 md:p-12 text-center text-muted-foreground">
            {t.deals.empty}
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((d) => <DealCard key={d.id} deal={d as any} />)}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-5 md:mb-6">{t.home.browseCategory}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORY_SLUGS.map((slug) => (
            <Link
              key={slug}
              to="/categories/$slug"
              params={{ slug }}
              className="rounded-xl border border-border bg-card p-4 text-center hover:border-primary hover:bg-brand-soft transition"
            >
              <span className="text-sm font-medium">{(t.cat as any)[slug]}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Merchant CTA */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-14">
        <div className="rounded-2xl md:rounded-3xl bg-gradient-warm p-6 md:p-12 text-primary-foreground flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-6 justify-between">
          <div className="flex items-start gap-4">
            <Store className="h-8 w-8 md:h-10 md:w-10 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg md:text-2xl font-bold">{t.home.merchantsCta}</h3>
              <p className="text-primary-foreground/80 mt-1 text-sm md:text-base">{t.forMerchants.body}</p>
            </div>
          </div>
          <Button asChild size="lg" variant="secondary" className="rounded-full shrink-0 w-full md:w-auto">
            <Link to="/signup">{t.forMerchants.cta} <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
