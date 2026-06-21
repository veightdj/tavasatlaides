import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createCompany, updateCompany } from "@/lib/admin-companies.functions";

export const Route = createFileRoute("/admin/companies")({
  head: () => ({
    meta: [
      { title: "Admin · Companies" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminCompaniesPage,
});

type Company = {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  address: string | null;
  phone: string | null;
  contact_email: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  is_hidden: boolean;
  deleted_at: string | null;
};

type Filter = "active" | "inactive" | "deleted" | "all";
type SortKey = "name" | "created_at" | "city";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

const emptyForm = {
  name: "",
  description: "",
  category: "",
  city: "",
  address: "",
  phone: "",
  contact_email: "",
  website: "",
  logo_url: "",
  is_hidden: false,
};

type FormState = typeof emptyForm;

function AdminCompaniesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<null | {
    kind: "soft" | "hard";
    ids: string[];
  }>(null);

  const [dialogMode, setDialogMode] = useState<null | { mode: "create" } | { mode: "edit"; id: string }>(null);
  const [viewing, setViewing] = useState<Company | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const createFn = useServerFn(createCompany);
  const updateFn = useServerFn(updateCompany);

  // Distinct categories — cached 5 min
  const { data: categoriesData } = useQuery({
    queryKey: ["admin-companies-categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("category")
        .is("deleted_at", null)
        .order("category")
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.category && set.add(r.category));
      return Array.from(set);
    },
  });
  const allCategories = categoriesData ?? [];

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "admin-companies",
      filter,
      search,
      categoryFilter,
      page,
      sortKey,
      sortDir,
    ],
    queryFn: async () => {
      let q = supabase
        .from("stores")
        .select(
          "id, name, slug, category, city, address, phone, contact_email, website, description, logo_url, created_at, is_hidden, deleted_at",
          { count: "exact" },
        );

      if (filter === "active") q = q.is("deleted_at", null).eq("is_hidden", false);
      else if (filter === "inactive") q = q.is("deleted_at", null).eq("is_hidden", true);
      else if (filter === "deleted") q = q.not("deleted_at", "is", null);

      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      if (categoryFilter !== "__all__") q = q.eq("category", categoryFilter);

      q = q
        .order(sortKey, { ascending: sortDir === "asc" })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Company[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-companies"] });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runUpdate = async (
    ids: string[],
    patch: Partial<Company>,
    label: string,
  ) => {
    const { error } = await supabase.from("stores").update(patch as any).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${label} (${ids.length})`);
    setSelected(new Set());
    refresh();
  };

  const hide = (ids: string[]) => runUpdate(ids, { is_hidden: true }, "Deactivated");
  const unhide = (ids: string[]) => runUpdate(ids, { is_hidden: false }, "Activated");
  const softDelete = (ids: string[]) =>
    runUpdate(ids, { deleted_at: new Date().toISOString() } as any, "Moved to trash");
  const restore = (ids: string[]) => runUpdate(ids, { deleted_at: null } as any, "Restored");

  const hardDelete = async (ids: string[]) => {
    const { error } = await supabase.from("stores").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Permanently deleted (${ids.length})`);
    setSelected(new Set());
    refresh();
  };

  const selIds = useMemo(() => Array.from(selected), [selected]);

  const openCreate = () => {
    setForm(emptyForm);
    setErrors({});
    setDialogMode({ mode: "create" });
  };

  const openEdit = (c: Company) => {
    setForm({
      name: c.name,
      description: c.description ?? "",
      category: c.category,
      city: c.city,
      address: c.address ?? "",
      phone: c.phone ?? "",
      contact_email: c.contact_email ?? "",
      website: c.website ?? "",
      logo_url: c.logo_url ?? "",
      is_hidden: c.is_hidden,
    });
    setErrors({});
    setDialogMode({ mode: "edit", id: c.id });
  };

  const validate = (f: FormState) => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!f.name.trim() || f.name.trim().length < 2) e.name = "Name is required (min 2 chars)";
    if (!f.category.trim()) e.category = "Category is required";
    if (!f.city.trim()) e.city = "City is required";
    if (!f.address.trim()) e.address = "Address is required";
    if (f.contact_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact_email.trim()))
      e.contact_email = "Invalid email";
    if (f.website.trim()) {
      try {
        new URL(f.website.trim());
      } catch {
        e.website = "Must be a valid URL (https://…)";
      }
    }
    return e;
  };

  const submit = async () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      if (dialogMode?.mode === "create") {
        await createFn({ data: form as any });
        toast.success("Company created");
      } else if (dialogMode?.mode === "edit") {
        await updateFn({ data: { id: dialogMode.id, patch: form as any } });
        toast.success("Company updated");
      }
      setDialogMode(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Reset page on filter/search change
  useEffect(() => {
    setPage(0);
  }, [filter, search, categoryFilter, sortKey, sortDir]);

  return (
    <AdminShell title="Companies">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-3 flex flex-col md:flex-row gap-2 md:items-center justify-between border-b">
          <div className="flex gap-2 flex-1 min-w-0 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filter} onValueChange={(v: Filter) => { setFilter(v); setSelected(new Set()); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={`${sortKey}:${sortDir}`}
              onValueChange={(v) => {
                const [k, d] = v.split(":") as [SortKey, SortDir];
                setSortKey(k);
                setSortDir(d);
              }}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at:desc">Newest first</SelectItem>
                <SelectItem value="created_at:asc">Oldest first</SelectItem>
                <SelectItem value="name:asc">Name A–Z</SelectItem>
                <SelectItem value="name:desc">Name Z–A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center">
            {selIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground mr-1">{selIds.length} selected</span>
                {filter !== "deleted" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => hide(selIds)}><EyeOff className="h-3.5 w-3.5" /> Deactivate</Button>
                    <Button size="sm" variant="outline" onClick={() => unhide(selIds)}><Eye className="h-3.5 w-3.5" /> Activate</Button>
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
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Create company</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 w-10"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></th>
                <SortableTh label="Name" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <th className="p-3">Category</th>
                <SortableTh label="City" k="city" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <th className="p-3 hidden md:table-cell">Contact</th>
                <th className="p-3">Status</th>
                <SortableTh label="Created" k="created_at" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <th className="p-3 w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No companies found.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></td>
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      {r.logo_url ? (
                        <img src={r.logo_url} alt="" className="h-6 w-6 rounded object-cover bg-muted" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-muted" aria-hidden />
                      )}
                      <button onClick={() => setViewing(r)} className="hover:underline text-left">{r.name}</button>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.category}</td>
                  <td className="p-3 text-muted-foreground">{r.city}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell text-xs">
                    {r.contact_email || r.phone || "—"}
                  </td>
                  <td className="p-3"><StatusBadge hidden={r.is_hidden} deleted={!!r.deleted_at} /></td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {r.deleted_at ? (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => restore([r.id])} aria-label="Restore"><RotateCcw className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmAction({ kind: "hard", ids: [r.id] })} aria-label="Delete"><X className="h-4 w-4 text-destructive" /></Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setViewing(r)} aria-label="View"><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => (r.is_hidden ? unhide([r.id]) : hide([r.id]))} aria-label={r.is_hidden ? "Activate" : "Deactivate"}>
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
          <span className="text-muted-foreground">
            {data?.count ?? 0} total {isFetching ? "· refreshing…" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
            <span className="text-muted-foreground">Page {page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={!!dialogMode} onOpenChange={(o) => !o && !saving && setDialogMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode?.mode === "edit" ? "Edit company" : "Create company"}</DialogTitle>
            <DialogDescription>
              {dialogMode?.mode === "edit" ? "Update company details." : "Add a new company to the directory."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <Field label="Name *" error={errors.name} className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Category *" error={errors.category}>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="company-cats" />
              <datalist id="company-cats">
                {allCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="City *" error={errors.city}>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Address *" error={errors.address} className="sm:col-span-2">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Contact email" error={errors.contact_email}>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </Field>
            <Field label="Website" error={errors.website} className="sm:col-span-2">
              <Input placeholder="https://…" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </Field>
            <Field label="Logo URL" error={errors.logo_url} className="sm:col-span-2">
              <Input placeholder="https://…/logo.png" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            </Field>
            <Field label="Description" error={errors.description} className="sm:col-span-2">
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-2">
              <Checkbox
                id="is_hidden"
                checked={!form.is_hidden}
                onCheckedChange={(v) => setForm({ ...form, is_hidden: !v })}
              />
              <Label htmlFor="is_hidden" className="cursor-pointer">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : dialogMode?.mode === "edit" ? "Save changes" : "Create company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewing?.logo_url && <img src={viewing.logo_url} alt="" className="h-8 w-8 rounded object-cover" />}
              {viewing?.name}
            </DialogTitle>
            <DialogDescription>{viewing?.category} · {viewing?.city}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              {viewing.description && <p className="text-muted-foreground">{viewing.description}</p>}
              <ViewRow label="Address" value={viewing.address} />
              <ViewRow label="Phone" value={viewing.phone} />
              <ViewRow label="Email" value={viewing.contact_email} />
              <ViewRow
                label="Website"
                value={viewing.website ? (
                  <a href={viewing.website} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    {viewing.website} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              />
              <ViewRow label="Status" value={<StatusBadge hidden={viewing.is_hidden} deleted={!!viewing.deleted_at} />} />
              <ViewRow label="Created" value={new Date(viewing.created_at).toLocaleString()} />
            </div>
          )}
          <DialogFooter>
            {viewing && (
              <a href={`/stores/${viewing.slug}`} target="_blank" rel="noreferrer">
                <Button variant="outline"><ExternalLink className="h-4 w-4 mr-1" /> Open public page</Button>
              </a>
            )}
            {viewing && <Button onClick={() => { openEdit(viewing); setViewing(null); }}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.kind === "hard" ? "Permanently delete?" : "Are you sure you want to delete this company?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind === "hard"
                ? `This will permanently delete ${confirmAction?.ids.length} compan${confirmAction?.ids.length === 1 ? "y" : "ies"} and cannot be undone.`
                : `${confirmAction?.ids.length} compan${confirmAction?.ids.length === 1 ? "y" : "ies"} will be soft-deleted and removed from listings. You can restore them from the Deleted tab.`}
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
              {confirmAction?.kind === "hard" ? "Delete" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ViewRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="flex-1 break-words">{value}</span>
    </div>
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

function StatusBadge({ hidden, deleted }: { hidden: boolean; deleted: boolean }) {
  if (deleted) return <span className="inline-flex rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">Deleted</span>;
  if (hidden) return <span className="inline-flex rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">Inactive</span>;
  return <span className="inline-flex rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">Active</span>;
}
