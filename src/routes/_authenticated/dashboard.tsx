import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Megaphone, Eye, Store, ArrowRight, MousePointerClick, Heart, Share2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["my-stats", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data: ads } = await supabase
        .from("ads")
        .select("id,title,status,cover_image_url,discount_pct")
        .eq("store_id", store!.id);
      const list = ads ?? [];
      const ids = list.map((a) => a.id);

      const counts = { views: 0, clicks: 0, saves: 0, shares: 0 };
      const perAd: Record<string, { clicks: number; views: number }> = {};
      ids.forEach((id) => (perAd[id] = { clicks: 0, views: 0 }));

      if (ids.length) {
        const [{ data: v }, { data: c }, { data: s }, { data: sh }] = await Promise.all([
          supabase.from("ad_views").select("ad_id").in("ad_id", ids),
          supabase.from("ad_clicks").select("ad_id").in("ad_id", ids),
          supabase.from("ad_saves").select("ad_id").in("ad_id", ids),
          supabase.from("ad_shares").select("ad_id").in("ad_id", ids),
        ]);
        (v ?? []).forEach((r: any) => { counts.views++; if (perAd[r.ad_id]) perAd[r.ad_id].views++; });
        (c ?? []).forEach((r: any) => { counts.clicks++; if (perAd[r.ad_id]) perAd[r.ad_id].clicks++; });
        (s ?? []).forEach(() => counts.saves++);
        (sh ?? []).forEach(() => counts.shares++);
      }

      const top = list
        .map((a) => ({ ...a, clicks: perAd[a.id]?.clicks ?? 0, views: perAd[a.id]?.views ?? 0 }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      return {
        total: list.length,
        active: list.filter((a) => a.status === "active").length,
        ...counts,
        top,
      };
    },
  });

  // Realtime updates
  useEffect(() => {
    if (!store?.id) return;
    const channel = supabase
      .channel("dashboard-metrics")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_views" }, () => qc.invalidateQueries({ queryKey: ["my-stats"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_clicks" }, () => qc.invalidateQueries({ queryKey: ["my-stats"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_saves" }, () => qc.invalidateQueries({ queryKey: ["my-stats"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_shares" }, () => qc.invalidateQueries({ queryKey: ["my-stats"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [store?.id, qc]);

  if (!store) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-brand-soft p-10 text-center">
        <Store className="h-10 w-10 text-primary mx-auto" />
        <h2 className="mt-4 text-xl font-bold">{t.merchant.setupStore}</h2>
        <p className="mt-2 text-muted-foreground">{t.merchant.setupStoreSub}</p>
        <Button asChild className="mt-5"><Link to="/store">{t.merchant.setupStore} <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
      </div>
    );
  }

  const ctr = (stats?.views ?? 0) > 0 ? Math.round(((stats!.clicks / stats!.views) * 1000)) / 10 : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{store.name}</h1>
        <p className="text-muted-foreground">{store.city}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label={t.merchant.stats.total} value={stats?.total ?? 0} icon={Megaphone} />
        <Stat label={t.merchant.stats.active} value={stats?.active ?? 0} icon={Megaphone} />
        <Stat label={t.merchant.stats.views} value={stats?.views ?? 0} icon={Eye} />
        <Stat label={t.merchant.stats.clicks} value={stats?.clicks ?? 0} icon={MousePointerClick} />
        <Stat label={t.merchant.stats.ctr} value={`${ctr}%`} icon={TrendingUp} />
        <Stat label={t.merchant.stats.saves} value={stats?.saves ?? 0} icon={Heart} />
      </div>

      <section className="rounded-2xl border bg-card p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> {t.merchant.stats.topDeals}
            </h2>
            <p className="text-xs text-muted-foreground">{t.merchant.stats.topDealsSub}</p>
          </div>
          <Share2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </div>

        {!stats?.top?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t.merchant.stats.noData}</p>
        ) : (
          <ol className="space-y-2">
            {stats.top.map((ad, i) => {
              const adCtr = ad.views > 0 ? Math.round((ad.clicks / ad.views) * 1000) / 10 : 0;
              return (
                <li key={ad.id}>
                  <Link
                    to="/ads/$id"
                    params={{ id: ad.id }}
                    className="flex items-center gap-3 rounded-xl border bg-background/60 p-3 hover:border-primary transition"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary font-bold text-sm">
                      {i + 1}
                    </span>
                    {ad.cover_image_url ? (
                      <img src={ad.cover_image_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gradient-warm shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{ad.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{ad.clicks}</span>
                        <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{ad.views}</span>
                        <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{adCtr}%</span>
                      </div>
                    </div>
                    {ad.discount_pct && <Badge variant="outline" className="shrink-0">-{ad.discount_pct}%</Badge>}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="flex gap-3 flex-wrap">
        <Button asChild><Link to="/ads/new">{t.merchant.newAd}</Link></Button>
        <Button asChild variant="outline"><Link to="/ads">{t.merchant.ads}</Link></Button>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
