import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, LocateFixed, Settings as SettingsIcon, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/DealCard";
import { distanceKm as haversineKm, formatDistance } from "@/lib/distance";
import {
  loadPrefs, requestNotificationPermission,
  GEOLOCATION_FRIENDLY_MESSAGE, setSavedLocation, getSavedLocation,
  type NotificationPrefs,
} from "@/lib/notifications";
import type { CategorySlug } from "@/lib/categories";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/nearby")({
  head: () => ({
    meta: [
      { title: "Deals Near Me — TavasAtlaides" },
      { name: "description", content: "Live nearby deals. Get notified when a discount appears within your radius." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/nearby" }],
  }),
  component: NearbyPage,
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
  const { t } = useI18n();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = getSavedLocation();
    return saved ? { lat: saved.lat, lng: saved.lng } : null;
  });
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadPrefs());
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    const onFocus = () => setPrefs(loadPrefs());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Effective radius in km (null = unlimited)
  const radiusKm = prefs.radiusM == null ? null : prefs.radiusM / 1000;
  const radiusLabel = radiusKm == null ? "any distance" : radiusKm < 1 ? `${prefs.radiusM} m` : `${radiusKm} km`;

  const startWatch = async () => {
    if (!("geolocation" in navigator)) {
      setError(GEOLOCATION_FRIENDLY_MESSAGE);
      return;
    }
    await requestNotificationPermission();
    setError(null);
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setSavedLocation(p.coords.latitude, p.coords.longitude);
      },
      () => {
        setError(GEOLOCATION_FRIENDLY_MESSAGE);
        setWatching(false);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
  };

  const stopWatch = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  };

  useEffect(() => () => stopWatch(), []);

  const { data: deals = [], refetch } = useQuery({
    queryKey: ["nearby-deals"],
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,created_at,stores!inner(id,name,city,slug,lat,lng)")
        .eq("status", "active")
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Deal[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("nearby-new-ads")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ads" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const ranked = useMemo(() => {
    if (!pos) return [] as Array<Deal & { _km: number }>;
    return deals
      .map((d) => {
        const lat = d.stores?.lat, lng = d.stores?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return null;
        const km = haversineKm(pos, { lat, lng });
        return { ...d, _km: km };
      })
      .filter((d): d is Deal & { _km: number } => !!d && (radiusKm == null || d._km <= radiusKm))
      .filter((d) => prefs.categories.includes(d.category as CategorySlug))
      .sort((a, b) => a._km - b._km);
  }, [deals, pos, radiusKm, prefs.categories]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10 pb-24 md:pb-10 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Deals Near Me</h1>
          <p className="text-muted-foreground mt-1">Live alerts within {radiusLabel} · {prefs.categories.length} categories</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings/notifications"><SettingsIcon className="h-4 w-4 mr-1.5" />Settings</Link>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
        <span className={`relative flex h-3 w-3 shrink-0 ${watching ? "" : "opacity-50"}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${watching ? "bg-green-500" : "bg-muted-foreground"}`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${watching ? "bg-green-500" : "bg-muted-foreground"}`} />
        </span>
        <div className="flex-1 text-sm">
          {watching ? <span className="text-green-600 font-medium">Active</span> : <span className="text-muted-foreground">Inactive</span>}
          {error && <span className="text-destructive block mt-1">{error}</span>}
          {!error && !watching && pos && (
            <span className="text-muted-foreground block mt-1 text-xs inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Showing results from your last known location.
            </span>
          )}
        </div>
        {!watching ? (
          <Button onClick={startWatch} size="sm" className="rounded-full">
            <LocateFixed className="h-4 w-4 mr-1.5" />Start
          </Button>
        ) : (
          <Button onClick={stopWatch} variant="outline" size="sm" className="rounded-full">Stop</Button>
        )}
      </div>

      {!prefs.enabled && (
        <div className="rounded-2xl border border-dashed p-4 text-sm flex items-center gap-3">
          <Bell className="h-5 w-5 shrink-0 text-muted-foreground" />
          Notifications are disabled. <Link to="/settings/notifications" className="underline">Enable in settings</Link>.
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {pos ? `${ranked.length} deal${ranked.length === 1 ? "" : "s"} within ${radiusLabel}` : "Start tracking to see nearby deals"}
        </h2>
        {pos && ranked.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            No active deals within {radiusLabel} right now.
            <div className="mt-2 text-sm">Try increasing your radius in <Link to="/settings/notifications" className="underline">settings</Link>.</div>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          {ranked.map((d) => (
            <div key={d.id} className="space-y-1">
              <DealCard deal={d as any} distanceKm={d._km} />
              <p className="text-xs text-muted-foreground px-1">{formatDistance(d._km)}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t">
        Push alerts are delivered automatically when a new deal appears within your radius — even when this tab is closed (with the app installed and notifications enabled).
      </p>
    </div>
  );
}
