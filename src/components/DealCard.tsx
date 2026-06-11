import { Link } from "@tanstack/react-router";
import { Heart, LocateFixed, BadgeCheck, Clock, ArrowRight } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { useI18n } from "@/i18n/use-i18n";

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
  } | null;
};

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

export function DealCard({ deal, distanceKm }: { deal: Deal; distanceKm?: number }) {
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
      <header className="flex items-start gap-3 p-3 pb-2">
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
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {categoryLabel}
            {distLabel && (
              <>
                <span className="mx-1.5 opacity-50">•</span>
                <span className="inline-flex items-center gap-1">
                  <LocateFixed className="h-3 w-3 text-primary" />
                  {distLabel}
                </span>
              </>
            )}
          </p>
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
            className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full bg-gradient-warm" />
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
      </div>
    </article>
  );
}
