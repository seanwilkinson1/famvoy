import { useRef, useState, useEffect, useCallback } from "react";
import { MapPin, X, Loader2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleMapsContext } from "./GoogleMapsProvider";

interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  types?: string[];
  photoUrl?: string;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  showCurrentLocation?: boolean;
  isSelected?: boolean;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onClear,
  placeholder = "Search for a location...",
  className = "",
  showCurrentLocation = true,
  isSelected = false,
}: GooglePlacesAutocompleteProps) {
  const { isLoaded } = useGoogleMapsContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);

  useEffect(() => {
    if (isLoaded && typeof google !== "undefined" && google.maps?.places) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchPlaces = useCallback(
    async (query: string) => {
      if (!isLoaded || query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        // Use the new Places API (AutocompleteSuggestion)
        const { suggestions: results } =
          await (google.maps.places as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionTokenRef.current,
          });

        const mapped: Suggestion[] = (results || []).map((s: any) => {
          const pred = s.placePrediction;
          return {
            placeId: pred.placeId,
            mainText: pred.mainText?.text || pred.text?.text || "",
            secondaryText: pred.secondaryText?.text || "",
          };
        });

        setSuggestions(mapped);
        setShowSuggestions(mapped.length > 0);
      } catch (error) {
        console.error("Places search error:", error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    },
    [isLoaded]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (value && !isSelected) {
        searchPlaces(value);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [value, isSelected, searchPlaces]);

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    try {
      // Use the new Places API (Place class)
      const place = new (google.maps.places as any).Place({
        id: suggestion.placeId,
      });

      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location", "types", "photos"],
      });

      const location = place.location;
      if (!location) return;

      const displayValue = suggestion.secondaryText
        ? `${suggestion.mainText}, ${suggestion.secondaryText.split(",")[0]?.trim()}`
        : suggestion.mainText;

      let photoUrl: string | undefined;
      if (place.photos && place.photos.length > 0) {
        photoUrl = place.photos[0].getURI({ maxWidth: 400 });
      }

      const result: PlaceResult = {
        name: displayValue,
        address: place.formattedAddress || displayValue,
        lat: location.lat(),
        lng: location.lng(),
        placeId: suggestion.placeId,
        types: place.types || [],
        photoUrl,
      };

      onPlaceSelect(result);
      onChange(displayValue);
      setSuggestions([]);
      setShowSuggestions(false);

      // Refresh session token
      if (typeof google !== "undefined" && google.maps?.places) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }
    } catch (error) {
      console.error("Place details error:", error);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;

    setIsGettingCurrentLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setIsGettingCurrentLocation(false);
              if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                const result = results[0];
                const cityComponent = result.address_components.find(
                  (c) =>
                    c.types.includes("locality") ||
                    c.types.includes("administrative_area_level_2")
                );
                const stateComponent = result.address_components.find((c) =>
                  c.types.includes("administrative_area_level_1")
                );

                const locationName =
                  cityComponent && stateComponent
                    ? `${cityComponent.long_name}, ${stateComponent.short_name}`
                    : result.formatted_address.split(",").slice(0, 2).join(", ");

                onPlaceSelect({
                  name: locationName,
                  address: result.formatted_address,
                  lat: latitude,
                  lng: longitude,
                  placeId: result.place_id,
                });
                onChange(locationName);
              }
            }
          );
        } catch {
          setIsGettingCurrentLocation(false);
        }
      },
      () => {
        setIsGettingCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClear = () => {
    onChange("");
    setSuggestions([]);
    onClear?.();
    inputRef.current?.focus();
  };

  if (!isLoaded) {
    return (
      <div className={cn("relative", className)}>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Loading..."
            disabled
            className="w-full rounded-xl border border-border bg-muted py-4 pl-12 pr-4 text-base font-medium text-muted-foreground"
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {showCurrentLocation && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGettingCurrentLocation}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-50"
            data-testid="button-use-current-location"
          >
            {isGettingCurrentLocation ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <Navigation className="h-3 w-3" />
                Use My Location
              </>
            )}
          </button>
        </div>
      )}

      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (isSelected && onClear) {
              onClear();
            }
          }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className={cn(
            "w-full rounded-xl border bg-white py-4 pl-12 pr-10 text-base font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none",
            isSelected ? "border-primary bg-primary/5" : "border-border"
          )}
          data-testid="input-location-autocomplete"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
        {isSelected && !isSearching && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-border flex items-center justify-center hover:bg-gray-300"
            data-testid="button-clear-location"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-white shadow-lg overflow-hidden">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-muted flex items-start gap-3 border-b border-border last:border-0"
              data-testid={`place-suggestion-${suggestion.placeId}`}
            >
              <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {suggestion.mainText}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.secondaryText}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isSelected && (
        <p className="mt-2 text-xs text-primary font-medium flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Location selected - will appear on maps
        </p>
      )}
    </div>
  );
}
