import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Baby, CalendarDays, Car, Coffee, Gem, Home, Smartphone, UtensilsCrossed,
  ShoppingBag, Heart, Sparkles, Bike, Plane, Music, Dumbbell, Briefcase,
  Pizza, Wine, BookOpen, Camera, Gamepad2, PawPrint, Tag, Plus, Pencil, Trash2,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify, useAllCategories, type Category } from "@/lib/categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Admin · Categories" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminCategoriesPage,
});

const ICON_CHOICES: Record<string, LucideIcon> = {
  Tag, UtensilsCrossed, Car, Gem, Smartphone, Home, Baby, Coffee, CalendarDays,
  ShoppingBag, Heart, Sparkles, Bike, Plane, Music, Dumbbell, Briefcase,
  Pizza, Wine, BookOpen, Camera, Gamepad2, PawPrint,
};

type Form = {
  name_lv: string;
  name_en: string;
  name_ru: string;
  slug: string;
  icon: string;
  sort_order: number;
  active: boolean;
  color: string;
};

const COLOR_PRESETS = [
  "oklch(0.65 0.16 55)",
  "oklch(0.6 0.12 245)",
  "oklch(0.7 0.14 345)",
  "oklch(0.6 0.14 295)",
  "oklch(0.65 0.12 145)",
  "oklch(0.75 0.16 85)",
  "oklch(0.55 0.1 55)",
  "oklch(0.65 0.16 25)",
];

const EMPTY: Form = { name_lv: "", name_en: "", name_ru: "", slug: "", icon: "Tag", sort_order: 100, active: true, color: COLOR_PRESETS[1] };

function AdminCategoriesPage() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useAllCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name_lv: (editing as any).name_lv ?? editing.name ?? "",
          name_en: (editing as any).name_en ?? "",
          name_ru: (editing as any).name_ru ?? "",
          slug: editing.slug, icon: editing.icon,
          sort_order: editing.sort_order, active: editing.active,
          color: editing.color || COLOR_PRESETS[1],
        });
        setSlugEdited(true);
      } else {
        setForm(EMPTY);
        setSlugEdited(false);
      }
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        name: f.name_lv.trim(),
        name_lv: f.name_lv.trim(),
        name_en: f.name_en.trim() || null,
        name_ru: f.name_ru.trim() || null,
        slug: f.slug.trim(),
        icon: f.icon,
        sort_order: Number(f.sort_order) || 0,
        active: f.active,
        color: f.color,
      };
      if (!payload.name_lv || !payload.slug) throw new Error("Latvian name and slug are required");
      if (editing) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase.from("categories").update({ active: !c.active }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase.from("categories").delete().eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [categories]
  );

  return (
    <AdminShell title="Categories">
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New category
        </Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No categories yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Icon</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const Icon = ICON_CHOICES[c.icon] ?? Tag;
                return (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3 tabular-nums">{c.sort_order}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: c.color }}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                    <td className="px-4 py-3">
                      <Switch checked={c.active} onCheckedChange={() => toggleActive.mutate(c)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete category "${c.name}"?`)) remove.mutate(c);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name (LV)</Label>
              <Input
                value={form.name_lv}
                onChange={(e) => {
                  const name_lv = e.target.value;
                  setForm((f) => ({ ...f, name_lv, slug: slugEdited ? f.slug : slugify(name_lv) }));
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Name (EN)</Label>
              <Input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Name (RU)</Label>
              <Input value={form.name_ru} onChange={(e) => setForm((f) => ({ ...f, name_ru: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => { setSlugEdited(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(ICON_CHOICES).map(([name, Icon]) => (
                    <SelectItem key={name} value={name}>
                      <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1 pt-1">
                {Object.entries(ICON_CHOICES).map(([name, Icon]) => (
                  <button
                    key={name} type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: name }))}
                    className={cn(
                      "h-9 w-9 grid place-items-center rounded-md border",
                      form.icon === name ? "border-primary bg-primary/10" : "hover:bg-muted"
                    )}
                    title={name}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Icon color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-transform",
                      form.color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    )}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: form.color }}
                  className="h-8 w-8 rounded-full border shrink-0"
                />
                <Input
                  value={form.color}
                  placeholder="oklch(0.6 0.12 245) or #RRGGBB"
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
