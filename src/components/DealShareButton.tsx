import { useState, useCallback } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  dealId: string;
  title: string;
  description?: string;
  discountPct?: number | null;
  className?: string;
};

const SITE_URL = "https://tavasatlaides.lv";

export function DealShareButton({ dealId, title, description, discountPct, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const track = useCallback(async (event: "share_clicked" | "share_success" | "share_failed", channel?: string) => {
    try {
      // Only "share_success" persists as an engagement event; others are no-ops for analytics.
      if (event === "share_success") {
        await supabase.from("ad_shares").insert({ ad_id: dealId, channel: channel ?? "unknown" });
      }
    } catch {
      /* silent */
    }
  }, [dealId]);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    setBusy(true);
    track("share_clicked");

    // Haptic feedback if supported
    try { (navigator as any)?.vibrate?.(10); } catch { /* noop */ }

    const url = `${SITE_URL}/deals/${dealId}`;
    const discountLine = discountPct ? `-${discountPct}% atlaide` : "";
    const text = [title, discountLine, description].filter(Boolean).join("\n");
    const shareData: ShareData = { title, text, url };

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        toast.success("Deal link shared");
        track("share_success", "native");
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
        track("share_success", "copy");
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      } else {
        // Last-ditch fallback
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success("Link copied to clipboard");
        track("share_success", "copy-legacy");
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }
    } catch (err: any) {
      // AbortError = user cancelled the native sheet, not a real failure
      if (err?.name !== "AbortError") {
        track("share_failed");
        toast.error("Couldn't share — try again");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, dealId, title, description, discountPct, track]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      disabled={busy}
      aria-label="Share deal"
      className={cn(
        "grid place-items-center rounded-full bg-background/90 backdrop-blur shadow-sm",
        "h-11 w-11 min-h-[44px] min-w-[44px]",
        "transition-transform duration-200 active:scale-90 hover:scale-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        busy && "opacity-70",
        className,
      )}
    >
      {done ? (
        <Check className="h-4 w-4 text-green-600 animate-in zoom-in-50 duration-200" />
      ) : (
        <Share2 className={cn("h-4 w-4 text-foreground", busy && "animate-pulse")} />
      )}
    </button>
  );
}
