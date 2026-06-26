import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  MapPin, Phone, Globe, Navigation, BadgeCheck, Heart, Share2,
  Send, Facebook, Instagram, Clock, Sparkles, Calendar, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { StoreStatus } from "@/components/StoreStatus";
import { ShareMenu } from "@/components/ShareMenu";
import { ShopGallerySlider } from "@/components/ShopGallerySlider";
import { useI18n } from "@/i18n/use-i18n";
import { useSavedStores } from "@/lib/favorites";

function trackEvent(name: string, payload: Record<string, unknown>) {
  try {
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer?.push({ event: name, ...payload });
    w.gtag?.("event", name, payload);
  } catch { /* noop */ }
}

function buildDest(s: { lat?: number | null; lng?: number | null; address?: string | null; city?: string | null }): { q: string; hasCoords: boolean } | null {
  if (typeof s.lat === "number" && typeof s.lng === "number" && Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
    return { q: `${s.lat},${s.lng}`, hasCoords: true };
  }
  const parts = [s.address, s.city].filter(Boolean).join(", ").trim();
  return parts ? { q: parts, hasCoords: false } : null;
}

export const Route = createFileRoute("/stores/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("stores")
      .select("name,city,description,logo_url,cover_image_url,address,postal_code,country,phone,website,lat,lng")
      .eq("id", params.id)
      .maybeSingle();
    return { store: data };
  },
  head: ({ params, loaderData }) => {
    const s: any = loaderData?.store;
    const title = s ? `${s.name} — Deals in ${s.city ?? "Latvia"} — TavasAtlaides` : "Store — TavasAtlaides";
    const desc = s?.description?.slice(0, 160) || (s ? `See all active deals from ${s.name}${s.city ? ` in ${s.city}` : ""}.` : "Local store on TavasAtlaides.");
    const url = `https://tavasatlaides.lv/stores/${params.id}`;
    const image = s?.cover_image_url || s?.logo_url || undefined;
    const ldScripts = s
      ? [{
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: s.name,
            description: s.description ?? undefined,
            image: image ?? undefined,
            telephone: s.phone ?? undefined,
            url: s.website ?? url,
            address: s.address || s.city ? {
              "@type": "PostalAddress",
              streetAddress: s.address ?? undefined,
              addressLocality: s.city ?? undefined,
              postalCode: s.postal_code ?? undefined,
              addressCountry: s.country ?? "LV",
            } : undefined,
            geo: s.lat && s.lng ? {
              "@type": "GeoCoordinates",
              latitude: s.lat,
              longitude: s.lng,
            } : undefined,
          }),
        }]
      : [];
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(image ? [
          { property: "og:image", content: image },
          { name: "twitter:image", content: image },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: ldScripts,
    };
  },
  component: StorePage,
});

const CATEGORY_LABEL: Record<string, string> = {
  food: "Restorāns",
  cafes: "Kafejnīca",
  beauty: "Skaistums",
  auto: "Auto",
  electronics: "Elektronika",
  home: "Mājai",
  kids: "Bērniem",
  events: "Pasākumi",
};

function StorePage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { has, toggle } = useSavedStores();
  const [aboutOpen, setAboutOpen] = useState(false);

  const { data: store } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,slug,category,description,address,city,postal_code,country,lat,lng,phone,website,hours_json,logo_url,cover_image_url,created_at,updated_at,is_verified,social_links,contact_email")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ads = [] } = useQuery({
    queryKey: ["store-ads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,starts_at,ends_at,status,stores(id,name,city,slug,logo_url,is_verified,category,hours_json,lat,lng,address)")
        .eq("store_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: gallery = [] } = useQuery({
    queryKey: ["store-gallery", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_gallery")
        .select("id,image_url,sort_order")
        .eq("store_id", id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!store) return <div className="p-10 text-center text-muted-foreground">{t.common.loading}</div>;

  const saved = has(store.id);
  const social = (store.social_links ?? {}) as Record<string, string | undefined>;
  const categoryLabel = CATEGORY_LABEL[(store as any).category] ?? (store as any).category;

  const dest = buildDest(store as any);
  const directionsUrl = dest
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.q)}`
    : null;
  const wazeUrl = dest
    ? (dest.hasCoords
      ? `https://www.waze.com/ul?ll=${encodeURIComponent(dest.q)}&navigate=yes`
      : `https://www.waze.com/ul?q=${encodeURIComponent(dest.q)}&navigate=yes`)
    : null;
  const mapEmbedSrc = dest
    ? (dest.hasCoords
      ? `https://www.google.com/maps?q=${dest.q}&z=15&output=embed`
      : `https://www.google.com/maps?q=${encodeURIComponent(dest.q)}&z=15&output=embed`)
    : null;

  const bestOffer = ads.length > 0
    ? ads.reduce((best: any, a: any) => (a.discount_pct ?? 0) > (best.discount_pct ?? 0) ? a : best, ads[0])
    : null;
  const offerText = bestOffer
    ? bestOffer.discount_pct ? `-${bestOffer.discount_pct}% ${bestOffer.title}` : bestOffer.title
    : undefined;

  const yearsInBusiness = useMemo(() => {
    if (!store.created_at) return null;
    const years = (Date.now() - new Date(store.created_at).getTime()) / (365.25 * 86400000);
    return years >= 1 ? Math.floor(years) : null;
  }, [store.created_at]);

  const lastUpdated = store.updated_at
    ? new Date(store.updated_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const galleryImgs = [
    ...(store.cover_image_url ? [store.cover_image_url] : []),
    ...gallery.map((g: any) => g.image_url).filter((u: string) => u && u !== store.cover_image_url),
  ];

  const description = store.description ?? "";
  const isLongDesc = description.length > 220;
  const shortDesc = isLongDesc ? description.slice(0, 220).trimEnd() + "…" : description;

  return (
    <div className="bg-background pb-28 sm:pb-0">
      {/* HERO */}
      <div className="relative">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
          {store.cover_image_url ? (
            <img src={store.cover_image_url} alt={store.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-warm" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute right-4 top-4 flex gap-2 sm:right-6 sm:top-6">
            <button
              type="button"
              onClick={() => toggle(store.id)}
              className="grid h-10 w-10 place-items-center rounded-full bg-background/90 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-background"
              aria-label={saved ? "Saglabāts" : "Saglabāt"}
            >
              <Heart className={`h-5 w-5 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>
            <ShareMenu
              entityId={store.id}
              entityName={store.name}
              entityLocation={store.city}
              offerText={offerText}
              buttonVariant="inline"
            />
          </div>
        </div>

        {/* Identity card overlapping hero */}
        <div className="mx-auto -mt-14 max-w-5xl px-4 sm:-mt-20 sm:px-6">
          <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur sm:p-6">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-4 ring-background sm:h-24 sm:w-24">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-brand-soft text-3xl font-bold text-primary">
                    {store.name[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="truncate text-xl font-black tracking-tight sm:text-3xl">{store.name}</h1>
                  {store.is_verified && (
                    <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label="Verificēts partneris" />
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground sm:text-base">
                  {categoryLabel && <span>{categoryLabel}</span>}
                  {store.city && <> · <MapPin className="inline h-3.5 w-3.5 -mt-0.5" /> {store.city}</>}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <StoreStatus hours={(store as any).hours_json} />
                  {ads.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                      <Sparkles className="h-3 w-3" />
                      {ads.length} {ads.length === 1 ? "aktīva atlaide" : "aktīvas atlaides"}
                    </span>
                  )}
                  {yearsInBusiness && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {yearsInBusiness}+ {yearsInBusiness === 1 ? "gads" : "gadi"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <a
                href="#discounts"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" /> Atlaides
              </a>
              {store.phone ? (
                <a
                  href={`tel:${store.phone}`}
                  onClick={() => trackEvent("call_clicked", { store_id: store.id })}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
                >
                  <Phone className="h-4 w-4" /> Zvanīt
                </a>
              ) : (
                <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted text-sm font-semibold text-muted-foreground">
                  <Phone className="h-4 w-4" /> Zvanīt
                </span>
              )}
              {directionsUrl ? (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("directions_clicked", { store_id: store.id })}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
                >
                  <Navigation className="h-4 w-4" /> Maršruts
                </a>
              ) : (
                <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted text-sm font-semibold text-muted-foreground">
                  <Navigation className="h-4 w-4" /> Maršruts
                </span>
              )}
              <button
                type="button"
                onClick={() => toggle(store.id)}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
              >
                <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
                {saved ? "Saglabāts" : "Saglabāt"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
        {/* ABOUT */}
        {description && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Par uzņēmumu
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground/85">
              {aboutOpen || !isLongDesc ? description : shortDesc}
            </p>
            {isLongDesc && (
              <button
                type="button"
                onClick={() => setAboutOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {aboutOpen ? "Lasīt mazāk" : "Lasīt vairāk"}
                <ChevronDown className={`h-4 w-4 transition ${aboutOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </section>
        )}

        {/* GALLERY */}
        {galleryImgs.length > 0 && (
          <section className="mt-10">
            <ShopGallerySlider images={galleryImgs} alt={`${store.name} foto`} />
          </section>
        )}

        {/* DISCOUNTS */}
        <section id="discounts" className="mt-12 scroll-mt-20">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Aktīvās atlaides</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ads.length > 0
                  ? `${ads.length} ${ads.length === 1 ? "piedāvājums" : "piedāvājumi"} pieejami tagad`
                  : "Pašlaik nav aktīvu piedāvājumu"}
              </p>
            </div>
          </div>

          {ads.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border/60 bg-muted/40 p-10 text-center">
              <p className="text-sm text-muted-foreground">{t.deals.empty}</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((a: any) => <DealCard key={a.id} deal={a} showNavigation={false} />)}
            </div>
          )}
        </section>

        {/* LOCATION */}
        {(mapEmbedSrc || store.address) && (
          <section className="mt-12">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Atrašanās vieta
            </h2>
            <div className="mt-3 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
              {mapEmbedSrc && (
                <iframe
                  title={`Karte — ${store.name}`}
                  src={mapEmbedSrc}
                  className="block h-72 w-full sm:h-96"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
              <div className="p-5">
                <p className="flex items-start gap-2 text-sm font-medium">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {store.address}{store.city ? `, ${store.city}` : ""}
                    {store.postal_code ? `, ${store.postal_code}` : ""}
                  </span>
                </p>
                {(directionsUrl || wazeUrl) && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
                      >
                        <MapPin className="h-4 w-4 text-[#1A73E8]" /> Google Maps
                      </a>
                    )}
                    {wazeUrl && (
                      <a
                        href={wazeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
                      >
                        <Navigation className="h-4 w-4 text-[#33CCFF]" /> Waze
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CONTACT */}
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Kontakti
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {store.phone && (
              <a href={`tel:${store.phone}`} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm transition hover:border-primary/40">
                <Phone className="h-4 w-4 text-primary" />
                <span className="font-medium">{store.phone}</span>
              </a>
            )}
            {store.contact_email && (
              <a href={`mailto:${store.contact_email}`} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm transition hover:border-primary/40">
                <Send className="h-4 w-4 text-primary" />
                <span className="truncate font-medium">{store.contact_email}</span>
              </a>
            )}
            {store.website && (
              <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm transition hover:border-primary/40 sm:col-span-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="truncate font-medium">{store.website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>

          {(social.facebook || social.instagram || social.tiktok) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background px-4 text-sm font-medium transition hover:bg-muted">
                  <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                </a>
              )}
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background px-4 text-sm font-medium transition hover:bg-muted">
                  <Instagram className="h-4 w-4 text-pink-600" /> Instagram
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background px-4 text-sm font-medium transition hover:bg-muted">
                  <span className="text-sm font-black">TT</span> TikTok
                </a>
              )}
            </div>
          )}
        </section>

        {/* TRUST / ACTIVITY */}
        <section className="mt-12 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aktīvās atlaides</div>
            <div className="mt-1 text-2xl font-black">{ads.length}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PARTNERIS KOPŠ</div>
            <div className="mt-1 text-2xl font-black">
              {store.created_at ? new Date(store.created_at).getFullYear() : "—"}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atjaunots</div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" /> {lastUpdated ?? "—"}
            </div>
          </div>
        </section>
      </div>

      {/* STICKY MOBILE ACTION BAR */}
      <StoreStickyBar
        adsCount={ads.length}
        phone={store.phone}
        directionsUrl={directionsUrl}
        storeId={store.id}
      />
    </div>
  );
}

function StoreStickyBar({
  adsCount, phone, directionsUrl, storeId,
}: {
  adsCount: number;
  phone: string | null;
  directionsUrl: string | null;
  storeId: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-6px_24px_-8px_rgba(15,23,42,0.18)] backdrop-blur sm:hidden">
      <div className="grid grid-cols-3 gap-2">
        <a
          href="#discounts"
          onClick={() => trackEvent("sticky_discounts_clicked", { store_id: storeId })}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" /> {adsCount > 0 ? `${adsCount} atlaides` : "Atlaides"}
        </a>
        {phone ? (
          <a
            href={`tel:${phone}`}
            onClick={() => trackEvent("sticky_call_clicked", { store_id: storeId })}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold active:scale-[0.98]"
          >
            <Phone className="h-4 w-4" /> Zvanīt
          </a>
        ) : (
          <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted text-sm font-semibold text-muted-foreground">
            <Phone className="h-4 w-4" /> Zvanīt
          </span>
        )}
        {directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("sticky_directions_clicked", { store_id: storeId })}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold active:scale-[0.98]"
          >
            <Navigation className="h-4 w-4" /> Maršruts
          </a>
        ) : (
          <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted text-sm font-semibold text-muted-foreground">
            <Navigation className="h-4 w-4" /> Maršruts
          </span>
        )}
      </div>
    </div>
  );
}
