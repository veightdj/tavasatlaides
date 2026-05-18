import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Eye, Store, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();

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
      const { data: ads } = await supabase.from("ads").select("id,status").eq("store_id", store!.id);
      const ids = (ads ?? []).map((a) => a.id);
      let views = 0;
      if (ids.length) {
        const { count } = await supabase.from("ad_views").select("id", { count: "exact", head: true }).in("ad_id", ids);
        views = count ?? 0;
      }
      const active = (ads ?? []).filter((a) => a.status === "active").length;
      return { total: ads?.length ?? 0, active, views };
    },
  });

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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
        <p className="text-muted-foreground">{store.city}</p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label={t.merchant.stats.total} value={stats?.total ?? 0} icon={Megaphone} />
        <Stat label={t.merchant.stats.active} value={stats?.active ?? 0} icon={Megaphone} />
        <Stat label={t.merchant.stats.views} value={stats?.views ?? 0} icon={Eye} />
      </div>

      <div className="flex gap-3">
        <Button asChild><Link to="/ads/new">{t.merchant.newAd}</Link></Button>
        <Button asChild variant="outline"><Link to="/ads">{t.merchant.ads}</Link></Button>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
