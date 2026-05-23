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
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-soft via-background to-background" />
        <div className="absolute -top-40 -right-40 -z-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 py-12 md:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Rīga · Jūrmala
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-balance leading-[1.1] md:leading-[1.05] break-words">
              {t.home.heroTitle}
            </h1>
            <p className="mt-4 md:mt-5 text-base md:text-lg text-muted-foreground max-w-2xl text-balance">
              {t.home.heroSub}
            </p>
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full w-full sm:w-auto">
                <Link to="/deals">{t.cta.browse} <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full w-full sm:w-auto">
                <Link to="/map"><MapPin className="h-4 w-4 mr-1" />{t.nav.map}</Link>
              </Button>
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
