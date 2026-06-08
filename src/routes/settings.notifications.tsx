import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/categories";
import {
  DEFAULT_PREFS,
  loadPrefs,
  savePrefs,
  RADIUS_OPTIONS,
  type NotificationPrefs,
  type Radius,
} from "@/lib/notifications";
import {
  getNewDealAlertEligibility,
  loadNotificationPrefs,
  saveNotificationPrefs,
} from "@/lib/notification-prefs.functions";
import { getCurrentLocation, LocationError } from "@/lib/location";
import { registerOneSignal, setOneSignalExternalId, OneSignalError } from "@/lib/onesignal";
import { saveOneSignalSubscription } from "@/lib/subscriptions.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notification settings — TavasAtlaides" },
      {
        name: "description",
        content: "Choose which nearby deals you want to be notified about, and how often.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationSettings,
});

const CATEGORY_LABELS: Record<CategorySlug, string> = {
  food: "Restaurants",
  cafes: "Cafes",
  beauty: "Beauty",
  auto: "Auto",
  electronics: "Electronics",
  home: "Home & Shopping",
  kids: "Kids",
  events: "Events",
};

const ONESIGNAL_TOGGLES: Array<{
  key: keyof Pick<
    NotificationPrefs,
    | "newDeals"
    | "favoriteBusinesses"
    | "expiringDeals"
    | "specialOffers"
    | "announcements"
    | "nearbyDeals"
  >;
  label: string;
  desc: string;
}> = [
  { key: "newDeals", label: "New deals", desc: "When a new deal goes live." },
  {
    key: "favoriteBusinesses",
    label: "Favorite businesses",
    desc: "Deals from businesses you've favorited.",
  },
  {
    key: "expiringDeals",
    label: "Expiring deals",
    desc: "Reminders before deals you saved expire.",
  },
  { key: "specialOffers", label: "Special offers", desc: "Limited-time and featured promotions." },
  { key: "announcements", label: "Announcements", desc: "App news and important updates." },
  { key: "nearbyDeals", label: "Nearby deals", desc: "Deals near your current location." },
];

function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [geoPerm, setGeoPerm] = useState<PermissionState | "unsupported" | "unknown">("unknown");
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    hasLocation: boolean;
    hasCategories: boolean;
    hasPushSubscription: boolean;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const loadServer = useServerFn(loadNotificationPrefs);
  const saveServer = useServerFn(saveNotificationPrefs);
  const loadEligibility = useServerFn(getNewDealAlertEligibility);
  const saveSub = useServerFn(saveOneSignalSubscription);

  useEffect(() => {
    setPrefs(loadPrefs());
    if (typeof window !== "undefined" && "Notification" in window) {
      setPerm(Notification.permission);
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoPerm("unsupported");
      return;
    }
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        setGeoPerm(p.state);
        p.onchange = () => setGeoPerm(p.state);
      })
      .catch(() => setGeoPerm("unknown"));
  }, []);

  // Pull from server when signed in (server is source of truth).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const server = await loadServer();
        if (cancelled || !server) return;
        const merged: NotificationPrefs = {
          ...DEFAULT_PREFS,
          ...prefs,
          ...server,
          radiusKm: (server.radiusKm as Radius) ?? prefs.radiusKm,
          categories: (server.categories as CategorySlug[]) ?? prefs.categories,
          latitude: server.latitude ?? prefs.latitude,
          longitude: server.longitude ?? prefs.longitude,
        };
        setPrefs(merged);
        savePrefs(merged);
      } catch (e) {
        console.warn("[prefs] load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    loadEligibility()
      .then((status) => {
        if (!cancelled) setEligibility(status);
      })
      .catch((e) => console.warn("[prefs] eligibility check failed", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const persist = async (next: NotificationPrefs) => {
    setPrefs(next);
    savePrefs(next);
    if (!user) return;
    setSyncing(true);
    try {
      await saveServer({ data: next });
    } catch (e) {
      console.error("[prefs] save failed", e);
      toast.error("Couldn't sync preferences");
    } finally {
      setSyncing(false);
    }
  };

  const update = <K extends keyof NotificationPrefs>(k: K, v: NotificationPrefs[K]) => {
    persist({ ...prefs, [k]: v });
  };

  const toggleCategory = (c: CategorySlug) => {
    const has = prefs.categories.includes(c);
    persist({
      ...prefs,
      categories: has ? prefs.categories.filter((x) => x !== c) : [...prefs.categories, c],
    });
  };

  const refreshEligibility = async () => {
    if (!user) return null;
    const status = await loadEligibility();
    setEligibility(status);
    return status;
  };

  const enablePush = async () => {
    if (!user) {
      toast.error("Sign in to enable deal alerts");
      return;
    }
    setSetupBusy(true);
    try {
      const reg = await registerOneSignal();
      await setOneSignalExternalId(user.id);
      await saveSub({ data: { onesignalSubscriptionId: reg.playerId, platform: reg.platform } });
      if (typeof window !== "undefined" && "Notification" in window)
        setPerm(Notification.permission);
      await refreshEligibility();
      toast.success("Push notifications linked");
    } catch (err) {
      console.error("[onesignal] setup failed", err);
      if (err instanceof OneSignalError && err.code === "permission_denied") {
        toast.error("Notifications blocked in browser settings");
      } else {
        toast.error("Could not enable push notifications");
      }
    } finally {
      setSetupBusy(false);
    }
  };

  const shareLocationForAlerts = async () => {
    if (!user) {
      toast.error("Sign in to save alert location");
      return;
    }
    setSetupBusy(true);
    try {
      const coords = await getCurrentLocation();
      await persist({
        ...prefs,
        enabled: true,
        newDeals: true,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      setGeoPerm("granted");
      await refreshEligibility();
      toast.success("Alert location saved");
    } catch (err) {
      if (err instanceof LocationError && err.code === "permission_denied") {
        toast.error("Location blocked in browser settings");
      } else {
        toast.error("Could not save your location");
      }
    } finally {
      setSetupBusy(false);
    }
  };

  const setupNewDealAlerts = async () => {
    if (!user) {
      toast.error("Sign in to enable deal alerts");
      return;
    }
    setSetupBusy(true);
    try {
      let next = {
        ...prefs,
        enabled: true,
        newDeals: true,
        categories: prefs.categories.length ? prefs.categories : [...CATEGORY_SLUGS],
      };
      if (next.latitude == null || next.longitude == null) {
        const coords = await getCurrentLocation();
        next = { ...next, latitude: coords.lat, longitude: coords.lng };
        setGeoPerm("granted");
      }
      await persist(next);

      if (!eligibility?.hasPushSubscription || perm !== "granted") {
        const reg = await registerOneSignal();
        await setOneSignalExternalId(user.id);
        await saveSub({ data: { onesignalSubscriptionId: reg.playerId, platform: reg.platform } });
        if (typeof window !== "undefined" && "Notification" in window)
          setPerm(Notification.permission);
      }

      const status = await refreshEligibility();
      if (status?.eligible) toast.success("You're eligible for new deal alerts");
      else
        toast.success("Setup saved", {
          description: "Refresh after your browser finishes linking push.",
        });
    } catch (err) {
      console.error("[prefs] setup failed", err);
      if (err instanceof OneSignalError && err.code === "permission_denied") {
        toast.error("Notifications blocked in browser settings");
      } else if (err instanceof LocationError && err.code === "permission_denied") {
        toast.error("Location blocked in browser settings");
      } else {
        toast.error("Could not finish alert setup");
      }
    } finally {
      setSetupBusy(false);
    }
  };

  const hasSavedLocation = prefs.latitude != null && prefs.longitude != null;
  const hasPushSubscription = Boolean(eligibility?.hasPushSubscription);
  const isEligible = Boolean(eligibility?.eligible);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12 pb-24 md:pb-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Pick what you want to hear about. Changes save automatically
          {user ? "." : " on this device."}
        </p>
        {syncing && (
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
          </p>
        )}
      </header>

      <div
        className={`rounded-2xl border p-4 space-y-4 ${isEligible ? "bg-brand-soft border-primary/20" : "bg-muted/40"}`}
      >
        <div className="flex items-start gap-3">
          {isEligible ? (
            <Check className="mt-0.5 h-5 w-5 text-primary shrink-0" />
          ) : (
            <Bell className="mt-0.5 h-5 w-5 text-primary shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">New deal alerts</h2>
            <p className="text-sm text-muted-foreground">
              {isEligible
                ? "You're eligible for instant push alerts when a matching deal is posted nearby."
                : "Enable push and share your alert location to receive nearby new deal notifications."}
            </p>
          </div>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <Step ok={Boolean(user)} label="Signed in" />
          <Step ok={hasPushSubscription || perm === "granted"} label="Push enabled" />
          <Step ok={hasSavedLocation || Boolean(eligibility?.hasLocation)} label="Location saved" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {!user ? (
            <Button asChild>
              <Link to="/login">Sign in to continue</Link>
            </Button>
          ) : (
            <Button onClick={setupNewDealAlerts} disabled={setupBusy}>
              {setupBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEligible ? "Refresh alert status" : "Set up alerts"}
            </Button>
          )}
          {user && !hasPushSubscription && (
            <Button variant="secondary" onClick={enablePush} disabled={setupBusy}>
              Enable push
            </Button>
          )}
          {user && !hasSavedLocation && geoPerm !== "unsupported" && (
            <Button variant="outline" onClick={shareLocationForAlerts} disabled={setupBusy}>
              <LocateFixed className="h-4 w-4 mr-2" /> Share location
            </Button>
          )}
        </div>
      </div>

      {/* Permission banner */}
      <div
        className={`rounded-2xl border p-4 flex items-center gap-3 ${perm === "granted" ? "bg-brand-soft border-primary/20" : "bg-muted/40"}`}
      >
        {perm === "granted" ? (
          <Bell className="h-5 w-5 text-primary shrink-0" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 text-sm">
          {perm === "granted" && (
            <span>
              Browser notifications are allowed{hasPushSubscription ? " and linked." : "."}
            </span>
          )}
          {perm === "default" && (
            <span>Allow browser notifications and link this device for alerts.</span>
          )}
          {perm === "denied" && (
            <span>Notifications are blocked. Enable them in your browser site settings.</span>
          )}
        </div>
        {perm !== "granted" && perm !== "denied" && (
          <Button size="sm" onClick={enablePush} disabled={setupBusy}>
            Allow
          </Button>
        )}
      </div>

      {/* Master toggle */}
      <Setting label="Enable notifications" desc="Master switch for all alerts.">
        <Switch checked={prefs.enabled} onCheckedChange={(v) => update("enabled", v)} />
      </Setting>

      {/* OneSignal category toggles */}
      <div className="space-y-3">
        <div>
          <Label className="text-base">Notify me about</Label>
          <p className="text-sm text-muted-foreground">
            Pick the kinds of pushes you want to receive.
          </p>
        </div>
        <div className="rounded-2xl border divide-y">
          {ONESIGNAL_TOGGLES.map(({ key, label, desc }) => (
            <div key={key} className="p-4 flex items-start justify-between gap-4">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={prefs[key]}
                onCheckedChange={(v) => update(key, v)}
                disabled={!prefs.enabled}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Radius */}
      <Setting label="Notification radius" desc="How far from you a deal must be.">
        <Select
          value={String(prefs.radiusKm)}
          onValueChange={(v) => update("radiusKm", Number(v) as Radius)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RADIUS_OPTIONS.map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r} km
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Setting>

      {/* Categories */}
      <div className="space-y-3">
        <div>
          <Label className="text-base">Categories</Label>
          <p className="text-sm text-muted-foreground">
            Only notify me about deals in these categories.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_SLUGS.map((c) => {
            const on = prefs.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {CATEGORY_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quiet hours */}
      <Setting label="Quiet hours" desc="No notifications between these times.">
        <div className="flex items-center gap-2">
          <HourSelect value={prefs.quietStart} onChange={(v) => update("quietStart", v)} />
          <span className="text-muted-foreground text-sm">to</span>
          <HourSelect value={prefs.quietEnd} onChange={(v) => update("quietEnd", v)} />
        </div>
      </Setting>

      {/* Frequency */}
      <Setting label="Max per day" desc="Cap to avoid noise.">
        <Select
          value={String(prefs.maxPerDay)}
          onValueChange={(v) => update("maxPerDay", Number(v))}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 5, 10, 20].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Setting>

      {/* Sound */}
      <Setting label="Sound & vibration" desc="Play system sound when a notification appears.">
        <Switch
          checked={prefs.soundVibration}
          onCheckedChange={(v) => update("soundVibration", v)}
        />
      </Setting>

      <div className="pt-4 border-t">
        <Button asChild className="w-full sm:w-auto">
          <Link to="/nearby">Open Deals Near Me</Link>
        </Button>
      </div>
    </div>
  );
}

function Step({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
      {ok ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <span className="h-4 w-4 rounded-full border border-muted-foreground/40" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function Setting({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5 flex-1 min-w-0">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function HourSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[90px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 24 }, (_, i) => (
          <SelectItem key={i} value={String(i)}>
            {String(i).padStart(2, "0")}:00
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
