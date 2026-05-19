import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Heart, MapPin, Share2, Calendar, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/use-i18n";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/deals/$id")({
  component: DealDetail,
});

function DealDetail() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { has, toggle } = useFavorites();

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*, stores(*), ad_images(url, sort_order)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const trackView = useMutation({
    mutationFn: async () => {
      await supabase.from("ad_views").insert({ ad_id: id });
    },
  });

  useEffect(() => {
    if (deal?.status === "active") trackView.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">{t.common.loading}</div>;
  if (error || !deal) throw notFound();

  const saved = has(deal.id);
  const images = [deal.cover_image_url, ...((deal.ad_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => i.url))].filter(Boolean);
  const store = deal.stores as any;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
            {images[0] ? (
              <img src={images[0]} alt={deal.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-warm" />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.slice(1).map((url, i) => (
                <img key={i} src={url} alt="" className="aspect-square rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{(t.cat as any)[deal.category] ?? deal.category}</Badge>
            {deal.discount_pct ? <Badge className="bg-primary">-{deal.discount_pct}% {t.common.off}</Badge> : null}
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-balance">{deal.title}</h1>

          {(deal.price_sale || deal.price_original) && (
            <div className="mt-4 flex items-baseline gap-3">
              {deal.price_sale != null && <span className="text-3xl font-bold text-primary">€{formatPrice(deal.price_sale)}</span>}
              {deal.price_original != null && <span className="text-lg text-muted-foreground line-through">€{formatPrice(deal.price_original)}</span>}
            </div>
          )}

          {deal.description && <p className="mt-5 text-foreground/80 whitespace-pre-line">{deal.description}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => toggle(deal.id)} variant={saved ? "default" : "outline"}>
              <Heart className={`h-4 w-4 mr-2 ${saved ? "fill-current" : ""}`} />
              {saved ? t.deals.saved : t.deals.save}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (navigator.share) navigator.share({ title: deal.title, url: window.location.href });
                else navigator.clipboard.writeText(window.location.href);
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />{t.deals.shareTitle}
            </Button>
          </div>

          {/* Validity */}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {deal.starts_at && (
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{t.deals.activeAt}: {new Date(deal.starts_at).toLocaleDateString()}</div>
            )}
            {deal.ends_at && (
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{t.deals.validUntil}: {new Date(deal.ends_at).toLocaleDateString()}</div>
            )}
          </div>

          {/* Store */}
          {store && (
            <Link to="/stores/$id" params={{ id: store.id }} className="mt-8 block rounded-2xl border border-border p-5 hover:border-primary transition">
              <div className="flex items-start gap-4">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-brand-soft grid place-items-center text-primary font-bold text-xl">{store.name[0]}</div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{t.deals.viewStore}</p>
                  <h3 className="font-semibold">{store.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {store.address}, {store.city}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
