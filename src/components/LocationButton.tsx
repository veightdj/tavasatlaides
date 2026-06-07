import { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getCurrentLocation, LocationError, type Coords } from "@/lib/location";
import { saveUserLocation } from "@/lib/device.functions";
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

  const handle = async () => {
    setLoading(true);
    try {
      const coords = await getCurrentLocation();
      onLocation?.(coords);
      if (persist && user) {
        try {
          await saveLocation({ data: { lat: coords.lat, lng: coords.lng } });
        } catch {
          // Non-blocking — UI already has the coords
        }
      }
      toast.success("Location shared");
    } catch (err) {
      if (err instanceof LocationError) {
        if (err.code === "permission_denied") {
          toast.error("Location permission denied", {
            description: "Enable location access in your device settings to continue.",
          });
        } else if (err.code === "unsupported") {
          toast.error("Location is not supported on this device");
        } else if (err.code === "timeout") {
          toast.error("Could not get location in time. Try again outdoors.");
        } else {
          toast.error("Location unavailable", { description: err.message });
        }
      } else {
        toast.error("Could not get your location");
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
