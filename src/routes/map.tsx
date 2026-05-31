import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/use-i18n";
import { loadGoogleMaps } from "@/lib/google-maps";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Deals map — TavasAtlaides" },
      { name: "description", content: "See all active local deals in Riga & Jurmala on an interactive map." },
      { property: "og:title", content: "Deals map — TavasAtlaides" },
      { property: "og:description", content: "See all active local deals in Riga & Jurmala on an interactive map." },
      { property: "og:url", content: "https://superatlaides.lovable.app/map" },
      { name: "twitter:title", content: "Deals map — TavasAtlaides" },
      { name: "twitter:description", content: "See all active local deals in Riga & Jurmala on an interactive map." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/map" }],
  }),
  component: MapPage,
});

declare global { interface Window { google: any; initDealsMap?: () => void } }

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Riga: { lat: 56.9496, lng: 24.1052 },
  Jurmala: { lat: 56.968, lng: 23.7704 },
};

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function MapPage() {
  const { t } = useI18n();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const [ready, setReady] = useState(false);

  const { data: stores = [] } = useQuery({
    queryKey: ["map-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,city,category,lat,lng,address, ads(id,title,status,discount_pct)")
        .not("lat", "is", null);
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.ads?.some((a: any) => a.status === "active"));
    },
  });

  useEffect(() => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key || !mapEl.current) return;
    let cancelled = false;

    const waitForMaps = (): Promise<void> =>
      new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          if (window.google?.maps?.Map) return resolve();
          if (Date.now() - start > 15000) return reject(new Error("Google Maps load timeout"));
          setTimeout(tick, 50);
        };
        tick();
      });

    const ensureScript = (): Promise<void> => {
      if (window.google?.maps?.Map) return Promise.resolve();
      let s = document.querySelector<HTMLScriptElement>('script[data-deals-maps]');
      if (!s) {
        s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&loading=async&libraries=places&channel=${channel ?? ""}`;
        s.async = true;
        s.defer = true;
        s.dataset.dealsMaps = "1";
        document.head.appendChild(s);
      }
      return waitForMaps();
    };

    (async () => {
      try {
        await ensureScript();
        if (cancelled || !mapEl.current) return;
        mapRef.current = new window.google.maps.Map(mapEl.current, {
          center: { lat: 56.96, lng: 24.0 },
          zoom: 11,
        });
        setReady(true);
      } catch (e) {
        console.error("[map] init failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    if (!ready || !mapRef.current || !window.google) return;
    const markers: any[] = [];
    stores.forEach((s: any) => {
      const activeAd = s.ads?.find((a: any) => a.status === "active");
      const m = new window.google.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map: mapRef.current,
        title: s.name,
      });
      const discountBadge = activeAd?.discount_pct
        ? `<div style="display:inline-block;background:#e85d3a;color:#fff;font-weight:700;border-radius:999px;padding:2px 8px;font-size:12px;margin-bottom:6px">-${activeAd.discount_pct}%</div><br/>`
        : "";
      const dealTitle = activeAd ? `<div style="color:#444;font-size:13px;margin:2px 0 6px">${escapeHtml(activeAd.title ?? "")}</div>` : "";
      const dealLink = activeAd
        ? `<a href="/deals/${encodeURIComponent(activeAd.id)}" style="display:inline-block;background:#0d0d0d;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:600;text-decoration:none;margin-right:6px">${escapeHtml(t.deals.shareAndSave ?? "Open offer")}</a>`
        : "";
      const iw = new window.google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;font-size:14px;max-width:220px">${discountBadge}<strong>${escapeHtml(s.name)}</strong><br/><span style="color:#888;font-size:12px;text-transform:capitalize">${escapeHtml(s.category ?? "")}</span>${dealTitle}<div style="color:#666;font-size:12px;margin-bottom:8px">${escapeHtml(s.address)}</div>${dealLink}<a href="/stores/${encodeURIComponent(s.id)}" style="color:#c2410c;font-size:12px;font-weight:600">${escapeHtml(t.deals.viewStore)} →</a></div>`,
      });
      m.addListener("click", () => iw.open({ map: mapRef.current, anchor: m }));
      markers.push(m);
    });
    return () => markers.forEach((m) => m.setMap(null));
  }, [stores, t, ready]);


  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t.map.title}</h1>
        <div className="flex gap-2 text-sm">
          {Object.entries(CITY_CENTERS).map(([city, c]) => (
            <button
              key={city}
              onClick={() => mapRef.current?.panTo(c)}
              className="rounded-full border border-border px-3 py-1 hover:bg-accent"
            >
              {city === "Riga" ? t.city.riga : t.city.jurmala}
            </button>
          ))}
        </div>
      </div>
      <div ref={mapEl} className="w-full h-[70vh] rounded-2xl border bg-muted" />
      {stores.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t.deals.empty} <Link to="/deals" className="text-primary">{t.nav.deals}</Link>
        </p>
      )}
    </div>
  );
}
