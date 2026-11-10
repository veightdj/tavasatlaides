import { Link } from "@tanstack/react-router";
import { Heart, BadgeCheck, MapPin, Navigation, Clock } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { useI18n } from "@/i18n/use-i18n";
import { useCategories, localizedCategoryName, localizedCityName } from "@/lib/categories";
import { localizedDealTitle } from "@/lib/deal-i18n";
import { formatDistance } from "@/lib/distance";
import { DealShareButton } from "@/components/DealShareButton";
import { useCountdown, useIsLive } from "@/hooks/useCountdown";

export type Deal = {
  id: string;
  title: string;
  category: string;
  discount_pct: number | null;
  price_original: number | null;
  price_sale: number | null;
  cover_image_url: string | null;
  ends_at: string | null;
  starts_at?: string | null;
  status?: string | null;
  description?: string | null;
  title_lv?: string | null;
  title_en?: string | null;
  title_ru?: string | null;
  description_lv?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
  created_at?: string;
  stores?: {
    id: string;
    name: string;
    city: string;
    slug: string;
    logo_url?: string | null;
    is_verified?: boolean | null;
    category?: string | null;
    hours_json?: unknown;
    lat?: number | null;
    lng?: number | null;
    address?: string | null;
  } | null;
};

function buildDestination(store: Deal["stores"]): { query: string; hasCoords: boolean } | null {
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
    // Analytics is optional and must never block navigation.
  }
}

function googleMapsUrl(store: Deal["stores"]): string | null {
  const destination = buildDestination(store);
  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.query)}`;
}

function wazeUrl(store: Deal["stores"]): string | null {
  const destination = buildDestination(store);
  if (!destination) return null;
  return destination.hasCoords
    ? `https://www.waze.com/ul?ll=${encodeURIComponent(destination.query)}&navigate=yes`
    : `https://www.waze.com/ul?q=${encodeURIComponent(destination.query)}&navigate=yes`;
}

export function DealCard({ deal, distanceKm, showNavigation = true }: { deal: Deal; distanceKm?: number; showNavigation?: boolean }) {
  const { has, toggle } = useFavorites();
  const { t, lang } = useI18n();
  const { data: categories = [] } = useCategories();
  const saved = has(deal.id);
  const store = deal.stores;
  const h = t.homePages.marketplace;

  const distanceLabel = typeof distanceKm === "number" && Number.isFinite(distanceKm)
    ? formatDistance(distanceKm, t.deals.distanceKm, t.deals.awayLabel)
    : null;
  const categorySlug = store?.category ?? deal.category;
  const categoryRow = categories.find((category) => category.slug === categorySlug);
  const categoryLabel = categoryRow ? localizedCategoryName(categoryRow, lang) : t.deals.category;
  const dealTitle = localizedDealTitle(deal, lang) || h.translationPending;
  const discountHeadline = deal.discount_pct ? `-${deal.discount_pct}%` : null;
  const isLive = useIsLive(deal.starts_at ?? null, deal.ends_at ?? null, deal.status ?? null);
  const countdown = useCountdown(deal.ends_at ?? null);
  const showCountdown = Boolean(countdown && !countdown.expired && countdown.endingSoon);
  const mapsUrl = googleMapsUrl(store);
  const wazeLink = wazeUrl(store);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg">
      <Link to="/deals/$id" params={{ id: deal.id }} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {deal.cover_image_url ? (
          <img
            src={deal.cover_image_url}
            alt={dealTitle}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-brand-soft">
            <MapPin className="h-8 w-8 text-primary/30" />
          </div>
        )}

        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
            {isLive ? <span className="h-1.5 w-1.5 rounded-full bg-success" /> : <Clock className="h-3 w-3" />}
            {isLive ? t.homePages.active : t.homePages.soon}
          </span>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle(deal.id);
          }}
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur transition hover:scale-105 sm:right-3 sm:top-3 sm:h-9 sm:w-9"
          aria-label={saved ? t.deals.saved : t.deals.save}
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
        </button>

        {discountHeadline && (
          <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-primary px-2.5 py-1.5 text-sm font-extrabold tracking-tight text-primary-foreground shadow-sm sm:bottom-3 sm:left-3 sm:text-base">
            {discountHeadline}
            <span className="sr-only"> {h.discountLabel}</span>
          </span>
        )}

        {showCountdown && countdown && (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-card/95 px-2 py-1 text-[10px] font-bold text-foreground shadow-sm sm:bottom-3 sm:right-3">
            {countdown.days > 0
              ? `${countdown.days}d ${countdown.hours}h`
              : `${String(countdown.hours).padStart(2, "0")}:${String(countdown.minutes).padStart(2, "0")}`}
          </span>
        )}

        <DealShareButton
          dealId={deal.id}
          title={dealTitle}
          description={store?.name}
          discountPct={deal.discount_pct}
          className={`absolute right-2.5 h-8 w-8 min-h-0 min-w-0 rounded-full bg-card/95 shadow-sm backdrop-blur hover:bg-card sm:right-3 sm:h-9 sm:w-9 ${showCountdown ? "bottom-11 sm:bottom-14" : "bottom-2.5 sm:bottom-3"}`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            to="/stores/$id"
            params={{ id: store?.id ?? "" }}
            className="shrink-0"
            onClick={(event) => { if (!store?.id) event.preventDefault(); }}
          >
            {store?.logo_url ? (
              <img src={store.logo_url} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-border sm:h-8 sm:w-8" loading="lazy" />
            ) : (
              <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-xs font-bold text-primary ring-1 ring-border sm:h-8 sm:w-8">
                {store?.name?.[0] ?? "•"}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to="/stores/$id"
              params={{ id: store?.id ?? "" }}
              className="flex items-center gap-1"
              onClick={(event) => { if (!store?.id) event.preventDefault(); }}
            >
              <h3 className="truncate text-[11px] font-bold leading-tight sm:text-xs">{store?.name ?? "—"}</h3>
              {store?.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label={h.verified} />}
            </Link>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]">
              {categoryLabel}
              {store?.city && <> · {localizedCityName(store.city, lang)}</>}
              {distanceLabel && <> · {distanceLabel}</>}
            </p>
          </div>
        </div>

        <Link to="/deals/$id" params={{ id: deal.id }} className="flex-1">
          <h4 className="line-clamp-2 min-h-[2.6em] text-[13px] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground transition group-hover:text-primary sm:min-h-[2.8em] sm:text-[15px] sm:leading-[1.4]">
            {dealTitle}
          </h4>
        </Link>

        {(deal.price_sale != null || deal.price_original != null) && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {deal.price_sale != null && <span className="text-base font-extrabold text-primary sm:text-lg">€{deal.price_sale.toFixed(2)}</span>}
            {deal.price_original != null && <span className="text-[11px] text-muted-foreground line-through sm:text-xs">€{deal.price_original.toFixed(2)}</span>}
          </div>
        )}

        <Link
          to="/deals/$id"
          params={{ id: deal.id }}
          className="mt-auto inline-flex h-9 w-full items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] sm:h-10 sm:text-sm"
        >
          {t.deals.viewDeal}
        </Link>

        {showNavigation && (mapsUrl || wazeLink) && (
          <div className="grid grid-cols-2 gap-2">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.stopPropagation();
                  trackEvent("google_maps_clicked", { deal_id: deal.id, store_id: store?.id });
                }}
                aria-label={h.openMaps}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold transition hover:bg-muted active:scale-[0.98]"
              >
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Maps</span>
              </a>
            ) : (
              <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold opacity-50">
                <MapPin className="h-4 w-4" /> Maps
              </span>
            )}
            {wazeLink ? (
              <a
                href={wazeLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.stopPropagation();
                  trackEvent("waze_clicked", { deal_id: deal.id, store_id: store?.id });
                }}
                aria-label={h.openWaze}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold transition hover:bg-muted active:scale-[0.98]"
              >
                <Navigation className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Waze</span>
              </a>
            ) : (
              <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold opacity-50">
                <Navigation className="h-4 w-4" /> Waze
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
