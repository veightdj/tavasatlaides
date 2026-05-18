import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/_authenticated/ads/")({
  component: AdsList,
});

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.merchant.ads}</h1>
        <Button asChild><Link to="/ads/new"><Plus className="h-4 w-4 mr-1" />{t.merchant.newAd}</Link></Button>
      </div>

      {ads.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          {t.merchant.noAds}
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="rounded-xl border bg-card p-4 flex items-center gap-4">
              {ad.cover_image_url ? (
                <img src={ad.cover_image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gradient-warm" />
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
              <Button asChild size="sm" variant="ghost"><Link to="/ads/$id" params={{ id: ad.id }}><Edit className="h-4 w-4" /></Link></Button>
              <Button size="sm" variant="ghost" onClick={() => confirm(t.merchant.confirmDelete) && del.mutate(ad.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
