import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, LocateFixed, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/DealCard";
import { Skeleton } from "@/components/ui/skeleton";
import { distanceKm as haversineKm, formatDistance } from "@/lib/distance";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  loadPrefs, requestNotificationPermission, showDealNotification,
  canNotify, markNotified, savePrefs, RADIUS_OPTIONS, type NotificationPrefs, type Radius,
} from "@/lib/notifications";
import type { CategorySlug } from "@/lib/categories";


export const Route = createFileRoute("/nearby")({
  head: () => ({
    meta: [
      { title: "Deals Near Me — TavasAtlaides" },
      { name: "description", content: "Live nearby deals. Get notified when a discount appears within your radius." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/nearby" }],
  }),
  component: NearbyPage,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground break-words">{error?.message ?? "Could not load nearby deals."}</p>
      <Button onClick={reset} variant="outline">Try again</Button>
    </div>
  ),
});

type Deal = {
  id: string;
  title: string;
  category: string;
  discount_pct: number | null;
  price_original: number | null;
  price_sale: number | null;
  cover_image_url: string | null;
  ends_at: string | null;
  created_at: string;
  stores: { id: string; name: string; city: string; slug: string; lat: number | null; lng: number | null } | null;
};

function NearbyPage() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadPrefs());
  const watchId = useRef<number | null>(null);

  // Refresh prefs when tab regains focus (settings live in another page)
  useEffect(() => {
    const onFocus = () => setPrefs(loadPrefs());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const startWatch = async () => {
    try {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setError("Geolocation is not supported in this browser.");
        return;
      }
      // Ask for notification permission once we start tracking (non-blocking failure)
      try { await requestNotificationPermission(); } catch { /* ignore */ }
      setError(null);
      setWatching(true);
      watchId.current = navigator.geolocation.watchPosition(
        (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => {
          const msg =
            e.code === 1 ? "Location permission denied. Enable it in your browser settings."
            : e.code === 2 ? "Location unavailable. Check your GPS or network."
            : e.code === 3 ? "Location request timed out. Try again."
            : (e.message || "Could not get your location.");
          setError(msg);
          setWatching(false);
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
      );
    } catch (err: any) {
      setError(err?.message || "Could not start location tracking.");
      setWatching(false);
    }
  };

  const stopWatch = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  };

  useEffect(() => () => stopWatch(), []);

  // Load active deals (cached). Realtime subscription appends new ones.
  const { data: deals = [], refetch, isLoading, isError, error: queryError } = useQuery({
    queryKey: ["nearby-deals"],
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,created_at,stores!inner(id,name,city,slug,lat,lng,logo_url,is_verified,category)")
        .eq("status", "active")
        .limit(300);
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as unknown as Deal[];
    },
    retry: 1,
    staleTime: 30_000,
  });

  // Subscribe to new active ads in realtime — only triggers a refetch.
  useEffect(() => {
    const channel = supabase
      .channel("nearby-new-ads")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ads" }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  // Compute and rank nearby deals
  const ranked = useMemo(() => {
    if (!pos) return [] as Array<Deal & { _km: number }>;
    const safeDeals = Array.isArray(deals) ? deals : [];
    const cats = new Set(prefs.categories ?? []);
    return safeDeals
      .map((d) => {
        if (!d || !d.stores) return null;
        const lat = d.stores?.lat, lng = d.stores?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return null;
        const km = haversineKm(pos, { lat, lng });
        if (!Number.isFinite(km)) return null;
        return { ...d, _km: km };
      })
      .filter((d): d is Deal & { _km: number } =>
        !!d && d._km <= prefs.radiusKm && cats.has(d.category as CategorySlug),
      )
      .sort((a, b) => a._km - b._km);
  }, [deals, pos, prefs.radiusKm, prefs.categories]);

  // Geofence enter detection: ad-IDs currently within radius
  const insideRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!pos) return;
    const currentlyInside = new Set(ranked.map((d) => d.id));
    // Newly entered = in current set but not in previous
    const entered: typeof ranked = [];
    for (const d of ranked) {
      if (!insideRef.current.has(d.id)) entered.push(d);
    }
    insideRef.current = currentlyInside;

    if (entered.length === 0) return;

    // Notify (respecting cooldown / daily cap / quiet hours)
    (async () => {
      try {
        for (const d of entered.slice(0, 3)) {
          if (!canNotify(d.id, prefs)) continue;
          const dist = Math.round(d._km * 1000);
          const distLabel = dist < 1000 ? `${dist} m` : `${(d._km).toFixed(1)} km`;
          const pct = d.discount_pct ? `${d.discount_pct}% off ` : "";
          try {
            await showDealNotification(
              {
                adId: d.id,
                title: `🔥 ${pct}${d.title}`,
                body: `${d.stores?.name ?? ""} · ${distLabel} away`,
                distanceM: dist,
                url: `/deals/${d.id}`,
                imageUrl: d.cover_image_url,
              },
              prefs,
            );
          } catch { /* notification API may fail — toast is fallback */ }
          markNotified(d.id);

          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("notification_logs").insert({
                user_id: user.id, ad_id: d.id, distance_m: dist,
              });
            }
          } catch { /* ignore */ }

          toast.message(`${pct}${d.title}`, { description: `${d.stores?.name ?? ""} · ${distLabel} away` });
        }
      } catch (e) {
        console.warn("[nearby] notification loop failed", e);
      }
    })();
  }, [ranked, pos, prefs]);

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-4 sm:py-6 md:py-10 pb-24 md:pb-10 space-y-4 sm:space-y-6 overflow-x-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">Deals Near Me</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
            Within {prefs.radiusKm} km · {prefs.categories.length} categories
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 rounded-full">
              <SettingsIcon className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Distance</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(16rem,calc(100vw-1.5rem))]">
            <div className="space-y-3">
              <div className="text-sm font-medium">Search radius</div>
              <div className="grid grid-cols-3 gap-2">
                {RADIUS_OPTIONS.map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={prefs.radiusKm === r ? "default" : "outline"}
                    onClick={() => {
                      const next = { ...prefs, radiusKm: r as Radius };
                      setPrefs(next);
                      savePrefs(next);
                    }}
                  >
                    {r} km
                  </Button>
                ))}
              </div>
              <Link to="/profile/notifications" className="block text-xs text-muted-foreground underline pt-1">
                More notification settings
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Status pill */}
      <div className="rounded-2xl border bg-card p-3 sm:p-4 flex items-center gap-3">
        <span className={`relative flex h-3 w-3 shrink-0 ${watching ? "" : "opacity-50"}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${watching ? "bg-green-500" : "bg-muted-foreground"}`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${watching ? "bg-green-500" : "bg-muted-foreground"}`} />
        </span>
        <div className="flex-1 min-w-0 text-sm">
          {watching ? <span className="text-green-600 font-medium">Active</span> : <span className="text-muted-foreground">Inactive</span>}
          {error && <span className="text-destructive block mt-1 text-xs break-words">{error}</span>}
        </div>
        {!watching ? (
          <Button onClick={startWatch} size="sm" className="shrink-0 rounded-full">
            <LocateFixed className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Start</span>
          </Button>
        ) : (
          <Button onClick={stopWatch} variant="outline" size="sm" className="shrink-0 rounded-full">Stop</Button>
        )}
      </div>

      {!prefs.enabled && (
        <div className="rounded-2xl border border-dashed p-4 text-sm flex items-center gap-3">
          <Bell className="h-5 w-5 shrink-0 text-muted-foreground" />
          Notifications are disabled. <Link to="/profile" className="underline">Enable in settings</Link>.
        </div>
      )}

      {/* Live list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {pos ? `${ranked.length} deal${ranked.length === 1 ? "" : "s"} within ${prefs.radiusKm} km` : "Start tracking to see nearby deals"}
        </h2>

        {isError && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm space-y-2">
            <p className="text-destructive font-medium">Couldn't load deals.</p>
            <p className="text-muted-foreground text-xs break-words">
              {(queryError as Error)?.message ?? "Network or server error."}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {isLoading && !isError && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && !isError && pos && ranked.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            No active deals in your {prefs.radiusKm} km radius right now.
            <div className="mt-2 text-sm">Try increasing your radius above.</div>
          </div>
        )}

        {!isLoading && !isError && ranked.length > 0 && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {ranked.map((d) => (
              <div key={d.id} className="space-y-1 min-w-0">
                <DealCard deal={d as any} distanceKm={d._km} />
                <p className="text-xs text-muted-foreground px-1">{formatDistance(d._km)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t">
        Note: location tracking only runs while this tab is open. For true background alerts, install the app to your home screen on a supported device.
      </p>
    </div>
  );
}
