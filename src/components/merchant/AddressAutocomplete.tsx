import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps";

export type PickedAddress = {
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  lat: number;
  lng: number;
};

type Suggestion = {
  placePrediction: {
    placeId: string;
    text: { text: string };
    structuredFormat?: {
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
    toPlace: () => any;
  };
};

export function AddressAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  countryBias = ["lv"],
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (p: PickedAddress) => void;
  placeholder?: string;
  countryBias?: string[];
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMaps()
      .then(async (g) => {
        const places = await g.maps.importLibrary("places");
        placesLibRef.current = places;
        sessionTokenRef.current = new (places as any).AutocompleteSessionToken();
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function fetchFor(input: string) {
    if (!placesLibRef.current || input.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const { AutocompleteSuggestion } = placesLibRef.current as any;
    AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken: sessionTokenRef.current,
      includedRegionCodes: countryBias,
    })
      .then((res: any) => {
        setSuggestions(res.suggestions ?? []);
        setOpen(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }

  function handleInput(v: string) {
    onChange(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchFor(v), 220);
  }

  async function selectSuggestion(s: Suggestion) {
    try {
      const place = s.placePrediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "addressComponents", "location"],
      });
      const comps: any[] = place.addressComponents ?? [];
      const get = (type: string) =>
        comps.find((c) => c.types?.includes(type))?.longText ??
        comps.find((c) => c.types?.includes(type))?.shortText;

      const streetNumber = get("street_number");
      const route = get("route");
      const street = [route, streetNumber].filter(Boolean).join(" ");
      const city = get("locality") ?? get("postal_town") ?? get("administrative_area_level_2");
      const postalCode = get("postal_code");
      const country = get("country");
      const loc = place.location;
      const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
      const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;

      const displayAddress = street || place.formattedAddress?.split(",")[0] || s.placePrediction.text.text;
      onChange(displayAddress);
      onPick({
        address: displayAddress,
        city,
        postalCode,
        country,
        lat,
        lng,
      });
      setOpen(false);
      // new session for next query
      sessionTokenRef.current = new (placesLibRef.current as any).AutocompleteSessionToken();
    } catch {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "Brīvības iela 155, Rīga"}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {suggestions.slice(0, 6).map((s, i) => {
            const main = s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text.text;
            const sub = s.placePrediction.structuredFormat?.secondaryText?.text;
            return (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(s)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">
                    <span className="block font-medium">{main}</span>
                    {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
