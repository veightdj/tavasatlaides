import { Link } from "@tanstack/react-router";
import { Heart, LocateFixed, BadgeCheck, Clock, ArrowRight, Navigation, MapPin } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { useI18n } from "@/i18n/use-i18n";
import { toast } from "sonner";

import { formatDistance } from "@/lib/distance";
import { DealShareButton } from "@/components/DealShareButton";

type Deal = {
  id: string;
  title: string;
  category: string;
  discount_pct: number | null;
  price_original: number | null;
  price_sale: number | null;
  cover_image_url: string | null;
  ends_at: string | null;
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

function openGoogleMaps(store: Deal["stores"], dealId: string) {
  const dest = buildDestination(store);
  if (!dest) {
    toast.error("Atrašanās vieta nav pieejama");
    return;
  }
  trackEvent("google_maps_clicked", { deal_id: dealId, store_id: store?.id, has_coords: dest.hasCoords });
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function openWaze(store: Deal["stores"], dealId: string) {
  const dest = buildDestination(store);
  if (!dest) {
    toast.error("Atrašanās vieta nav pieejama");
    return;
  }
  trackEvent("waze_clicked", { deal_id: dealId, store_id: store?.id, has_coords: dest.hasCoords });
  const url = dest.hasCoords
    ? `https://waze.com/ul?ll=${encodeURIComponent(dest.query)}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(dest.query)}&navigate=yes`;
  window.open(url, "_blank", "noopener,noreferrer");
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

function formatEndsAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString("lv-LV", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function DealCard({ deal, distanceKm, showNavigation = true }: { deal: Deal; distanceKm?: number; showNavigation?: boolean }) {
  const { has, toggle } = useFavorites();
  const { t } = useI18n();
  const saved = has(deal.id);
  const store = deal.stores;
  const distLabel =
    typeof distanceKm === "number" && Number.isFinite(distanceKm)
      ? formatDistance(distanceKm, t.deals.distanceKm, t.deals.awayLabel)
      : null;
  const categoryLabel = CATEGORY_LABEL[store?.category ?? deal.category] ?? (store?.category ?? deal.category);
  const endsLabel = formatEndsAt(deal.ends_at);

  return (
    <article className="group relative flex flex-col rounded-2xl bg-card border border-border/60 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.08)] hover:shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 transition-all overflow-hidden">
      {/* Header */}
      <header className="flex items-start gap-3 px-3 pt-4 pb-2">
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
              className="h-14 w-14 rounded-2xl object-cover ring-1 ring-border"
              loading="lazy"
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-gradient-warm grid place-items-center text-primary-foreground font-bold text-lg ring-1 ring-border">
              {store?.name?.[0] ?? "•"}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/stores/$id"
            params={{ id: store?.id ?? "" }}
            className="flex items-center gap-1.5"
            onClick={(e) => { if (!store?.id) e.preventDefault(); }}
          >
            <h3 className="truncate text-[15px] font-bold leading-tight">{store?.name ?? "—"}</h3>
            {store?.is_verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500 fill-sky-500/15" aria-label="Verificēts partneris" />
            )}
          </Link>
          <div className="mt-0.5 flex items-center text-xs text-muted-foreground">
            <span className="truncate">{categoryLabel}</span>
            {distLabel && (
              <>
                <span className="mx-1.5 opacity-50">•</span>
                <span className="inline-flex items-center gap-1 truncate">
                  <LocateFixed className="h-3 w-3 text-primary" />
                  {distLabel}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toggle(deal.id); }}
          className="shrink-0 grid h-9 w-9 place-items-center rounded-full hover:bg-muted transition"
          aria-label={saved ? t.deals.saved : t.deals.save}
        >
          <Heart className={`h-5 w-5 ${saved ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
        </button>
      </header>

      {/* Image */}
      <Link
        to="/deals/$id"
        params={{ id: deal.id }}
        className="relative mx-3 block overflow-hidden rounded-2xl bg-muted aspect-[4/3]"
      >
        {deal.cover_image_url ? (
          <img
            src={deal.cover_image_url}
            alt={deal.title}
            loading="lazy"
            className="h-full w-full object-cover rounded-t-xl group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full bg-gradient-warm rounded-t-xl" />
        )}
        {deal.discount_pct ? (
          <div className="absolute top-3 right-3 rounded-xl bg-primary text-primary-foreground text-sm font-extrabold px-2.5 py-1 shadow-lg shadow-primary/30">
            -{deal.discount_pct}%
          </div>
        ) : null}
        <DealShareButton
          dealId={deal.id}
          title={deal.title}
          description={store?.name}
          discountPct={deal.discount_pct}
          className="absolute top-3 left-3 h-9 w-9 min-h-0 min-w-0"
        />
      </Link>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3 pt-3">
        <Link to="/deals/$id" params={{ id: deal.id }}>
          <h4 className="text-[15px] font-semibold leading-snug line-clamp-2 group-hover:text-primary transition">
            {deal.title}
          </h4>
        </Link>

        {endsLabel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Līdz {endsLabel}</span>
          </div>
        )}

        <Link
          to="/deals/$id"
          params={{ id: deal.id }}
          className="mt-1 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.98] transition"
        >
          Skatīt akciju
          <ArrowRight className="h-4 w-4" />
        </Link>

        {(() => {
          const hasLocation = !!buildDestination(store);
          return (
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!hasLocation}
                onClick={(e) => { e.preventDefault(); openGoogleMaps(store, deal.id); }}
                aria-label="Atvērt Google Maps navigāciju"
                title={hasLocation ? "Atvērt Google Maps" : "Atrašanās vieta nav pieejama"}
                className="inline-flex h-10 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MapPin className="h-4 w-4 text-[#1A73E8]" aria-hidden="true" />
                <span>Google Maps</span>
              </button>
              <button
                type="button"
                disabled={!hasLocation}
                onClick={(e) => { e.preventDefault(); openWaze(store, deal.id); }}
                aria-label="Atvērt Waze navigāciju"
                title={hasLocation ? "Atvērt Waze" : "Atrašanās vieta nav pieejama"}
                className="inline-flex h-10 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Navigation className="h-4 w-4 text-[#33CCFF]" aria-hidden="true" />
                <span>Waze</span>
              </button>
            </div>
          );
        })()}
      </div>
    </article>
  );
}
