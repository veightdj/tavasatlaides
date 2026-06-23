import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Edit, Trash2, Eye, MousePointerClick, Percent, Heart, Share2,
  ChevronLeft, ChevronRight, MoreHorizontal, Copy, Pause, Play, Search,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n/use-i18n";
import { AdEditor } from "@/components/merchant/AdEditor";

type StatusFilter = "all" | "active" | "paused" | "draft" | "expired";
type SortKey = "title" | "status" | "views" | "clicks" | "redemptions" | "ctr" | "created_at";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;
const isExpired = (ad: any) =>
  !!ad.ends_at && new Date(ad.ends_at).getTime() <= Date.now();

export const Route = createFileRoute("/_authenticated/profile/ads/")({
  component: AdsList,
});

type Metrics = { views: number; clicks: number; redemptions: number; shares: number };

async function loadMetrics(adIds: string[]): Promise<Record<string, Metrics>> {
  const empty: Record<string, Metrics> = {};
  adIds.forEach((id) => (empty[id] = { views: 0, clicks: 0, redemptions: 0, shares: 0 }));
  if (adIds.length === 0) return empty;
  const tables = [
    { name: "ad_views", key: "views" as const },
    { name: "ad_clicks", key: "clicks" as const },
    { name: "ad_saves", key: "redemptions" as const },
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

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "delete"; id: string; title: string }
    | { kind: "pause"; id: string; title: string; nextStatus: "paused" | "active" }
    | null
  >(null);

  useEffect(() => { setPage(0); }, [statusFilter, search]);

  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("stores").select("id,name,category").eq("owner_id", user!.id).maybeSingle()).data,
  });

  // Load all ads for the store (search/sort/paginate client-side after we have metrics)
  const { data: ads = [] } = useQuery({
    queryKey: ["my-ads", store?.id, statusFilter],
    enabled: !!store,
    queryFn: async () => {
      let q = supabase
        .from("ads")
        .select("*")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });

      if (statusFilter === "active") q = q.eq("status", "active");
      else if (statusFilter === "paused") q = q.eq("status", "paused");
      else if (statusFilter === "draft") q = q.eq("status", "draft");
      else if (statusFilter === "expired") {
        q = q.lte("ends_at", new Date().toISOString()).not("ends_at", "is", null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const adIds = ads.map((a) => a.id);
  const adIdsKey = adIds.join(",");
  const { data: metrics } = useQuery({
    queryKey: ["my-ad-metrics", adIdsKey],
    enabled: adIds.length > 0,
    queryFn: () => loadMetrics(adIds),
  });

  // Realtime metrics refresh
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
  }, [adIdsKey, qc]);

  // Search + sort
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const enriched = ads.map((ad) => {
      const m = metrics?.[ad.id] ?? { views: 0, clicks: 0, redemptions: 0, shares: 0 };
      const ctr = m.views > 0 ? (m.clicks / m.views) * 100 : 0;
      return { ad, m, ctr };
    });
    const filtered = term
      ? enriched.filter(({ ad }) => ad.title?.toLowerCase().includes(term))
      : enriched;
    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "title": av = a.ad.title ?? ""; bv = b.ad.title ?? ""; break;
        case "status": av = a.ad.status; bv = b.ad.status; break;
        case "views": av = a.m.views; bv = b.m.views; break;
        case "clicks": av = a.m.clicks; bv = b.m.clicks; break;
        case "redemptions": av = a.m.redemptions; bv = b.m.redemptions; break;
        case "ctr": av = a.ctr; bv = b.ctr; break;
        default: av = a.ad.created_at; bv = b.ad.created_at;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return filtered;
  }, [ads, metrics, search, sortKey, sortDir]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Aggregated summary
  const summary = useMemo(() => {
    return rows.reduce(
      (acc, { ad, m, ctr }) => {
        acc.views += m.views;
        acc.clicks += m.clicks;
        acc.redemptions += m.redemptions;
        if (ad.status === "active" && !isExpired(ad)) acc.active++;
        acc.ctrSum += ctr;
        return acc;
      },
      { views: 0, clicks: 0, redemptions: 0, active: 0, ctrSum: 0 }
    );
  }, [rows]);
  const avgCtr = rows.length > 0 ? summary.ctrSum / rows.length : 0;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "title" || k === "status" ? "asc" : "desc"); }
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.common.deleted);
      qc.invalidateQueries({ queryKey: ["my-ads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "paused" }) => {
      const { error } = await supabase.from("ads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.common.saved);
      qc.invalidateQueries({ queryKey: ["my-ads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await supabase.from("ads").select("*").eq("id", id).maybeSingle();
      if (e1) throw e1;
      if (!src) throw new Error("Not found");
      const { id: _omit, created_at: _c, updated_at: _u, ...rest } = src as any;
      const payload = {
        ...rest,
        title: `${src.title} (copy)`,
        status: "draft",
        starts_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("ads").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Duplicated");
      qc.invalidateQueries({ queryKey: ["my-ads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!store) {
    return (
      <div>
        {t.merchant.setupStore} →{" "}
        <Link to="/profile/store" className="text-primary">{t.merchant.store}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.merchant.ads}</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your deals and track performance</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="h-11 md:h-10">
          <Plus className="h-4 w-4 mr-1" /> {t.merchant.newAd}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={Plus} label="Active deals" value={summary.active} />
        <SummaryCard icon={Eye} label="Total views" value={summary.views} />
        <SummaryCard icon={MousePointerClick} label="Total clicks" value={summary.clicks} />
        <SummaryCard icon={Heart} label="Redemptions" value={summary.redemptions} sub={`Avg CTR ${avgCtr.toFixed(1)}%`} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 md:h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[160px] h-11 md:h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block rounded-2xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Deal" k="title" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortHead label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortHead label="Views" k="views" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-right" />
              <SortHead label="Clicks" k="clicks" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-right" />
              <SortHead label="Redemptions" k="redemptions" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-right" />
              <SortHead label="CTR" k="ctr" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-right" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {ads.length === 0 ? t.merchant.noAds : "No deals match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map(({ ad, m, ctr }) => {
                const expired = isExpired(ad);
                return (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setEditId(ad.id)}
                        className="flex items-center gap-3 text-left hover:text-primary"
                      >
                        {ad.cover_image_url ? (
                          <img src={ad.cover_image_url} alt="" className="h-10 w-10 rounded-md object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gradient-warm shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[260px]">{ad.title}</div>
                          {ad.ends_at && (
                            <div className="text-xs text-muted-foreground">
                              Ends {new Date(ad.ends_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </button>
                    </TableCell>
                    <TableCell><StatusBadge ad={ad} expired={expired} t={t} /></TableCell>
                    <TableCell className="text-right tabular-nums">{m.views}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.clicks}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.redemptions}</TableCell>
                    <TableCell className="text-right tabular-nums">{ctr.toFixed(1)}%</TableCell>
                    <TableCell>
                      <RowMenu
                        ad={ad}
                        onEdit={() => setEditId(ad.id)}
                        onDuplicate={() => duplicate.mutate(ad.id)}
                        onTogglePause={() =>
                          setConfirm({
                            kind: "pause",
                            id: ad.id,
                            title: ad.title,
                            nextStatus: ad.status === "active" ? "paused" : "active",
                          })
                        }
                        onDelete={() => setConfirm({ kind: "delete", id: ad.id, title: ad.title })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Card list (mobile) */}
      <div className="md:hidden space-y-3">
        {pageRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            {ads.length === 0 ? t.merchant.noAds : "No deals match these filters."}
          </div>
        ) : (
          pageRows.map(({ ad, m, ctr }) => {
            const expired = isExpired(ad);
            return (
              <div key={ad.id} className="rounded-2xl border bg-card p-3 space-y-3">
                <div className="flex items-center gap-3">
                  {ad.cover_image_url ? (
                    <img src={ad.cover_image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gradient-warm shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{ad.title}</div>
                    <div className="mt-1"><StatusBadge ad={ad} expired={expired} t={t} /></div>
                  </div>
                  <RowMenu
                    ad={ad}
                    onEdit={() => setEditId(ad.id)}
                    onDuplicate={() => duplicate.mutate(ad.id)}
                    onTogglePause={() =>
                      setConfirm({
                        kind: "pause",
                        id: ad.id,
                        title: ad.title,
                        nextStatus: ad.status === "active" ? "paused" : "active",
                      })
                    }
                    onDelete={() => setConfirm({ kind: "delete", id: ad.id, title: ad.title })}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Mini icon={Eye} label="Views" value={m.views} />
                  <Mini icon={MousePointerClick} label="Clicks" value={m.clicks} />
                  <Mini icon={Heart} label="Redeem" value={m.redemptions} />
                  <Mini icon={Percent} label="CTR" value={`${ctr.toFixed(1)}%`} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} · {total} total</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.merchant.newAd}</DialogTitle></DialogHeader>
          <AdEditor embedded onSaved={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.merchant.edit}</DialogTitle></DialogHeader>
          {editId && <AdEditor embedded adId={editId} onSaved={() => setEditId(null)} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={confirm?.kind === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirm?.kind === "delete" ? confirm.title : ""}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirm?.kind === "delete") del.mutate(confirm.id);
                setConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pause/resume confirm */}
      <AlertDialog
        open={confirm?.kind === "pause"}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "pause" && confirm.nextStatus === "paused" ? "Pause this deal?" : "Resume this deal?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "pause" && confirm.nextStatus === "paused"
                ? `"${confirm.title}" will be hidden from customers until you resume it.`
                : `"${confirm?.kind === "pause" ? confirm.title : ""}" will become visible to customers again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm?.kind === "pause") setStatus.mutate({ id: confirm.id, status: confirm.nextStatus });
                setConfirm(null);
              }}
            >
              {confirm?.kind === "pause" && confirm.nextStatus === "paused" ? "Pause" : "Resume"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ ad, expired, t }: { ad: any; expired: boolean; t: any }) {
  if (expired) return <Badge variant="destructive">Expired</Badge>;
  if (ad.status === "active") return <Badge>{t.merchant.statusActive}</Badge>;
  if (ad.status === "paused") return <Badge variant="secondary">{t.merchant.statusPaused}</Badge>;
  return <Badge variant="outline">{t.merchant.statusDraft}</Badge>;
}

function SortHead({
  label, k, sortKey, sortDir, onClick, className = "",
}: {
  label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir;
  onClick: (k: SortKey) => void; className?: string;
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label} <Icon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
}

function RowMenu({
  ad, onEdit, onDuplicate, onTogglePause, onDelete,
}: {
  ad: any; onEdit: () => void; onDuplicate: () => void; onTogglePause: () => void; onDelete: () => void;
}) {
  const paused = ad.status === "paused";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}><Copy className="h-4 w-4 mr-2" /> Duplicate</DropdownMenuItem>
        <DropdownMenuItem onClick={onTogglePause}>
          {paused ? <><Play className="h-4 w-4 mr-2" /> Resume</> : <><Pause className="h-4 w-4 mr-2" /> Pause</>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SummaryCard({
  icon: Icon, label, value, sub,
}: { icon: any; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> <span>{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-background/60 p-2">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> <span className="truncate">{label}</span>
      </div>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

// Unused but kept exported elements for potential reuse
export { };
