import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreHorizontal,
  LogIn,
  Mail,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Pencil,
  Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  createBusinessWithPartner,
  updateBusiness,
  setBusinessPlan,
  setBusinessStatus,
  sendPartnerActivationLink,
  resetPartnerPassword,
  deleteBusinessAccount,
  logImpersonation,
} from "@/lib/admin-businesses.functions";
import { setImpersonation } from "@/components/admin/ImpersonationBanner";

export const Route = createFileRoute("/admin/businesses")({
  head: () => ({
    meta: [
      { title: "Admin · Businesses" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminBusinessesPage,
});

type Plan = "bronze" | "silver" | "gold";
type Status =
  | "pending_activation"
  | "active"
  | "managed_by_admin"
  | "suspended"
  | "expired";

type Business = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  phone: string | null;
  category: string;
  city: string;
  logo_url: string | null;
  subscription_plan: Plan;
  partner_status: Status;
  created_at: string;
};

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<Status, string> = {
  pending_activation: "Pending activation",
  active: "Active",
  managed_by_admin: "Managed by admin",
  suspended: "Suspended",
  expired: "Expired",
};

const PLAN_LABELS: Record<Plan, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

function AdminBusinessesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [planFilter, setPlanFilter] = useState<Plan | "all">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Business | null>(null);

  const createFn = useServerFn(createBusinessWithPartner);
  const updateFn = useServerFn(updateBusiness);
  const planFn = useServerFn(setBusinessPlan);
  const statusFn = useServerFn(setBusinessStatus);
  const sendFn = useServerFn(sendPartnerActivationLink);
  const resetFn = useServerFn(resetPartnerPassword);
  const deleteFn = useServerFn(deleteBusinessAccount);
  const impersonateFn = useServerFn(logImpersonation);

  // Distinct cities / categories (cached)
  const { data: facets } = useQuery({
    queryKey: ["admin-businesses-facets"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("city, category")
        .is("deleted_at", null)
        .limit(2000);
      const cities = Array.from(new Set((data ?? []).map((r) => r.city).filter(Boolean))).sort();
      const categories = Array.from(
        new Set((data ?? []).map((r) => r.category).filter(Boolean)),
      ).sort();
      return { cities, categories };
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-businesses",
      search,
      statusFilter,
      planFilter,
      cityFilter,
      categoryFilter,
      page,
    ],
    queryFn: async () => {
      let q = supabase
        .from("stores")
        .select(
          "id, owner_id, name, slug, contact_email, phone, category, city, logo_url, subscription_plan, partner_status, created_at",
          { count: "exact" },
        )
        .is("deleted_at", null);

      const s = search.trim();
      if (s) q = q.or(`name.ilike.%${s}%,contact_email.ilike.%${s}%`);
      if (statusFilter !== "all") q = q.eq("partner_status", statusFilter);
      if (planFilter !== "all") q = q.eq("subscription_plan", planFilter);
      if (cityFilter !== "all") q = q.eq("city", cityFilter);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);

      q = q
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Business[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-businesses"] });

  const handleAction = async <T,>(label: string, p: Promise<T>): Promise<T | null> => {
    try {
      const r = await p;
      toast.success(label);
      refresh();
      return r;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
      return null;
    }
  };

  const handleImpersonate = async (b: Business) => {
    const ok = await handleAction(
      "Impersonation started",
      impersonateFn({ data: { store_id: b.id, event: "start" } }),
    );
    if (!ok) return;
    setImpersonation({
      store_id: b.id,
      owner_id: b.owner_id,
      store_name: b.name,
      started_at: Date.now(),
    });
    navigate({ to: "/profile" });
  };

  const handleSendActivation = async (b: Business) => {
    const r = await handleAction("Activation link generated", sendFn({ data: { id: b.id } }));
    if (r && (r as any).action_link) {
      try {
        await navigator.clipboard.writeText((r as any).action_link);
        toast.message("Link copied to clipboard");
      } catch {
        /* ignore */
      }
    }
  };

  const handleResetPassword = async (b: Business) => {
    const r = await handleAction("Password reset link generated", resetFn({ data: { id: b.id } }));
    if (r && (r as any).action_link) {
      try {
        await navigator.clipboard.writeText((r as any).action_link);
        toast.message("Link copied to clipboard");
      } catch {
        /* ignore */
      }
    }
  };

  const cycleSuspend = (b: Business) => {
    const next: Status = b.partner_status === "suspended" ? "active" : "suspended";
    return handleAction(
      next === "suspended" ? "Account suspended" : "Account reactivated",
      statusFn({ data: { id: b.id, status: next } }),
    );
  };

  return (
    <AdminShell title="Businesses">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-3 flex flex-col md:flex-row gap-2 md:items-center justify-between border-b">
          <div className="flex flex-wrap gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-8"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as Status | "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={planFilter}
              onValueChange={(v) => {
                setPlanFilter(v as Plan | "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-32"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                  <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={cityFilter}
              onValueChange={(v) => {
                setCityFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-40"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {(facets?.cities ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(facets?.categories ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" /> New business
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 w-14">Logo</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No businesses found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      {r.logo_url ? (
                        <img src={r.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-muted grid place-items-center text-xs text-muted-foreground">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-medium">
                      <a href={`/stores/${r.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                        {r.name}
                      </a>
                      <div className="text-xs text-muted-foreground">{r.city} · {r.category}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.contact_email ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.phone ?? "—"}</td>
                    <td className="p-3"><PlanBadge plan={r.subscription_plan} /></td>
                    <td className="p-3"><StatusBadge status={r.partner_status} /></td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => setEditing(r)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit business
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleImpersonate(r)}>
                            <LogIn className="h-4 w-4 mr-2" /> Login as partner
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendActivation(r)}>
                            <Mail className="h-4 w-4 mr-2" /> Send activation email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(r)}>
                            <KeyRound className="h-4 w-4 mr-2" /> Reset password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => cycleSuspend(r)}>
                            {r.partner_status === "suspended" ? (
                              <><CheckCircle2 className="h-4 w-4 mr-2" /> Reactivate</>
                            ) : (
                              <><Ban className="h-4 w-4 mr-2" /> Suspend</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Crown className="h-4 w-4 mr-2" /> Change plan
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                                <DropdownMenuItem
                                  key={p}
                                  disabled={p === r.subscription_plan}
                                  onClick={() =>
                                    handleAction(
                                      `Plan set to ${PLAN_LABELS[p]}`,
                                      planFn({ data: { id: r.id, plan: p } }),
                                    )
                                  }
                                >
                                  {PLAN_LABELS[p]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setConfirmDelete(r)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 flex items-center justify-between border-t text-sm">
          <span className="text-muted-foreground">{data?.count ?? 0} total</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            <span className="text-muted-foreground">
              Page {page + 1} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <CreateBusinessDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (values) => {
          const r = await handleAction(
            "Business created",
            createFn({ data: values }) as Promise<any>,
          );
          if (r) setCreateOpen(false);
        }}
      />

      <EditBusinessDialog
        business={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (id, patch) => {
          const r = await handleAction("Business updated", updateFn({ data: { id, patch } }));
          if (r) setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this business?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the store, its ads/gallery, and the partner user account
              for <strong>{confirmDelete?.name}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDelete) return;
                await handleAction(
                  "Business deleted",
                  deleteFn({ data: { id: confirmDelete.id } }),
                );
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

type CreateValues = {
  name: string;
  contact_email: string;
  phone: string;
  category: string;
  city: string;
  address: string;
  website: string;
  description: string;
  logo_url: string;
  subscription_plan: Plan;
};

function CreateBusinessDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v: CreateValues) => Promise<void>;
}) {
  const [v, setV] = useState<CreateValues>({
    name: "",
    contact_email: "",
    phone: "",
    category: "",
    city: "",
    address: "",
    website: "",
    description: "",
    logo_url: "",
    subscription_plan: "bronze",
  });
  const [busy, setBusy] = useState(false);

  const reset = () =>
    setV({
      name: "",
      contact_email: "",
      phone: "",
      category: "",
      city: "",
      address: "",
      website: "",
      description: "",
      logo_url: "",
      subscription_plan: "bronze",
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create business</DialogTitle>
          <DialogDescription>
            Creates a partner account and store. Status starts as “Pending activation”.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Business name *">
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label="Contact email *">
            <Input
              type="email"
              value={v.contact_email}
              onChange={(e) => setV({ ...v, contact_email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </Field>
          <Field label="Category *">
            <Input value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />
          </Field>
          <Field label="City *">
            <Input value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
          </Field>
          <Field label="Address *">
            <Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
          </Field>
          <Field label="Website">
            <Input
              placeholder="https://"
              value={v.website}
              onChange={(e) => setV({ ...v, website: e.target.value })}
            />
          </Field>
          <Field label="Logo URL">
            <Input
              placeholder="https://"
              value={v.logo_url}
              onChange={(e) => setV({ ...v, logo_url: e.target.value })}
            />
          </Field>
          <Field label="Subscription plan">
            <Select
              value={v.subscription_plan}
              onValueChange={(p) => setV({ ...v, subscription_plan: p as Plan })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                  <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <Textarea
                rows={3}
                value={v.description}
                onChange={(e) => setV({ ...v, description: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy || !v.name || !v.contact_email || !v.category || !v.city || !v.address}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(v);
              } finally {
                setBusy(false);
              }
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditBusinessDialog({
  business,
  onClose,
  onSubmit,
}: {
  business: Business | null;
  onClose: () => void;
  onSubmit: (id: string, patch: Record<string, any>) => Promise<void>;
}) {
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Re-seed when a new business is opened
  const seededId = business?.id;
  useMemo(() => {
    if (business) {
      setV({
        name: business.name,
        contact_email: business.contact_email ?? "",
        phone: business.phone ?? "",
        category: business.category,
        city: business.city,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededId]);

  return (
    <Dialog open={!!business} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit business</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name">
            <Input value={v.name ?? ""} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label="Contact email">
            <Input
              type="email"
              value={v.contact_email ?? ""}
              onChange={(e) => setV({ ...v, contact_email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input value={v.phone ?? ""} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </Field>
          <Field label="Category">
            <Input
              value={v.category ?? ""}
              onChange={(e) => setV({ ...v, category: e.target.value })}
            />
          </Field>
          <Field label="City">
            <Input value={v.city ?? ""} onChange={(e) => setV({ ...v, city: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (!business) return;
              setBusy(true);
              try {
                await onSubmit(business.id, {
                  name: v.name,
                  contact_email: v.contact_email,
                  phone: v.phone || null,
                  category: v.category,
                  city: v.city,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function PlanBadge({ plan }: { plan: Plan }) {
  const map: Record<Plan, string> = {
    bronze: "bg-amber-700/10 text-amber-700 dark:text-amber-500",
    silver: "bg-slate-400/15 text-slate-600 dark:text-slate-300",
    gold: "bg-yellow-400/15 text-yellow-700 dark:text-yellow-400",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[plan]}`}>
      {PLAN_LABELS[plan]}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    pending_activation: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    managed_by_admin: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    suspended: "bg-destructive/10 text-destructive",
    expired: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
