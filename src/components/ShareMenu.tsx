"use client";

import { useState, useCallback } from "react";
import { Share2, Copy, MessageCircle, Send, Smartphone, Check, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/utils";

type ShareChannel = "copy" | "whatsapp" | "telegram" | "sms" | "native";

interface ShareMenuProps {
  storeId: string;
  storeName: string;
  storeCity?: string;
  offerText?: string;
  className?: string;
  buttonVariant?: "icon" | "inline";
}

function buildShareData({ storeName, storeCity, offerText }: Omit<ShareMenuProps, "storeId" | "className" | "buttonVariant">) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tavasatlaides.lovable.app";
  const url = `${origin}/stores/${storeName.toLowerCase().replace(/\s+/g, "-")}`; // fallback; caller should override
  const lines: string[] = [storeName];
  if (offerText) lines.push(offerText);
  if (storeCity) lines.push(storeCity);
  lines.push("Check this deal 👇");
  const text = lines.join("\n");
  return { url, text, full: `${text}\n${url}` };
}

export function ShareMenu({ storeId, storeName, storeCity, offerText, className, buttonVariant = "icon" }: ShareMenuProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://tavasatlaides.lovable.app";
  const pageUrl = `${origin}/stores/${storeId}`;

  const shareData = buildShareData({ storeName, storeCity, offerText });
  const fullText = `${shareData.text}\n${pageUrl}`;

  const trackShare = useCallback(async (channel: ShareChannel) => {
    try {
      await supabase.from("store_shares").insert({ store_id: storeId, channel });
    } catch {
      // silent fail for analytics
    }
  }, [storeId]);

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(pageUrl);
    }
    setCopied(true);
    trackShare("copy");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: storeName,
          text: shareData.text,
          url: pageUrl,
        });
        trackShare("native");
      } catch {
        // user cancelled
      }
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(fullText);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    trackShare("whatsapp");
    setOpen(false);
  };

  const handleTelegram = () => {
    const url = encodeURIComponent(pageUrl);
    const text = encodeURIComponent(shareData.text);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
    trackShare("telegram");
    setOpen(false);
  };

  const handleSms = () => {
    const body = encodeURIComponent(fullText);
    window.open(`sms:?body=${body}`, "_blank");
    trackShare("sms");
    setOpen(false);
  };

  const canNativeShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {buttonVariant === "inline" ? (
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Share2 className="h-4 w-4" />
            {t.deals.shareTitle}
          </Button>
        ) : (
          <button
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur hover:scale-110 transition",
              className
            )}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            aria-label={t.deals.shareTitle}
          >
            <Share2 className="h-4 w-4 text-foreground" />
          </button>
        )}
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg font-semibold">{t.deals.shareTitle}</SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          {/* Preview */}
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-1">
            <p className="font-semibold text-sm">{storeName}</p>
            {offerText && <p className="text-sm text-primary font-medium">{offerText}</p>}
            {storeCity && <p className="text-xs text-muted-foreground">{storeCity}</p>}
            <p className="text-xs text-muted-foreground">{pageUrl}</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-4 gap-3">
            <ShareAction icon={<Copy className="h-5 w-5" />} label={t.deals.shareCopy} onClick={handleCopy} active={copied} activeIcon={<Check className="h-5 w-5 text-green-600" />} />
            <ShareAction icon={<MessageCircle className="h-5 w-5 text-green-600" />} label={t.deals.shareWhatsapp} onClick={handleWhatsApp} />
            <ShareAction icon={<Send className="h-5 w-5 text-sky-500" />} label={t.deals.shareTelegram || "Telegram"} onClick={handleTelegram} />
            <ShareAction icon={<Smartphone className="h-5 w-5 text-orange-500" />} label="SMS" onClick={handleSms} />
          </div>

          {canNativeShare && (
            <Button variant="outline" className="w-full gap-2" onClick={handleNativeShare}>
              <Share2 className="h-4 w-4" />
              {t.deals.shareNative}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ShareAction({
  icon, label, onClick, active, activeIcon,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeIcon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 hover:bg-accent transition"
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
        {active && activeIcon ? activeIcon : icon}
      </div>
      <span className="text-[11px] font-medium text-foreground">{label}</span>
    </button>
  );
}
