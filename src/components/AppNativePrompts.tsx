import { useEffect } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getHostAudience } from "@/lib/audience";
import { registerOneSignal, setOneSignalExternalId } from "@/lib/onesignal";
import { getCurrentLocation } from "@/lib/location";
import { loadPrefs, savePrefs } from "@/lib/notifications";
import { saveNotificationPrefs } from "@/lib/notification-prefs.functions";
import { saveOneSignalSubscription } from "@/lib/subscriptions.functions";
import { supabase } from "@/integrations/supabase/client";

const NOTIF_KEY = "app:asked-notifications";
const GEO_KEY = "app:asked-geolocation";

/**
 * On app.tavasatlaides.lv, prompt once for notifications + location so the
 * site feels native. Marketing (www) and other hosts never see these.
 */
export function AppNativePrompts() {
  const savePrefsServer = useServerFn(saveNotificationPrefs);
  const saveSub = useServerFn(saveOneSignalSubscription);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (getHostAudience() !== "app") return;

    const currentUserId = async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    };

    const saveAlertLocation = async (lat: number, lng: number) => {
      const prefs = {
        ...loadPrefs(),
        enabled: true,
        newDeals: true,
        latitude: lat,
        longitude: lng,
      };
      savePrefs(prefs);
      if (await currentUserId()) {
        await savePrefsServer({ data: prefs });
      }
    };

    // Location — quick, silent if already granted, otherwise gentle prompt.
    const askLocation = async () => {
      if (localStorage.getItem(GEO_KEY)) return;
      try {
        const perm = await navigator.permissions
          ?.query({ name: "geolocation" as PermissionName })
          .catch(() => null);
        if (perm?.state === "granted") {
          localStorage.setItem(GEO_KEY, "granted");
          getCurrentLocation()
            .then((coords) => saveAlertLocation(coords.lat, coords.lng))
            .catch(() => {});
          return;
        }
        if (perm?.state === "denied") {
          localStorage.setItem(GEO_KEY, "denied");
          return;
        }
        const id = toast("Share your location?", {
          description: "See deals near you on the map and feed.",
          duration: 12000,
          action: {
            label: "Share",
            onClick: () => {
              localStorage.setItem(GEO_KEY, "asked");
              getCurrentLocation()
                .then((coords) => saveAlertLocation(coords.lat, coords.lng))
                .catch(() => {});
            },
          },
          cancel: {
            label: "Not now",
            onClick: () => localStorage.setItem(GEO_KEY, "dismissed"),
          },
        });
        void id;
      } catch {
        /* non-blocking */
      }
    };

    const askNotifications = async () => {
      if (localStorage.getItem(NOTIF_KEY)) return;
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted" || Notification.permission === "denied") {
        localStorage.setItem(NOTIF_KEY, Notification.permission);
        return;
      }
      toast("Get notified about new deals?", {
        description: "We'll only ping you about hot offers nearby.",
        duration: 14000,
        action: {
          label: "Enable",
          onClick: async () => {
            localStorage.setItem(NOTIF_KEY, "asked");
            try {
              const reg = await registerOneSignal();
              const uid = await currentUserId();
              if (uid) {
                await setOneSignalExternalId(uid);
                await saveSub({
                  data: { onesignalSubscriptionId: reg.playerId, platform: reg.platform },
                });
              }
              toast.success("Notifications enabled");
              void reg;
            } catch {
              toast.error("Could not enable notifications");
            }
          },
        },
        cancel: {
          label: "Not now",
          onClick: () => localStorage.setItem(NOTIF_KEY, "dismissed"),
        },
      });
    };

    // Stagger so we don't pile two prompts on top of each other.
    const t1 = window.setTimeout(askLocation, 1500);
    const t2 = window.setTimeout(askNotifications, 8000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [savePrefsServer, saveSub]);

  return null;
}
