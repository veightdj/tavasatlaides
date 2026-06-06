import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Tag, EyeOff, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin · Dashboard" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDashboard,
});

type Stats = {
  companies: number;
  companiesHidden: number;
  companiesDeleted: number;
  deals: number;
  dealsActive: number;
  dealsHidden: number;
  dealsDeleted: number;
};

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async (): Promise<Stats> => {
      const count = (q: any) => q.then((r: any) => r.count ?? 0);
      const [companies, companiesHidden, companiesDeleted, deals, dealsActive, dealsHidden, dealsDeleted] = await Promise.all([
        count(supabase.from("stores").select("id", { count: "exact", head: true }).is("deleted_at", null)),
        count(supabase.from("stores").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("is_hidden", true)),
        count(supabase.from("stores").select("id", { count: "exact", head: true }).not("deleted_at", "is", null)),
        count(supabase.from("ads").select("id", { count: "exact", head: true }).is("deleted_at", null)),
        count(supabase.from("ads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active").eq("is_hidden", false)),
        count(supabase.from("ads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("is_hidden", true)),
        count(supabase.from("ads").select("id", { count: "exact", head: true }).not("deleted_at", "is", null)),
      ]);
      return { companies, companiesHidden, companiesDeleted, deals, dealsActive, dealsHidden, dealsDeleted };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const [stores, ads] = await Promise.all([
        supabase.from("stores").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("ads").select("id, title, created_at, store_id").order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        stores: stores.data ?? [],
        ads: ads.data ?? [],
      };
    },
  });

  return (
    <AdminShell title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Companies" value={stats?.companies} icon={Building2} to="/admin/companies" loading={isLoading} />
        <StatCard label="Deals" value={stats?.deals} icon={Tag} to="/admin/deals" loading={isLoading} />
        <StatCard label="Active deals" value={stats?.dealsActive} icon={CheckCircle2} loading={isLoading} />
        <StatCard label="Hidden" value={(stats?.companiesHidden ?? 0) + (stats?.dealsHidden ?? 0)} icon={EyeOff} loading={isLoading} />
        <StatCard label="Deleted companies" value={stats?.companiesDeleted} icon={Trash2} loading={isLoading} />
        <StatCard label="Deleted deals" value={stats?.dealsDeleted} icon={Trash2} loading={isLoading} />
        <StatCard label="Hidden companies" value={stats?.companiesHidden} icon={EyeOff} loading={isLoading} />
        <StatCard label="Hidden deals" value={stats?.dealsHidden} icon={EyeOff} loading={isLoading} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ActivityCard title="Recent companies" emptyMsg="No companies yet.">
          {recent?.stores.map((s) => (
            <Link key={s.id} to="/admin/companies" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
              <span className="truncate font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(s.created_at).toLocaleDateString()}</span>
            </Link>
          ))}
        </ActivityCard>
        <ActivityCard title="Recent deals" emptyMsg="No deals yet.">
          {recent?.ads.map((a) => (
            <Link key={a.id} to="/admin/deals" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
              <span className="truncate font-medium">{a.title}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(a.created_at).toLocaleDateString()}</span>
            </Link>
          ))}
        </ActivityCard>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, icon: Icon, to, loading }: { label: string; value?: number; icon: any; to?: string; loading?: boolean }) {
  const content = (
    <div className="rounded-2xl border bg-card p-4 hover:shadow-md transition-shadow h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold">{loading ? "—" : value ?? 0}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function ActivityCard({ title, emptyMsg, children }: { title: string; emptyMsg: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      {hasChildren ? <div className="space-y-1">{children}</div> : <p className="text-sm text-muted-foreground">{emptyMsg}</p>}
    </div>
  );
}
