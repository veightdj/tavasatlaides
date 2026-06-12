import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Trash2, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";

type GalleryRow = { id: string; image_url: string; sort_order: number };

export function StoreGalleryManager({ storeId, userId }: { storeId: string; userId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: images = [] } = useQuery({
    queryKey: ["store-gallery", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_gallery")
        .select("id,image_url,sort_order")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GalleryRow[];
    },
  });

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let nextOrder = (images[images.length - 1]?.sort_order ?? -1) + 1;
    try {
      const rows: { store_id: string; image_url: string; sort_order: number }[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const url = await uploadImage(file, userId, "gallery");
        rows.push({ store_id: storeId, image_url: url, sort_order: nextOrder++ });
      }
      if (rows.length) {
        const { error } = await supabase.from("store_gallery").insert(rows);
        if (error) throw error;
        // If store has no cover image yet, promote first uploaded as cover
        const { data: s } = await supabase.from("stores").select("cover_image_url").eq("id", storeId).maybeSingle();
        if (!s?.cover_image_url) {
          await supabase.from("stores").update({ cover_image_url: rows[0].image_url }).eq("id", storeId);
          qc.invalidateQueries({ queryKey: ["my-store-edit", userId] });
          qc.invalidateQueries({ queryKey: ["store", storeId] });
        }
        qc.invalidateQueries({ queryKey: ["store-gallery", storeId] });
        toast.success(`Uploaded ${rows.length} image${rows.length > 1 ? "s" : ""}`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_gallery").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-gallery", storeId] });
      toast.success("Image removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const persistOrder = async (ordered: GalleryRow[]) => {
    qc.setQueryData(["store-gallery", storeId], ordered);
    const updates = ordered.map((row, idx) =>
      supabase.from("store_gallery").update({ sort_order: idx }).eq("id", row.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(failed.error.message);
      qc.invalidateQueries({ queryKey: ["store-gallery", storeId] });
    }
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const list = [...images];
    const fromIdx = list.findIndex((i) => i.id === dragId);
    const toIdx = list.findIndex((i) => i.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setDragId(null);
    persistOrder(list);
  };

  const moveBy = (id: string, delta: number) => {
    const list = [...images];
    const i = list.findIndex((x) => x.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    persistOrder(list);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? "Uploading…" : "Add images"}
        </Button>
        <span className="text-xs text-muted-foreground">JPG, PNG or WebP. Drag tiles to reorder.</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          No gallery images yet. Upload your first photo — it will also be used as the store cover image.
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => setDragId(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(img.id)}
              onDragEnd={() => setDragId(null)}
              className={`group relative rounded-2xl overflow-hidden border bg-card aspect-square ${
                dragId === img.id ? "opacity-50" : ""
              }`}
            >
              <img
                src={img.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-1.5 left-1.5 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold">
                {idx + 1}
              </div>
              <div className="absolute top-1.5 right-1.5 rounded-md bg-background/90 p-1 cursor-grab opacity-70 group-hover:opacity-100">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="secondary" className="h-7 w-7 p-0" onClick={() => moveBy(img.id, -1)} disabled={idx === 0} aria-label="Move left">
                    ‹
                  </Button>
                  <Button type="button" size="sm" variant="secondary" className="h-7 w-7 p-0" onClick={() => moveBy(img.id, 1)} disabled={idx === images.length - 1} aria-label="Move right">
                    ›
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 w-7 p-0"
                  onClick={() => remove.mutate(img.id)}
                  aria-label="Delete image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
