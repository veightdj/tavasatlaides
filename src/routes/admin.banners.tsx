import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({
    meta: [
      { title: "Admin · Banners" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminBannersPage,
});

type Banner = {
  id: string;
  image_url: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  link_url: string | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  sort_order: number;
};

type FormState = {
  id?: string;
  image_url: string;
  title: string;
  subtitle: string;
  cta_text: string;
  link_url: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  sort_order: number;
};

const emptyForm: FormState = {
  image_url: "",
  title: "",
  subtitle: "",
  cta_text: "",
  link_url: "",
  is_active: true,
  starts_at: toLocalInput(new Date()),
  ends_at: "",
  sort_order: 0,
};

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminBannersPage() {
  const qc = useQueryClient();
  const [authState, setAuthState] = useState<"checking" | "anon" | "not-admin" | "admin">("checking");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        setAuthState("anon");
        window.location.href = "/login?redirect=" + encodeURIComponent("/admin/banners");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!mounted) return;
      setAuthState(roles?.some((r) => r.role === "admin") ? "admin" : "not-admin");
    })();
    return () => { mounted = false; };
  }, []);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    enabled: authState === "admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Banner[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["home-banners"] });
  };

  const openNew = () => {
    setForm({ ...emptyForm, sort_order: (banners.at(-1)?.sort_order ?? 0) + 1 });
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setForm({
      id: b.id,
      image_url: b.image_url,
      title: b.title,
      subtitle: b.subtitle ?? "",
      cta_text: b.cta_text ?? "",
      link_url: b.link_url ?? "",
      is_active: b.is_active,
      starts_at: toLocalInput(new Date(b.starts_at)),
      ends_at: b.ends_at ? toLocalInput(new Date(b.ends_at)) : "",
      sort_order: b.sort_order,
    });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { optimizeImageToWebP } = await import("@/lib/upload");
      const optimized = await optimizeImageToWebP(file);
      const path = `${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("banners").upload(path, optimized, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/webp",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.image_url || !form.title) {
      toast.error("Image and title are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        image_url: form.image_url,
        title: form.title,
        subtitle: form.subtitle || null,
        cta_text: form.cta_text || null,
        link_url: form.link_url || null,
        is_active: form.is_active,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        sort_order: form.sort_order,
      };
      const { error } = form.id
        ? await supabase.from("banners").update(payload).eq("id", form.id)
        : await supabase.from("banners").insert(payload);
      if (error) throw error;
      toast.success(form.id ? "Banner updated" : "Banner created");
      setOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  const handleToggle = async (b: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const handleReorder = async (b: Banner, dir: -1 | 1) => {
    const sorted = [...banners].sort((a, c) => a.sort_order - c.sort_order);
    const idx = sorted.findIndex((x) => x.id === b.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    const a = supabase.from("banners").update({ sort_order: swap.sort_order }).eq("id", b.id);
    const c = supabase.from("banners").update({ sort_order: b.sort_order }).eq("id", swap.id);
    const [r1, r2] = await Promise.all([a, c]);
    if (r1.error || r2.error) return toast.error((r1.error ?? r2.error)!.message);
    refresh();
  };

  if (authState === "checking" || authState === "anon") {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  if (authState === "not-admin") {
    return (
      <div className="mx-auto max-w-md p-10 text-center space-y-4">
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="text-muted-foreground text-sm">
          Your account doesn't have admin privileges. Sign in with an admin account.
        </p>
        <Button asChild variant="outline">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Homepage Banners</h1>
          <p className="text-sm text-muted-foreground">Manage the top slider on the homepage.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Add banner</Button>
      </header>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No banners yet. Click <strong>Add banner</strong> to create the first one.
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 w-20">Order</th>
                <th className="p-3">Banner</th>
                <th className="p-3 hidden md:table-cell">Schedule</th>
                <th className="p-3 w-24">Active</th>
                <th className="p-3 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b, i) => {
                const expired = b.ends_at && new Date(b.ends_at) < new Date();
                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleReorder(b, -1)} disabled={i === 0} className="disabled:opacity-30">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleReorder(b, 1)} disabled={i === banners.length - 1} className="disabled:opacity-30">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={b.image_url} alt={b.title} className="h-12 w-20 object-cover rounded-md bg-muted" loading="lazy" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{b.title}</div>
                          {b.subtitle && <div className="text-xs text-muted-foreground truncate">{b.subtitle}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">
                      <div>{new Date(b.starts_at).toLocaleString()}</div>
                      <div className={expired ? "text-destructive" : ""}>
                        {b.ends_at ? `→ ${new Date(b.ends_at).toLocaleString()}${expired ? " (expired)" : ""}` : "→ no end"}
                      </div>
                    </td>
                    <td className="p-3">
                      <Switch checked={b.is_active} onCheckedChange={() => handleToggle(b)} />
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit banner" : "New banner"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image *</Label>
              {form.image_url && (
                <img src={form.image_url} alt="" className="w-full h-40 object-cover rounded-md bg-muted" />
              )}
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : form.image_url ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea rows={2} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA text</Label>
                <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Shop now" />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/deals" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Saving…" : form.id ? "Save changes" : "Create banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
