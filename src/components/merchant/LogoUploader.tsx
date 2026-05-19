import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Upload, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { uploadImage } from "@/lib/upload";
import { useI18n } from "@/i18n/use-i18n";

type Props = {
  value: string;
  userId: string;
  prefix?: string; // "logo" | "ad" | "cover"
  shape?: "round" | "square" | "wide";
  aspect?: number; // override aspect ratio
  outputWidth?: number;
  outputHeight?: number;
  onChange: (url: string) => void;
};

export function LogoUploader({
  value, userId, prefix = "logo", shape = "round",
  aspect, outputWidth, outputHeight, onChange,
}: Props) {
  const effectiveAspect = aspect ?? (shape === "wide" ? 16 / 9 : 1);
  const outW = outputWidth ?? (shape === "wide" ? 1600 : 512);
  const outH = outputHeight ?? Math.round(outW / effectiveAspect);

  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSrcImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onComplete = useCallback((_: Area, areaPx: Area) => setCroppedArea(areaPx), []);

  const handleSave = async () => {
    if (!srcImage || !croppedArea) return;
    setUploading(true);
    try {
      const blob = await renderCrop(srcImage, croppedArea, outW, outH);
      const file = new File([blob], `${prefix}.jpg`, { type: "image/jpeg" });
      const url = await uploadImage(file, userId, prefix);
      onChange(url);
      setSrcImage(null);
      toast.success(t.common.saved);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const roundedClass = shape === "round" ? "rounded-full" : "rounded-xl";

  return (
    <>
      <div className="flex items-center gap-4">
        {value ? (
          <img src={value} alt="" className={`h-20 w-20 object-cover border ${roundedClass}`} />
        ) : (
          <div className={`h-20 w-20 bg-muted grid place-items-center text-muted-foreground ${roundedClass}`}>
            <Upload className="h-6 w-6" />
          </div>
        )}
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          {value ? "Change" : "Upload"}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>

      <Dialog open={!!srcImage} onOpenChange={(o) => !o && setSrcImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-80 bg-muted rounded-lg overflow-hidden">
            {srcImage && (
              <Cropper
                image={srcImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape={shape === "round" ? "round" : "rect"}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onComplete}
              />
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Slider min={1} max={4} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSrcImage(null)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleSave} disabled={uploading}>{uploading ? "Uploading…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function renderCrop(src: string, area: Area, size: number): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas empty"))), "image/jpeg", 0.9)
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
