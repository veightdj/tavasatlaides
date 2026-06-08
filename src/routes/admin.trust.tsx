import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flag, Check, X, ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listDealReports, resolveReport, setStoreTrust } from "@/lib/trust.functions";

export const Route = createFileRoute("/admin/trust")({
  head: () => ({
    meta: [
      { title: "Admin · Trust & Reports" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminTrustPage,
});

function AdminTrustPage() {
  const [tab, setTab] = useState<"reports" | "partners">("reports");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Trust & Reports</h1>
        <p className="text-sm text-muted-foreground">Review user-submitted deal reports and partner trust scores.</p>
      </header>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="reports"><Flag className="h-4 w-4 mr-1.5" />Reports</TabsTrigger>
          <TabsTrigger value="partners"><ShieldCheck className="h-4 w-4 mr-1.5" />Partner trust</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
        <TabsContent value="partners" className="mt-4"><PartnersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ReportsTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed">("open");
  const listFn = useServerFn(listDealReports);
  const resolveFn = useServerFn(resolveReport);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => listFn({ data: { status } }),
  });

  const act = async (id: string, action: "resolved" | "dismissed") => {
    try {
      await resolveFn({ data: { id, action } });
      toast.success(action === "resolved" ? "Marked resolved" : "Dismissed");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["open", "resolved", "dismissed"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s}
          </Button>
        ))}
      </div>
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading…</div> :
        !data?.reports?.length ? <div className="text-center py-12 text-muted-foreground">No reports.</div> :
        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Deal</th>
                <th className="p-3">Store</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Note</th>
                <th className="p-3">When</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.reports.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3"><Link to="/deals/$id" params={{ id: r.ad_id }} className="text-primary hover:underline">{r.ads?.title ?? r.ad_id.slice(0, 8)}</Link></td>
                  <td className="p-3">{r.ads?.stores?.name ?? "—"}</td>
                  <td className="p-3"><Badge variant="outline">{r.reason}</Badge></td>
                  <td className="p-3 max-w-xs truncate">{r.note ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {status === "open" && (
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => act(r.id, "resolved")}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => act(r.id, "dismissed")}><X className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
    </div>
  );
}

function PartnersTab() {
  const qc = useQueryClient();
  const setFn = useServerFn(setStoreTrust);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data: stores, error } = await supabase
        .from("stores")
        .select("id, name, city, owner_id, is_verified, is_blocked")
        .order("name");
      if (error) throw error;
      const owners = Array.from(new Set((stores ?? []).map((s) => s.owner_id)));
      const { data: scores } = await supabase
        .from("partner_trust_scores")
        .select("user_id, score, level")
        .in("user_id", owners.length ? owners : ["00000000-0000-0000-0000-000000000000"]);
      const byOwner = new Map((scores ?? []).map((s: any) => [s.user_id, s]));
      return (stores ?? []).map((s: any) => ({ ...s, trust: byOwner.get(s.owner_id) }));
    },
  });

  const flip = async (storeId: string, patch: { isVerified?: boolean; isBlocked?: boolean }) => {
    try {
      await setFn({ data: { storeId, ...patch } });
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>;
  if (!data?.length) return <div className="text-center py-12 text-muted-foreground">No partners.</div>;

  return (
    <div className="rounded-2xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-3">Store</th>
            <th className="p-3">City</th>
            <th className="p-3">Trust</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s: any) => (
            <tr key={s.id} className="border-t">
              <td className="p-3 font-medium">{s.name}</td>
              <td className="p-3 text-muted-foreground">{s.city}</td>
              <td className="p-3">
                {s.trust ? (
                  <Badge variant={s.trust.level === "gold" ? "default" : "outline"}>
                    {s.trust.level} · {s.trust.score}
                  </Badge>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </td>
              <td className="p-3 text-right">
                <div className="inline-flex gap-1">
                  <Button size="sm" variant={s.is_verified ? "default" : "outline"}
                    onClick={() => flip(s.id, { isVerified: !s.is_verified })}>
                    <ShieldCheck className="h-4 w-4 mr-1" />{s.is_verified ? "Verified" : "Verify"}
                  </Button>
                  <Button size="sm" variant={s.is_blocked ? "destructive" : "outline"}
                    onClick={() => flip(s.id, { isBlocked: !s.is_blocked })}>
                    <ShieldX className="h-4 w-4 mr-1" />{s.is_blocked ? "Blocked" : "Block"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
