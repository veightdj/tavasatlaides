import { supabase } from "@/integrations/supabase/client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB raw input
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

/**
 * Resize + re-encode an image to WebP in the browser using Canvas.
 *
 * - Caps the longest edge at MAX_DIMENSION (1600px), preserves aspect ratio
 * - Re-encodes as WebP at quality 0.82
 * - Strips EXIF/metadata automatically (canvas re-encoding doesn't carry it over)
 * - If the resulting blob is larger than the original (rare, e.g. tiny WebP input),
 *   falls back to the original file so we never make storage worse
 *
 * Returns a Blob; the caller is responsible for naming/uploading.
 */
export async function optimizeImageToWebP(file: File): Promise<Blob> {
  // Decode via createImageBitmap when available (faster, off-main-thread on most browsers)
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = await loadImageElement(file);
  }

  const srcW = "width" in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth;
  const srcH = "height" in bitmap ? bitmap.height : (bitmap as HTMLImageElement).naturalHeight;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  const canvas = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(dstW, dstH)
    : Object.assign(document.createElement("canvas"), { width: dstW, height: dstH });

  const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("Could not create canvas context for image optimization.");

  // High-quality resampling
  (ctx as CanvasRenderingContext2D).imageSmoothingEnabled = true;
  (ctx as CanvasRenderingContext2D).imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, dstW, dstH);

  if ("close" in bitmap) (bitmap as ImageBitmap).close();

  let blob: Blob | null = null;
  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY });
  } else {
    blob = await new Promise<Blob | null>((resolve) =>
      (canvas as HTMLCanvasElement).toBlob(resolve, "image/webp", WEBP_QUALITY)
    );
  }
  if (!blob) throw new Error("Browser failed to encode WebP.");

  // Safety net: if encoding somehow made it bigger (already-optimized small webp), keep original
  if (blob.size >= file.size && file.type === "image/webp" && srcW <= MAX_DIMENSION && srcH <= MAX_DIMENSION) {
    return file;
  }
  return blob;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to decode image.")); };
    img.src = url;
  });
}

export async function uploadImage(file: File, userId: string, prefix: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    throw new Error("Invalid file type. Please upload a JPEG, PNG, WebP or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (max 10 MB).");
  }

  const optimized = await optimizeImageToWebP(file);
  const path = `${userId}/${prefix}-${Date.now()}.webp`;

  const { error } = await supabase.storage.from("store-assets").upload(path, optimized, {
    upsert: true,
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return data.publicUrl;
}
