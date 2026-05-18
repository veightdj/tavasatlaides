import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Deals map — DealsLV" }] }),
  component: MapPage,
});

declare global { interface Window { google: any; initDealsMap?: () => void } }

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Riga: { lat: 56.9496, lng: 24.1052 },
  Jurmala: { lat: 56.968, lng: 23.7704 },
};

function MapPage() {
  const { t } = useI18n();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const { data: stores = [] } = useQuery({
    queryKey: ["map-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,city,lat,lng,address, ads(id,title,status,discount_pct)")
        .not("lat", "is", null);
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.ads?.some((a: any) => a.status === "active"));
    },
  });

  useEffect(() => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key || !mapEl.current) return;

    const init = () => {
      if (!mapEl.current) return;
      mapRef.current = new window.google.maps.Map(mapEl.current, {
        center: { lat: 56.96, lng: 24.0 },
        zoom: 11,
      });
    };

    if (window.google?.maps) {
      init();
    } else {
      window.initDealsMap = init;
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=initDealsMap&channel=${channel ?? ""}`;
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    const markers: any[] = [];
    stores.forEach((s: any) => {
      const m = new window.google.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map: mapRef.current,
        title: s.name,
      });
      const iw = new window.google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;font-size:14px;max-width:200px"><strong>${s.name}</strong><br/>${s.address}<br/><a href="/stores/${s.id}" style="color:#c2410c">View store →</a></div>`,
      });
      m.addListener("click", () => iw.open({ map: mapRef.current, anchor: m }));
      markers.push(m);
    });
    return () => markers.forEach((m) => m.setMap(null));
  }, [stores]);

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
