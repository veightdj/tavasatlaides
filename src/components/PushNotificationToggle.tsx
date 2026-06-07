import { useState } from "react";
import { Bell, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { registerPush, PushError } from "@/lib/push";
import { savePushToken } from "@/lib/device.functions";
import { isNativePlatform } from "@/lib/platform";
import { useAuth } from "@/hooks/use-auth";

export function PushNotificationToggle({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const native = isNativePlatform();
  const { user } = useAuth();
  const saveToken = useServerFn(savePushToken);

  const handle = async () => {
    setLoading(true);
    try {
      const reg = await registerPush({
        onForeground: (n) => toast(n.title ?? "Notification", { description: n.body }),
      });

      if (reg) {
        if (user) {
          try {
            await saveToken({ data: { token: reg.token, platform: reg.platform } });
          } catch {
            /* non-blocking */
          }
        }
        setRegistered(true);
        toast.success("Push notifications enabled");
      } else {
        // Web fallback — permission granted but no native token
        setRegistered(true);
        toast.success("Browser notifications enabled", {
          description: "For full background alerts, install the mobile app.",
        });
      }
    } catch (err) {
      if (err instanceof PushError) {
        if (err.code === "permission_denied") {
          toast.error("Notifications blocked", {
            description: "Enable notifications in your device settings.",
          });
        } else if (err.code === "unsupported") {
          toast.error("Push notifications aren't supported here", {
            description: "Install the mobile app for full push support.",
          });
        } else {
          toast.error("Could not register for push", { description: err.message });
        }
      } else {
        toast.error("Could not enable notifications");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button type="button" onClick={handle} disabled={loading || registered}>
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : native ? (
          <Smartphone className="h-4 w-4 mr-2" />
        ) : (
          <Bell className="h-4 w-4 mr-2" />
        )}
        {registered
          ? "Notifications enabled"
          : native
            ? "Enable push notifications"
            : "Enable browser notifications"}
      </Button>
      {!native && (
        <p className="text-xs text-muted-foreground mt-2">
          Background push notifications work best in the native mobile app.
        </p>
      )}
    </div>
  );
}
