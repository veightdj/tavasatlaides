import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Eye, MousePointerClick, Percent, Heart, Share2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/use-i18n";

type StatusFilter = "all" | "active" | "draft" | "expired";
const isExpired = (ad: any) => !!ad.ends_at && new Date(ad.ends_at).getTime() <= Date.now();

export const Route = createFileRoute("/_authenticated/ads/")({
  component: AdsList,
});

type Metrics = { views: number; clicks: number; saves: number; shares: number };

async function loadMetrics(adIds: string[]): Promise<Record<string, Metrics>> {
  const empty: Record<string, Metrics> = {};
  adIds.forEach((id) => (empty[id] = { views: 0, clicks: 0, saves: 0, shares: 0 }));
  if (adIds.length === 0) return empty;

  const tables = [
    { name: "ad_views", key: "views" as const },
    { name: "ad_clicks", key: "clicks" as const },
    { name: "ad_saves", key: "saves" as const },
    { name: "ad_shares", key: "shares" as const },
  ];
  await Promise.all(
    tables.map(async ({ name, key }) => {
      const { data } = await supabase.from(name as any).select("ad_id").in("ad_id", adIds);
      (data ?? []).forEach((row: any) => {
        if (empty[row.ad_id]) empty[row.ad_id][key]++;
      });
    })
  );
  return empty;
}

function AdsList() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("stores").select("id,name").eq("owner_id", user!.id).maybeSingle()).data,
  });

  const { data: ads = [] } = useQuery({
    queryKey: ["my-ads", store?.id],
    enabled: !!store,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads").select("*").eq("store_id", store!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const adIds = ads.map((a) => a.id);
  const { data: metrics } = useQuery({
    queryKey: ["my-ad-metrics", adIds.join(",")],
    enabled: adIds.length > 0,
    queryFn: () => loadMetrics(adIds),
  });

  // Realtime: refresh metrics on any new tracking event
  useEffect(() => {
    if (adIds.length === 0) return;
    const channel = supabase
      .channel("ad-metrics")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_views" }, () => qc.invalidateQueries({ queryKey: ["my-ad-metrics"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_clicks" }, () => qc.invalidateQueries({ queryKey: ["my-ad-metrics"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_saves" }, () => qc.invalidateQueries({ queryKey: ["my-ad-metrics"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ad_shares" }, () => qc.invalidateQueries({ queryKey: ["my-ad-metrics"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adIds.join(","), qc]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.common.deleted);
      qc.invalidateQueries({ queryKey: ["my-ads", store?.id] });
    },
  });

  if (!store) return <div>{t.merchant.setupStore} → <Link to="/store" className="text-primary">{t.merchant.store}</Link></div>;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredAds = useMemo(() => {
    if (statusFilter === "all") return ads;
    if (statusFilter === "expired") return ads.filter(isExpired);
    if (statusFilter === "draft") return ads.filter((a) => a.status === "draft" && !isExpired(a));
    return ads.filter((a) => a.status === statusFilter);
  }, [ads, statusFilter]);

  if (!store) return <div>{t.merchant.setupStore} → <Link to="/store" className="text-primary">{t.merchant.store}</Link></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.merchant.ads}</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px] h-11 md:h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild className="h-11 md:h-10"><Link to="/ads/new"><Plus className="h-4 w-4 mr-1" />{t.merchant.newAd}</Link></Button>
        </div>
      </div>

      {ads.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          {t.merchant.noAds}
        </div>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <AdRow
              key={ad.id}
              ad={ad}
              metrics={metrics?.[ad.id] ?? { views: 0, clicks: 0, saves: 0, shares: 0 }}
              t={t}
              onDelete={() => confirm(t.merchant.confirmDelete) && del.mutate(ad.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdRow({ ad, metrics: m, t, onDelete }: { ad: any; metrics: Metrics; t: any; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ctr = m.views > 0 ? Math.round((m.clicks / m.views) * 1000) / 10 : 0;
  return (
    <div className="rounded-2xl border bg-card p-3 md:p-4 space-y-3 md:space-y-4">
      <div className="flex items-center gap-3">
        {ad.cover_image_url ? (
          <img src={ad.cover_image_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-gradient-warm shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{ad.title}</h3>
            <Badge variant={ad.status === "active" ? "default" : "secondary"}>
              {ad.status === "active" ? t.merchant.statusActive : ad.status === "paused" ? t.merchant.statusPaused : t.merchant.statusDraft}
            </Badge>
            {ad.discount_pct && <Badge variant="outline">-{ad.discount_pct}%</Badge>}
          </div>
          {ad.ends_at && <p className="text-xs text-muted-foreground mt-1">{t.deals.validUntil}: {new Date(ad.ends_at).toLocaleDateString()}</p>}
        </div>
        <Button asChild size="sm" variant="ghost" className="h-11 w-11 p-0 shrink-0"><Link to="/ads/$id" params={{ id: ad.id }}><Edit className="h-4 w-4" /></Link></Button>
        <Button size="sm" variant="ghost" className="h-11 w-11 p-0 shrink-0" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Mobile: 3 key metrics + tap to expand. Desktop: all 5. */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <MetricCard icon={Eye} label={t.merchant.stats.views} value={m.views} />
        <MetricCard icon={MousePointerClick} label={t.merchant.stats.clicks} value={m.clicks} />
        <MetricCard icon={Percent} label={t.merchant.stats.ctr} value={`${ctr}%`} />
        <MetricCard icon={Heart} label={t.merchant.stats.saves} value={m.saves} className={open ? "" : "hidden sm:block"} />
        <MetricCard icon={Share2} label={t.merchant.stats.shares} value={m.shares} className={open ? "" : "hidden sm:block"} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="sm:hidden w-full inline-flex items-center justify-center gap-1 min-h-[44px] text-xs font-medium text-muted-foreground rounded-lg hover:bg-muted/60 active:bg-muted"
        aria-expanded={open}
      >
        {open ? "—" : "+"} {t.merchant.stats.saves} · {t.merchant.stats.shares}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: number | string; className?: string }) {
  return (
    <div className={`rounded-xl border bg-background/60 p-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
