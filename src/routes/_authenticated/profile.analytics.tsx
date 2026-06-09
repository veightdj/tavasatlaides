import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, MousePointerClick, TrendingUp, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile/analytics")({
  head: () => ({ meta: [{ title: "Performance — TavasAtlaides" }, { name: "robots", content: "noindex" }] }),
  component: Analytics,
});

function Analytics() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["analytics-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user!.id).maybeSingle();
      if (!store) return null;
      const { data: ads } = await supabase.from("ads").select("id").eq("store_id", store.id);
      const ids = (ads ?? []).map((a) => a.id);
      if (!ids.length) return { saves: 0, clicks: 0, views: 0, shares: 0 };
      const [{ count: saves }, { count: clicks }, { count: views }, { count: shares }] = await Promise.all([
        supabase.from("ad_saves").select("ad_id", { count: "exact", head: true }).in("ad_id", ids),
        supabase.from("ad_clicks").select("ad_id", { count: "exact", head: true }).in("ad_id", ids),
        supabase.from("ad_views").select("ad_id", { count: "exact", head: true }).in("ad_id", ids),
        supabase.from("ad_shares").select("ad_id", { count: "exact", head: true }).in("ad_id", ids),
      ]);
      return { saves: saves ?? 0, clicks: clicks ?? 0, views: views ?? 0, shares: shares ?? 0 };
    },
  });

  if (!data) return <p className="text-sm text-muted-foreground">No store yet. <Link to="/profile/store" className="underline">Set up store</Link>.</p>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-muted-foreground"><Link to="/profile" className="underline">Profile</Link> / Performance</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Performance</h1>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Heart} label="Saves" value={data.saves} />
        <Stat icon={MousePointerClick} label="Clicks" value={data.clicks} />
        <Stat icon={Eye} label="Views" value={data.views} />
        <Stat icon={TrendingUp} label="Shares" value={data.shares} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
