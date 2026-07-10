import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, MapPin, Share2, Calendar, ExternalLink, Clock, Link as LinkIcon, Send, Facebook, Smartphone, Check, Gift, Navigation, BadgeCheck, Phone, Globe, Instagram, Ticket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/use-i18n";
import { useFavorites } from "@/lib/favorites";
import { formatPrice } from "@/lib/utils";
import { useCountdown, useIsLive } from "@/hooks/useCountdown";
import { buildShareUrl } from "@/lib/referral";
import { ReportDealButton } from "@/components/ReportDealButton";
import { useCategories, localizedCategoryName } from "@/lib/categories";
import { localizedDealTitle, localizedDealDescription } from "@/lib/deal-i18n";

function buildDestination(store: any): { query: string; hasCoords: boolean } | null {
  if (!store) return null;
  const lat = typeof store.lat === "number" ? store.lat : null;
  const lng = typeof store.lng === "number" ? store.lng : null;
  if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { query: `${lat},${lng}`, hasCoords: true };
  }
  const parts = [store.address, store.city].filter(Boolean).join(", ").trim();
  if (parts) return { query: parts, hasCoords: false };
  return null;
}

function trackEvent(name: string, payload: Record<string, unknown>) {
  try {
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer?.push({ event: name, ...payload });
    w.gtag?.("event", name, payload);
  } catch {
    /* noop */
  }
}

function googleMapsUrl(store: any): string | null {
  const dest = buildDestination(store);
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.query)}`;
}

function wazeUrl(store: any): string | null {
  const dest = buildDestination(store);
  if (!dest) return null;
  return dest.hasCoords
    ? `https://www.waze.com/ul?ll=${encodeURIComponent(dest.query)}&navigate=yes`
    : `https://www.waze.com/ul?q=${encodeURIComponent(dest.query)}&navigate=yes`;
}

function ValidityCard({ startsAt, endsAt }: { startsAt: string | null; endsAt: string | null }) {
  const { t } = useI18n();
  const countdown = useCountdown(endsAt);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  const unit = (key: "day" | "hour" | "minute" | "second", value: number) =>
    (t.time as any)[value === 1 ? key : `${key}s`] ?? key;

  if (!countdown) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-brand-soft/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-primary" />
          <span>
            {startsAt && fmt(startsAt)}
            {startsAt && endsAt && " — "}
            {endsAt && fmt(endsAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-brand-soft/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Calendar className="h-4 w-4 text-primary" />
        <span>
          {startsAt && fmt(startsAt)}
          {startsAt && endsAt && " — "}
          {endsAt && fmt(endsAt)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {countdown.expired ? (
          <Badge variant="secondary">{t.time.ended}</Badge>
        ) : (
          <>
            <Badge variant={countdown.endingSoon ? "destructive" : "secondary"} className="gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {countdown.days > 0 && (
                  <>{countdown.days} {unit("day", countdown.days)} </>
                )}
                {countdown.hours > 0 && (
                  <>{countdown.hours} {unit("hour", countdown.hours)} </>
                )}
                {countdown.minutes > 1 && (
                  <>{countdown.minutes} {unit("minute", countdown.minutes)} </>
                )}
                {countdown.days === 1 && countdown.totalMs < 86400000 && (
                  <>{countdown.minutes} {unit("minute", countdown.minutes)} </>
                )}
                {countdown.days < 1 && (
                  <span className="font-mono tabular-nums">{String(countdown.hours).padStart(2, "0")}:{String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}</span>
                )}
                <span className="opacity-70">{t.time.left}</span>
              </span>
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/deals/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("ads")
      .select("title,description,cover_image_url,discount_pct,price_sale,price_original,currency,stores(name,city)")
      .eq("id", params.id)
      .maybeSingle();
    return { deal: data };
  },
  head: ({ params, loaderData }) => {
    const d: any = loaderData?.deal;
    const storeName = d?.stores?.name;
    const pctTag = d?.discount_pct ? `-${d.discount_pct}% ` : "";
    const title = d ? `${pctTag}${d.title}${storeName ? ` — ${storeName}` : ""} — TavasAtlaides` : "Deal — TavasAtlaides";
    const baseDesc = d?.description?.slice(0, 160);
    const fallbackDesc = d
      ? `${d.discount_pct ? `${d.discount_pct}% off — ` : ""}${d.title}${storeName ? ` at ${storeName}` : ""}${d?.stores?.city ? ` in ${d.stores.city}` : ""}.`
      : "Local deal on TavasAtlaides.";
    const desc = baseDesc || fallbackDesc;
    const url = `https://tavasatlaides.lv/deals/${params.id}`;
    const image = d?.cover_image_url || undefined;
    const imageAlt = d ? `${d.title}${storeName ? ` — ${storeName}` : ""}` : "Deal";
    const ldScripts = d
      ? [{
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: d.title,
            description: d.description ?? desc,
            image: image ?? undefined,
            brand: storeName ? { "@type": "Organization", name: storeName } : undefined,
            offers: d.price_sale != null ? {
              "@type": "Offer",
              price: d.price_sale,
              priceCurrency: d.currency ?? "EUR",
              availability: "https://schema.org/InStock",
              url,
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
        { property: "og:type", content: "product" },
        { property: "og:site_name", content: "TavasAtlaides" },
        ...(d?.discount_pct ? [{ name: "product:discount", content: `${d.discount_pct}%` }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(image ? [
          { property: "og:image", content: image },
          { property: "og:image:alt", content: imageAlt },
          { name: "twitter:image", content: image },
          { name: "twitter:image:alt", content: imageAlt },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: ldScripts,
    };
  },
  component: DealDetail,
});

function DealDetailSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="animate-pulse space-y-6">
        <div className="h-64 w-full rounded-2xl bg-muted sm:h-80" />
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded-lg bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-11/12 rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function DealDetailError({ message, retryLabel, onRetry, busy, autoRetrySeconds = 8, retryingInTemplate, cancelLabel, loadingLabel }: { message: string; retryLabel: string; onRetry: () => void; busy?: boolean; autoRetrySeconds?: number; retryingInTemplate: string; cancelLabel: string; loadingLabel: string }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(autoRetrySeconds);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      onRetry();
      setSecondsLeft(null);
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft, onRetry]);

  const countdownText = secondsLeft !== null && secondsLeft > 0
    ? retryingInTemplate.replace("{seconds}", String(secondsLeft))
    : null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center" role="alert" aria-live="polite">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ExternalLink className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-base text-muted-foreground">{message}</p>
      {countdownText && <p className="text-sm text-muted-foreground" aria-live="polite">{countdownText}</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          onClick={() => { setSecondsLeft(null); onRetry(); }}
          disabled={busy}
          aria-busy={busy}
          aria-live="polite"
          className="h-11 min-w-[160px] gap-2"
        >
          {busy ? (
            <>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span>{loadingLabel}</span>
            </>
          ) : (
            retryLabel
          )}
        </Button>
        {secondsLeft !== null && secondsLeft > 0 && (
          <Button
            variant="outline"
            onClick={() => setSecondsLeft(null)}
            disabled={busy}
            className="h-11"
          >
            {cancelLabel}
          </Button>
        )}
      </div>
    </div>
  );
}


function DealDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { data: categories = [] } = useCategories();
  const { has, toggle } = useFavorites();

  const { data: deal, isLoading, isError, error, refetch, isFetching, failureCount } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const startedAt = performance.now();
      const { data, error } = await supabase
        .from("ads")
        .select("*, stores(id,name,slug,category,description,address,city,postal_code,country,lat,lng,phone,website,hours_json,logo_url,cover_image_url), ad_images(url, sort_order)")
        .eq("id", id)
        .maybeSingle();
      const durationMs = Math.round(performance.now() - startedAt);
      if (error) {
        console.error("[deal] load failed", {
          dealId: id,
          durationMs,
          online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
          code: (error as any)?.code,
          status: (error as any)?.status,
          message: error.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
        });
        throw error;
      }
      console.info("[deal] load ok", { dealId: id, durationMs, found: !!data });
      return data;
    },
    retry: 1,
  });

  // Log error boundary state + auto-retry outcomes for diagnostics.
  useEffect(() => {
    if (isError) {
      console.warn("[deal] entering error state", {
        dealId: id,
        failureCount,
        error: error instanceof Error ? { name: error.name, message: error.message } : error,
      });
    }
  }, [isError, error, failureCount, id]);

  const handleRetry = () => {
    const attemptStartedAt = performance.now();
    console.info("[deal] retry requested", { dealId: id, failureCount });
    refetch()
      .then((res) => {
        const durationMs = Math.round(performance.now() - attemptStartedAt);
        if (res.isError) {
          console.error("[deal] retry failed", {
            dealId: id,
            durationMs,
            error: res.error instanceof Error ? res.error.message : res.error,
          });
        } else {
          console.info("[deal] retry succeeded", { dealId: id, durationMs, found: !!res.data });
        }
      })
      .catch((err) => {
        console.error("[deal] retry threw", { dealId: id, err });
      });
  };


  const trackView = useMutation({
    mutationFn: async () => {
      await supabase.from("ad_views").insert({ ad_id: id });
      await supabase.from("ad_clicks").insert({ ad_id: id });
    },
  });
  const trackSave = useMutation({
    mutationFn: async () => { await supabase.from("ad_saves").insert({ ad_id: id }); },
  });
  const trackShare = useMutation({
    mutationFn: async () => { await supabase.from("ad_shares").insert({ ad_id: id }); },
  });

  useEffect(() => {
    if (deal?.status === "active") trackView.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  // Real-time "active now" — re-evaluates as start/end windows pass.
  // Must be called before any early returns to keep hook order stable.
  const isLive = useIsLive(deal?.starts_at ?? null, deal?.ends_at ?? null, deal?.status ?? null);

  if (isLoading) return <DealDetailSkeleton label={t.common.loading} />;
  if (isError) return <DealDetailError message={t.common.loadError} retryLabel={t.common.retry} onRetry={handleRetry} busy={isFetching} retryingInTemplate={t.common.retryingIn} cancelLabel={t.common.cancel} loadingLabel={t.common.loading} />;
  if (!deal) throw notFound();


  const saved = has(deal.id);
  const images = [deal.cover_image_url, ...((deal.ad_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => i.url))].filter(Boolean);
  const store = deal.stores as any;
  const dealTitle = localizedDealTitle(deal as any, lang);
  const dealDescription = localizedDealDescription(deal as any, lang);
  const social = (store?.social_links ?? {}) as Record<string, string | undefined>;

  const isReferred = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ref");

  // Discount headline
  const discountHeadline = deal.discount_pct
    ? `-${deal.discount_pct}%`
    : (deal.price_sale != null && deal.price_original != null
      ? `€${formatPrice(deal.price_sale)}`
      : null);


  const gUrl = store ? googleMapsUrl(store) : null;
  const wUrl = store ? wazeUrl(store) : null;
  const hasCoords = typeof store?.lat === "number" && typeof store?.lng === "number";
  const mapEmbedSrc = hasCoords
    ? `https://www.google.com/maps?q=${store.lat},${store.lng}&z=15&output=embed`
    : store?.address
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${store.address}, ${store.city}`)}&z=15&output=embed`
      : null;

  const lastUpdated = deal.updated_at
    ? new Date(deal.updated_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div className="bg-background">
      {/* HERO */}
      <div className="relative">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
          {images[0] ? (
            <img src={images[0]} alt={dealTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-warm" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Live indicator pill */}
          <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {(t.common as any).active ?? "Active now"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur">
                <Clock className="h-3 w-3" />
                {(t.time as any)?.ended ?? "Inactive"}
              </span>
            )}
          </div>

          {/* Floating discount badge */}
          {discountHeadline && (
            <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
              <div className="rounded-2xl bg-primary px-4 py-2 text-primary-foreground shadow-lg ring-1 ring-primary/30">
                <div className="text-xl font-black tracking-tight leading-none sm:text-2xl">{discountHeadline}</div>
                {deal.discount_pct && (
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90">{(t.common as any).off ?? "off"}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Business identity card overlapping hero */}
        <div className="mx-auto -mt-12 max-w-5xl px-4 sm:-mt-16 sm:px-6">
          <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur sm:p-6">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-4 ring-background sm:h-20 sm:w-20">
                {store?.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-brand-soft text-2xl font-bold text-primary">
                    {store?.name?.[0] ?? "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className="truncate text-lg font-bold leading-tight sm:text-xl">{store?.name}</h2>
                  {store?.is_verified && (
                    <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label="Verified business" />
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  <span>{(() => { const r = categories.find((c) => c.slug === deal.category); return r ? localizedCategoryName(r, lang) : deal.category; })()}</span>
                  {store?.city && <> · {store.city}</>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
        {isReferred && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-primary/30 bg-brand-soft/60 px-4 py-3 text-sm font-medium text-foreground">
            <Gift className="h-4 w-4 text-primary" />
            {t.deals.referralBanner}
          </div>
        )}

        {/* GIANT DISCOUNT */}
        {discountHeadline && (
          <section className="text-center">
            <div className="text-[15vw] font-black leading-none tracking-tighter text-primary sm:text-8xl">
              {discountHeadline}
            </div>
            <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">{dealTitle}</h1>
            {(deal.price_sale != null || deal.price_original != null) && deal.discount_pct && (
              <div className="mt-2 flex items-baseline justify-center gap-2 text-base">
                {deal.price_sale != null && <span className="font-bold text-primary">€{formatPrice(deal.price_sale)}</span>}
                {deal.price_original != null && <span className="text-muted-foreground line-through">€{formatPrice(deal.price_original)}</span>}
              </div>
            )}
          </section>
        )}
        {!discountHeadline && (
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{dealTitle}</h1>
        )}

        {/* PRIMARY ACTION BAR (sticky on mobile) */}
        <div className="sticky top-14 z-30 mt-8 -mx-4 border-y border-border/60 bg-background/85 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:bg-card sm:px-4 sm:shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {gUrl ? (
              <a
                href={gUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("get_directions_clicked", { deal_id: deal.id, store_id: store?.id })}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] hover:bg-primary/90"
              >
                <Navigation className="h-4 w-4" />
                <span>{(t.deals as any)?.directions ?? "Directions"}</span>
              </a>
            ) : (
              <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
                <Navigation className="h-4 w-4" /> {(t.deals as any)?.directions ?? "Directions"}
              </span>
            )}
            {store?.phone ? (
              <a
                href={`tel:${store.phone}`}
                onClick={() => trackEvent("call_clicked", { deal_id: deal.id, store_id: store?.id })}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
              >
                <Phone className="h-4 w-4" /> {(t.merchant as any)?.phone ?? "Call"}
              </a>
            ) : null}
            {store?.website ? (
              <a
                href={store.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("website_clicked", { deal_id: deal.id, store_id: store?.id })}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
              >
                <Globe className="h-4 w-4" /> {(t.merchant as any)?.website ?? "Website"}
              </a>
            ) : null}
            <button
              onClick={() => { if (!saved) trackSave.mutate(); toggle(deal.id); }}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
            >
              <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
              {saved ? ((t.deals as any)?.saved ?? "Saved") : ((t.deals as any)?.save ?? "Save")}
            </button>
          </div>
        </div>

        {/* DESCRIPTION */}
        {dealDescription && (
          <section className="mt-10">
            <p className="whitespace-pre-line text-lg leading-relaxed text-foreground/85">{dealDescription}</p>
          </section>
        )}

        {/* VALIDITY */}
        <ValidityCard startsAt={deal.starts_at} endsAt={deal.ends_at} />

        {/* HOW TO REDEEM */}
        <section className="mt-8 rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">{t.deals.howToRedeem}</h3>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Sparkles, label: t.deals.noCodeNeeded },
              { icon: Check, label: t.deals.justShowPage },
              { icon: BadgeCheck, label: t.deals.mentionAtCheckout },

            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm font-medium leading-snug">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* SHARE + SAVE viral block */}
        <ShareSaveCard
          title={dealTitle}
          discountPct={deal.discount_pct}
          storeName={store?.name}
          saved={saved}
          onSaveToggle={() => { if (!saved) trackSave.mutate(); toggle(deal.id); }}
          onShare={() => trackShare.mutate()}
        />

        {/* BUSINESS INFO */}
        {store && (
          <section className="mt-10">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t.deals.aboutBusiness}
            </h3>

            <Link
              to="/stores/$id"
              params={{ id: store.id }}
              className="mt-3 flex items-start gap-4 rounded-3xl border border-border/60 bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
            >
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-xl font-bold text-primary">{store.name[0]}</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="truncate font-semibold">{store.name}</h4>
                  {store.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                </div>
                <p className="mt-1 inline-flex items-start gap-1 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{store.address}{store.city ? `, ${store.city}` : ""}</span>
                </p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>

            {/* MAP */}
            {mapEmbedSrc && (
              <div className="mt-4 overflow-hidden rounded-3xl border border-border/60 bg-muted">
                <iframe
                  title={`Map — ${store.name}`}
                  src={mapEmbedSrc}
                  className="block h-64 w-full sm:h-80"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}

            {/* NAV BUTTONS */}
            {(gUrl || wUrl) && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {gUrl && (
                  <a
                    href={gUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("google_maps_clicked", { deal_id: deal.id, store_id: store?.id })}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
                  >
                    <MapPin className="h-5 w-5 text-[#1A73E8]" />
                    <span>Google Maps</span>
                  </a>
                )}
                {wUrl && (
                  <a
                    href={wUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("waze_clicked", { deal_id: deal.id, store_id: store?.id })}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98]"
                  >
                    <Navigation className="h-5 w-5 text-[#33CCFF]" />
                    <span>Waze</span>
                  </a>
                )}
              </div>
            )}

            {/* CONTACT GRID */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
                <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm transition hover:border-primary/40">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="truncate font-medium">{store.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </div>

            {/* SOCIAL */}
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
        )}

        {/* MORE PHOTOS */}
        {images.length > 1 && (
          <section className="mt-10">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {(t.deals as any)?.morePhotos ?? "More photos"}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {images.slice(1).map((url, i) => (
                <img key={i} src={url} alt="" className="aspect-square w-full rounded-2xl object-cover" loading="lazy" />
              ))}
            </div>
          </section>
        )}

        {/* META */}
        {lastUpdated && (
          <p className="mt-10 text-center text-xs text-muted-foreground">
            {(t.deals as any)?.lastUpdated ?? "Last updated"} · {lastUpdated}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <ReportDealButton adId={deal.id} />
        </div>
      </div>
    </div>
  );
}

function ShareMenu({
  title,
  discountPct,
  storeName,
  onShare,
}: {
  title: string;
  discountPct: number | null;
  storeName?: string;
  onShare: () => void;
}) {
  const { t } = useI18n();

  const buildText = () => {
    const pct = discountPct ? `-${discountPct}% ` : "";
    const at = storeName ? ` @ ${storeName}` : "";
    return `${pct}${title}${at}`;
  };

  const getUrl = () => (typeof window !== "undefined" ? buildShareUrl(window.location.href) : "");

  const openShare = (href: string) => {
    onShare();
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const shareWhatsapp = () => {
    const text = `${buildText()} — ${getUrl()}`;
    openShare(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const shareFacebook = () => {
    openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}&quote=${encodeURIComponent(buildText())}`);
  };

  const copyLink = async () => {
    onShare();
    try {
      await navigator.clipboard.writeText(getUrl());
      toast.success(t.deals.shareCopied);
    } catch {
      toast.error(t.common.error);
    }
  };

  const nativeShare = async () => {
    onShare();
    try {
      await navigator.share({ title, text: buildText(), url: getUrl() });
    } catch {
      /* user cancelled */
    }
  };

  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          {t.deals.shareTitle}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onSelect={shareWhatsapp}>
          <Send className="h-4 w-4 mr-2 text-green-600" />
          {t.deals.shareWhatsapp}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={shareFacebook}>
          <Facebook className="h-4 w-4 mr-2 text-blue-600" />
          {t.deals.shareFacebook}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copyLink}>
          <LinkIcon className="h-4 w-4 mr-2" />
          {t.deals.shareCopy}
        </DropdownMenuItem>
        {canNative && (
          <DropdownMenuItem onSelect={nativeShare}>
            <Smartphone className="h-4 w-4 mr-2" />
            {t.deals.shareNative}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShareSaveCard({
  title,
  discountPct,
  storeName,
  saved,
  onSaveToggle,
  onShare,
}: {
  title: string;
  discountPct: number | null;
  storeName?: string;
  saved: boolean;
  onSaveToggle: () => void;
  onShare: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const buildText = () => {
    const pct = discountPct ? `-${discountPct}% ` : "";
    const at = storeName ? ` @ ${storeName}` : "";
    return `${pct}${title}${at}`;
  };
  const getUrl = () => (typeof window !== "undefined" ? buildShareUrl(window.location.href) : "");

  const handleCopy = async () => {
    onShare();
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      toast.success(t.deals.sharedToast);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.common.error);
    }
  };

  const handleWhatsapp = () => {
    onShare();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${buildText()} — ${getUrl()}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  const handleFacebook = () => {
    onShare();
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}&quote=${encodeURIComponent(buildText())}`,
      "_blank",
      "noopener,noreferrer,width=600,height=600",
    );
  };
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const handleNative = async () => {
    onShare();
    try {
      await navigator.share({ title, text: buildText(), url: getUrl() });
      toast.success(t.deals.sharedToast);
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-brand-soft/70 via-background to-background p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Heart className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold leading-tight">{t.deals.shareCardTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.deals.shareCardSub}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleCopy} className="flex-1 justify-center" size="lg">
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              {t.deals.shareCopied}
            </>
          ) : (
            <>
              <LinkIcon className="h-4 w-4 mr-2" />
              {t.deals.shareCopyCta}
            </>
          )}
        </Button>
        <Button onClick={onSaveToggle} variant={saved ? "secondary" : "outline"} size="lg" className="sm:w-auto">
          <Heart className={`h-4 w-4 mr-2 ${saved ? "fill-current text-primary" : ""}`} />
          {saved ? t.deals.saved : t.deals.save}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button onClick={handleWhatsapp} variant="ghost" className="h-11 justify-center border border-border/60 bg-background/60 hover:bg-background">
          <Send className="h-4 w-4 mr-2 text-green-600" />
          <span className="text-sm">WhatsApp</span>
        </Button>
        <Button onClick={handleFacebook} variant="ghost" className="h-11 justify-center border border-border/60 bg-background/60 hover:bg-background">
          <Facebook className="h-4 w-4 mr-2 text-blue-600" />
          <span className="text-sm">Facebook</span>
        </Button>
        {canNative ? (
          <Button onClick={handleNative} variant="ghost" className="h-11 justify-center border border-border/60 bg-background/60 hover:bg-background">
            <Smartphone className="h-4 w-4 mr-2" />
            <span className="text-sm">{t.deals.shareNative}</span>
          </Button>
        ) : (
          <Button onClick={handleCopy} variant="ghost" className="h-11 justify-center border border-border/60 bg-background/60 hover:bg-background">
            <Share2 className="h-4 w-4 mr-2" />
            <span className="text-sm">{t.deals.shareTitle}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
