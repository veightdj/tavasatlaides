import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/deals")({
  head: () => ({
    meta: [
      { title: "Admin · Deals" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDealsPage,
});

type Deal = {
  id: string;
  title: string;
  category: string;
  status: string;
  is_hidden: boolean;
  deleted_at: string | null;
  created_at: string;
  store_id: string;
  stores?: { name: string } | null;
};

type Filter = "active" | "hidden" | "deleted" | "all";
type SortKey = "title" | "created_at" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

function AdminDealsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<null | { kind: "soft" | "hard"; ids: string[] }>(null);

  const { data: categories } = useQuery({
    queryKey: ["admin-deals-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("ads").select("category").not("category", "is", null);
      return Array.from(new Set((data ?? []).map((d: any) => d.category as string).filter(Boolean))).sort();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deals", filter, search, page, sortKey, sortDir, categoryFilter],
    queryFn: async () => {
      let q = supabase
        .from("ads")
        .select("id, title, category, status, is_hidden, deleted_at, created_at, store_id, stores(name)", { count: "exact" });

      if (filter === "active") q = q.is("deleted_at", null).eq("is_hidden", false).eq("status", "active");
      else if (filter === "hidden") q = q.is("deleted_at", null).eq("is_hidden", true);
      else if (filter === "deleted") q = q.not("deleted_at", "is", null);

      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);

      q = q.order(sortKey, { ascending: sortDir === "asc" }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as Deal[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-deals"] });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runUpdate = async (ids: string[], patch: Record<string, any>, label: string) => {
    const { error } = await supabase.from("ads").update(patch).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${label} (${ids.length})`);
    setSelected(new Set());
    refresh();
  };

  const hide = (ids: string[]) => runUpdate(ids, { is_hidden: true }, "Hidden");
  const unhide = (ids: string[]) => runUpdate(ids, { is_hidden: false }, "Unhidden");
  const softDelete = (ids: string[]) => runUpdate(ids, { deleted_at: new Date().toISOString() }, "Moved to trash");
  const restore = (ids: string[]) => runUpdate(ids, { deleted_at: null }, "Restored");

  const hardDelete = async (ids: string[]) => {
    const { error } = await supabase.from("ads").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Permanently deleted (${ids.length})`);
    setSelected(new Set());
    refresh();
  };

  const selIds = useMemo(() => Array.from(selected), [selected]);

  return (
    <AdminShell title="Deals">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-3 flex flex-col md:flex-row gap-2 md:items-center justify-between border-b">
          <div className="flex gap-2 flex-1 min-w-0 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-8"
              />
            </div>
            <Select value={filter} onValueChange={(v: Filter) => { setFilter(v); setPage(0); setSelected(new Set()); }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground mr-1">{selIds.length} selected</span>
              {filter !== "deleted" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => hide(selIds)}><EyeOff className="h-3.5 w-3.5" /> Hide</Button>
                  <Button size="sm" variant="outline" onClick={() => unhide(selIds)}><Eye className="h-3.5 w-3.5" /> Unhide</Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmAction({ kind: "soft", ids: selIds })}><Trash2 className="h-3.5 w-3.5" /> Trash</Button>
                </>
              )}
              {filter === "deleted" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => restore(selIds)}><RotateCcw className="h-3.5 w-3.5" /> Restore</Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ kind: "hard", ids: selIds })}><X className="h-3.5 w-3.5" /> Delete</Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 w-10"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></th>
                <SortableTh label="Title" k="title" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <th className="p-3 hidden md:table-cell">Company</th>
                <th className="p-3 hidden md:table-cell">Category</th>
                <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableTh label="Created" k="created_at" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <th className="p-3 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No deals found.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></td>
                  <td className="p-3 font-medium">
                    <a href={`/deals/${r.id}`} target="_blank" rel="noreferrer" className="hover:underline">{r.title}</a>
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{r.stores?.name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{r.category}</td>
                  <td className="p-3"><StatusBadge hidden={r.is_hidden} deleted={!!r.deleted_at} status={r.status} /></td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    {r.deleted_at ? (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => restore([r.id])} aria-label="Restore"><RotateCcw className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmAction({ kind: "hard", ids: [r.id] })} aria-label="Delete"><X className="h-4 w-4 text-destructive" /></Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => (r.is_hidden ? unhide([r.id]) : hide([r.id]))} aria-label={r.is_hidden ? "Unhide" : "Hide"}>
                          {r.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmAction({ kind: "soft", ids: [r.id] })} aria-label="Trash"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 flex items-center justify-between border-t text-sm">
          <span className="text-muted-foreground">{data?.count ?? 0} total</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
            <span className="text-muted-foreground">Page {page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.kind === "hard" ? "Permanently delete?" : "Move to trash?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind === "hard"
                ? `This will permanently delete ${confirmAction?.ids.length} deal${confirmAction?.ids.length === 1 ? "" : "s"} and cannot be undone.`
                : `${confirmAction?.ids.length} deal${confirmAction?.ids.length === 1 ? "" : "s"} will be soft-deleted and hidden from the site. You can restore them from the Deleted tab.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.kind === "hard" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.kind === "hard") hardDelete(confirmAction.ids);
                else softDelete(confirmAction.ids);
                setConfirmAction(null);
              }}
            >
              {confirmAction?.kind === "hard" ? "Delete" : "Move to trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function SortableTh({ label, k, sortKey, sortDir, onClick }: { label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir; onClick: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th className="p-3">
      <button onClick={() => onClick(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {active && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function StatusBadge({ hidden, deleted, status }: { hidden: boolean; deleted: boolean; status: string }) {
  if (deleted) return <span className="inline-flex rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">Deleted</span>;
  if (hidden) return <span className="inline-flex rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">Hidden</span>;
  if (status === "active") return <span className="inline-flex rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">Active</span>;
  return <span className="inline-flex rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">{status}</span>;
}
