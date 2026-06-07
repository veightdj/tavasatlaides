import { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getCurrentLocation, LocationError, type Coords } from "@/lib/location";
import { saveUserLocation } from "@/lib/device.functions";
import { saveNotificationLocation } from "@/lib/notification-location.functions";
import { setSavedLocation, GEOLOCATION_FRIENDLY_MESSAGE, loadPrefs, savePrefs } from "@/lib/notifications";
import { useAuth } from "@/hooks/use-auth";

type Props = {
  onLocation?: (c: Coords) => void;
  persist?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost" | "secondary";
  label?: string;
  className?: string;
};

export function LocationButton({
  onLocation,
  persist = true,
  size = "default",
  variant = "default",
  label = "Share my location",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const saveLocation = useServerFn(saveUserLocation);
  const saveNotifLoc = useServerFn(saveNotificationLocation);

  const handle = async () => {
    setLoading(true);
    try {
      const coords = await getCurrentLocation();
      onLocation?.(coords);

      // Always cache last-known coords on the device
      setSavedLocation(coords.lat, coords.lng);
      const prefs = loadPrefs();
      savePrefs({ ...prefs, latitude: coords.lat, longitude: coords.lng });

      if (persist && user) {
        try { await saveLocation({ data: { lat: coords.lat, lng: coords.lng } }); } catch { /* non-blocking */ }
        try { await saveNotifLoc({ data: { latitude: coords.lat, longitude: coords.lng } }); } catch { /* non-blocking */ }
      }
      toast.success("Location shared");
    } catch (err) {
      if (err instanceof LocationError) {
        toast.error("Location unavailable", {
          description: GEOLOCATION_FRIENDLY_MESSAGE,
        });
      } else {
        toast.error("Location unavailable", { description: GEOLOCATION_FRIENDLY_MESSAGE });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handle}
      disabled={loading}
      size={size}
      variant={variant}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <LocateFixed className="h-4 w-4 mr-2" />
      )}
      {loading ? "Locating…" : label}
    </Button>
  );
}
