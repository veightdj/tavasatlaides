import { Link } from "@tanstack/react-router";
import { Heart, BadgeCheck, MapPin, Navigation, Clock } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { useI18n } from "@/i18n/use-i18n";
import { useCategories, localizedCategoryName } from "@/lib/categories";

import { formatDistance } from "@/lib/distance";
import { DealShareButton } from "@/components/DealShareButton";
import { useCountdown, useIsLive } from "@/hooks/useCountdown";

type Deal = {
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
    /* noop */
  }
}

function googleMapsUrl(store: Deal["stores"]): string | null {
  const dest = buildDestination(store);
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.query)}`;
}

function wazeUrl(store: Deal["stores"]): string | null {
  const dest = buildDestination(store);
  if (!dest) return null;
  return dest.hasCoords
    ? `https://www.waze.com/ul?ll=${encodeURIComponent(dest.query)}&navigate=yes`
    : `https://www.waze.com/ul?q=${encodeURIComponent(dest.query)}&navigate=yes`;
}

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

export function DealCard({ deal, distanceKm, showNavigation = true }: { deal: Deal; distanceKm?: number; showNavigation?: boolean }) {
  const { has, toggle } = useFavorites();
  const { t } = useI18n();
  const saved = has(deal.id);
  const store = deal.stores;

  const distLabel =
    typeof distanceKm === "number" && Number.isFinite(distanceKm)
      ? formatDistance(distanceKm, t.deals.distanceKm, t.deals.awayLabel)
      : null;
  const categorySlug = store?.category ?? deal.category;
  const categoryLabel = (t.cat as Record<string, string>)[categorySlug] ?? CATEGORY_LABEL[categorySlug] ?? categorySlug;

  // Discount headline
  const discountHeadline = deal.discount_pct ? `-${deal.discount_pct}%` : null;

  // Real-time "active now" — re-evaluates as start/end windows pass.
  const isLive = useIsLive(deal.starts_at ?? null, deal.ends_at ?? null, deal.status ?? null);

  const countdown = useCountdown(deal.ends_at ?? null);
  const showCountdown = !!countdown && !countdown.expired && countdown.endingSoon;

  const gUrl = googleMapsUrl(store);
  const wUrl = wazeUrl(store);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_2px_10px_-2px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_rgba(15,23,42,0.22)]">
      {/* HERO 16:9 with overlay */}
      <Link
        to="/deals/$id"
        params={{ id: deal.id }}
        className="relative block aspect-[16/9] overflow-hidden bg-muted"
      >
        {deal.cover_image_url ? (
          <img
            src={deal.cover_image_url}
            alt={deal.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-warm" />
        )}

        {/* Dark gradient for text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />

        {/* TOP ROW: live pill + save */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
            isLive
              ? "bg-background/90 text-foreground"
              : "bg-background/80 text-muted-foreground"
          }`}>
            {isLive ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Aktīva
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" /> Drīz
              </>
            )}
          </span>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(deal.id); }}
            className="grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:scale-105 hover:bg-background"
            aria-label={saved ? t.deals.saved : t.deals.save}
          >
            <Heart className={`h-[18px] w-[18px] ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        </div>

        {/* GIANT DISCOUNT BOTTOM-LEFT */}
        {discountHeadline && (
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
            <div className="text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
              <div className="text-4xl font-black leading-none tracking-tighter sm:text-5xl">
                {discountHeadline}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-90">
                Atlaide
              </div>
            </div>
            {showCountdown && (
              <span className="rounded-full bg-rose-500/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                {countdown.days > 0
                  ? `${countdown.days}d ${countdown.hours}h`
                  : `${String(countdown.hours).padStart(2, "0")}:${String(countdown.minutes).padStart(2, "0")}:${String(countdown.seconds).padStart(2, "0")}`}
              </span>
            )}
          </div>
        )}

        <DealShareButton
          dealId={deal.id}
          title={deal.title}
          description={store?.name}
          discountPct={deal.discount_pct}
          className="absolute bottom-3 right-3 h-9 w-9 min-h-0 min-w-0 rounded-full bg-background/90 backdrop-blur hover:bg-background"
        />
      </Link>

      {/* IDENTITY + CONTENT */}
      <div className="flex flex-col gap-3 p-4">
        {/* Business identity row */}
        <div className="flex items-center gap-3">
          <Link
            to="/stores/$id"
            params={{ id: store?.id ?? "" }}
            className="shrink-0"
            onClick={(e) => { if (!store?.id) e.preventDefault(); }}
          >
            {store?.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-background shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-base font-bold text-primary ring-2 ring-background shadow-sm">
                {store?.name?.[0] ?? "•"}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to="/stores/$id"
              params={{ id: store?.id ?? "" }}
              className="flex items-center gap-1"
              onClick={(e) => { if (!store?.id) e.preventDefault(); }}
            >
              <h3 className="truncate text-[15px] font-bold leading-tight">{store?.name ?? "—"}</h3>
              {store?.is_verified && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" aria-label="Verificēts partneris" />
              )}
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              <span>{categoryLabel}</span>
              {store?.city && <> · {store.city}</>}
              {distLabel && <> · {distLabel}</>}
            </p>
          </div>
        </div>

        {/* Deal title */}
        <Link to="/deals/$id" params={{ id: deal.id }}>
          <h4 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground/90 transition group-hover:text-primary">
            {deal.title}
          </h4>
        </Link>

        {/* Price (when not percent) */}
        {(deal.price_sale != null || deal.price_original != null) && (
          <div className="flex items-baseline gap-2">
            {deal.price_sale != null && (
              <span className="text-lg font-bold text-primary">€{deal.price_sale.toFixed(2)}</span>
            )}
            {deal.price_original != null && (
              <span className="text-sm text-muted-foreground line-through">€{deal.price_original.toFixed(2)}</span>
            )}
          </div>
        )}

        {/* Primary CTA */}
        <Link
          to="/deals/$id"
          params={{ id: deal.id }}
          className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          Skatīt akciju
        </Link>

        {/* Navigation buttons */}
        {showNavigation && (gUrl || wUrl) && (
          <div className="grid grid-cols-2 gap-2">
            {gUrl ? (
              <a
                href={gUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); trackEvent("google_maps_clicked", { deal_id: deal.id, store_id: store?.id }); }}
                aria-label="Atvērt Google Maps navigāciju"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold transition hover:bg-muted active:scale-[0.98]"
              >
                <MapPin className="h-4 w-4 text-[#1A73E8]" aria-hidden="true" />
                <span>Maps</span>
              </a>
            ) : (
              <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold opacity-50">
                <MapPin className="h-4 w-4" /> Maps
              </span>
            )}
            {wUrl ? (
              <a
                href={wUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); trackEvent("waze_clicked", { deal_id: deal.id, store_id: store?.id }); }}
                aria-label="Atvērt Waze navigāciju"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold transition hover:bg-muted active:scale-[0.98]"
              >
                <Navigation className="h-4 w-4 text-[#33CCFF]" aria-hidden="true" />
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
