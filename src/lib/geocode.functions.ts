import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const Input = z.object({
  address: z.string().min(2).max(300),
  city: z.string().min(1).max(120).optional(),
  postalCode: z.string().max(40).optional(),
  country: z.string().min(1).max(120).optional(),
});

export const geocodeAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY missing");

    const full = [data.address, data.postalCode, data.city, data.country ?? "Latvia"]
      .filter(Boolean)
      .join(", ");

    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(full)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      },
    });
    if (!res.ok) throw new Error(`Geocode failed [${res.status}]`);
    const json: any = await res.json();
    if (json.status !== "OK" || !json.results?.length) {
      return { lat: null as number | null, lng: null as number | null, status: json.status ?? "ZERO_RESULTS" };
    }
    const loc = json.results[0].geometry.location;
    return { lat: loc.lat as number, lng: loc.lng as number, status: "OK" };
  });
