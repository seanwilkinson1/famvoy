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
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);

  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current && typeof google !== 'undefined' && google.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      const mapDiv = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(mapDiv);
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchPlaces = useCallback(
    async (query: string) => {
      if (!autocompleteServiceRef.current || query.length < 2) {
        setPredictions([]);
        return;
      }

      setIsSearching(true);
      try {
        const request: google.maps.places.AutocompletionRequest = {
          input: query,
          sessionToken: sessionTokenRef.current!,
        };

        autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setShowPredictions(true);
          } else {
            setPredictions([]);
          }
          setIsSearching(false);
        });
      } catch (error) {
        console.error("Places search error:", error);
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (value && !isSelected) {
        searchPlaces(value);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [value, isSelected, searchPlaces]);

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: prediction.place_id,
      fields: ["name", "formatted_address", "geometry"],
      sessionToken: sessionTokenRef.current!,
    };

    placesServiceRef.current.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry?.location) {
        const formattedAddress = place.formatted_address || prediction.description;
        const displayName = prediction.structured_formatting.main_text;
        const secondaryPart = prediction.structured_formatting.secondary_text?.split(",")[0]?.trim();
        const displayValue = secondaryPart ? `${displayName}, ${secondaryPart}` : displayName;
        
        const result: PlaceResult = {
          name: displayValue,
          address: formattedAddress,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          placeId: prediction.place_id,
        };
        
        onPlaceSelect(result);
        onChange(displayValue);
        setPredictions([]);
        setShowPredictions(false);
        if (typeof google !== 'undefined' && google.maps?.places) {
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
      }
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsGettingCurrentLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (placesServiceRef.current) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setIsGettingCurrentLocation(false);
              if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                const result = results[0];
                const cityComponent = result.address_components.find(c => 
                  c.types.includes("locality") || c.types.includes("administrative_area_level_2")
                );
                const stateComponent = result.address_components.find(c => 
                  c.types.includes("administrative_area_level_1")
                );
                
                const locationName = cityComponent && stateComponent 
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
        } else {
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
    setPredictions([]);
    onClear?.();
    inputRef.current?.focus();
  };

  if (!isLoaded) {
    return (
      <div className={cn("relative", className)}>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Loading..."
            disabled
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 text-base font-medium text-gray-400"
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
        <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
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
          onFocus={() => predictions.length > 0 && setShowPredictions(true)}
          className={cn(
            "w-full rounded-xl border bg-white py-4 pl-12 pr-10 text-base font-medium placeholder:text-gray-400 focus:border-primary focus:outline-none",
            isSelected ? "border-primary bg-primary/5" : "border-gray-200"
          )}
          data-testid="input-location-autocomplete"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
        {isSelected && !isSearching && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
            data-testid="button-clear-location"
          >
            <X className="h-3 w-3 text-gray-600" />
          </button>
        )}
      </div>

      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0"
              data-testid={`place-suggestion-${prediction.place_id}`}
            >
              <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {prediction.structured_formatting.secondary_text}
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
