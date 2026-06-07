import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, LocateFixed, MapPin, RefreshCw, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getHostAudience } from "@/lib/audience";
import { DealCard } from "@/components/DealCard";
import { CategoryCircles } from "@/components/CategoryCircles";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";
import { HomeBannerSlider } from "@/components/HomeBannerSlider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TavasAtlaides — Local store deals in Riga" },
      { name: "description", content: "Find active discounts and promotions from local shops, restaurants and services in Riga. Browse offers by category, store or on the map." },
      { property: "og:title", content: "TavasAtlaides — Local store deals in Riga" },
      { property: "og:description", content: "Find active discounts and promotions from local shops, restaurants and services in Riga. Browse offers by category, store or on the map." },
      { property: "og:url", content: "https://tavasatlaides.lv/" },
      { name: "twitter:title", content: "TavasAtlaides — Local store deals in Riga" },
      { name: "twitter:description", content: "Find active discounts and promotions from local shops, restaurants and services in Riga. Browse offers by category, store or on the map." },
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

function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [locating, setLocating] = useState(false);

  const handleNearMe = () => {
    if (!("geolocation" in navigator)) {
      if (getHostAudience() !== "client") toast.error(t.deals.nearError);
      return;
    }
    setLocating(true);
    const toastId = toast.loading(t.deals.nearLocating);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(toastId);
        setLocating(false);
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        navigate({ to: "/deals", search: { near: `${lat},${lng}` } });
      },
      () => {
        toast.dismiss(toastId);
        setLocating(false);
        if (getHostAudience() !== "client") toast.error(t.deals.nearError);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };


  const { data: featured = [] } = useQuery({
    queryKey: ["featured-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,stores(id,name,city,slug,hours_json)")
        .eq("status", "active")
        .order("discount_pct", { ascending: false, nullsFirst: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <HomeBannerSlider />
      {/* Hero */}
      <section className="px-3 md:px-6 pt-3 md:pt-5 pb-3 md:pb-5">
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-xl shadow-black/10">
          {/* Background image */}
          <img
            src="/hero-riga.jpg"
            alt="Riga cityscape"
            className="absolute inset-0 h-full w-full object-cover"
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {/* Subtle inner border */}
          <div className="absolute inset-1.5 rounded-xl md:rounded-2xl border border-white/8 pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-4 py-16 sm:py-20 md:py-28">
            <div className="max-w-2xl">

              {/* Headline */}
              <h1 className="mt-5 text-[2rem] sm:text-5xl md:text-[3.5rem] font-extrabold tracking-tight text-balance leading-[1.08] text-white">
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
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={handleNearMe}
                  disabled={locating}
                  className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto font-semibold"
                >
                  <LocateFixed className={`h-4 w-4 mr-1.5 ${locating ? "animate-pulse" : ""}`} />
                  {locating ? t.deals.nearLocating : t.home.heroCtaSecondary}
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
        </div>
      </section>

      {/* Categories */}
      <section className="py-4 md:py-6">
        <CategoryCircles />
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
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
