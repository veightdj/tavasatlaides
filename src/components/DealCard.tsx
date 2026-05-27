import { Link } from "@tanstack/react-router";
import { Heart, MapPin, LocateFixed } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { useI18n } from "@/i18n/use-i18n";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { formatDistance } from "@/lib/distance";
import { ShareMenu } from "@/components/ShareMenu";

type Deal = {
  id: string;
  title: string;
  category: string;
  discount_pct: number | null;
  price_original: number | null;
  price_sale: number | null;
  cover_image_url: string | null;
  ends_at: string | null;
  stores?: { id: string; name: string; city: string; slug: string } | null;
};

export function DealCard({ deal, distanceKm }: { deal: Deal; distanceKm?: number }) {
  const { has, toggle } = useFavorites();
  const { t } = useI18n();
  const saved = has(deal.id);
  const endsSoon = deal.ends_at && new Date(deal.ends_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 3;
  const distLabel =
    typeof distanceKm === "number" && Number.isFinite(distanceKm)
      ? formatDistance(distanceKm, t.deals.distanceKm, t.deals.awayLabel)
      : null;

  return (
    <Link
      to="/deals/$id"
      params={{ id: deal.id }}
      className="group block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition"
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {deal.cover_image_url ? (
          <img
            src={deal.cover_image_url}
            alt={deal.title}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full bg-gradient-warm" />
        )}
        {deal.discount_pct ? (
          <div className="absolute top-3 left-3 rounded-full bg-primary text-primary-foreground text-sm font-bold px-3 py-1 shadow">
            -{deal.discount_pct}%
          </div>
        ) : null}
        {distLabel && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold shadow-sm border">
            <LocateFixed className="h-3 w-3 text-primary" />
            {distLabel}
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); toggle(deal.id); }}
          className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur hover:scale-110 transition"
          aria-label={saved ? t.deals.saved : t.deals.save}
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : "text-foreground"}`} />
        </button>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {deal.stores?.city && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{deal.stores.city}</span>
          )}
          {endsSoon && <Badge variant="destructive" className="text-[10px] uppercase">⏱</Badge>}
        </div>
        <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition">{deal.title}</h3>
        {deal.stores?.name && <p className="text-sm text-muted-foreground line-clamp-1">{deal.stores.name}</p>}
        {(deal.price_sale || deal.price_original) && (
          <div className="flex items-baseline gap-2 pt-1">
            {deal.price_sale != null && <span className="text-lg font-bold text-primary">€{formatPrice(deal.price_sale)}</span>}
            {deal.price_original != null && (
              <span className="text-sm text-muted-foreground line-through">€{formatPrice(deal.price_original)}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
