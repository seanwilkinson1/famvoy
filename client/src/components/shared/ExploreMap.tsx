import { useCallback, useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useLocation } from "wouter";
import type { Experience } from "@shared/schema";
import { useGoogleMapsContext } from "./GoogleMapsProvider";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = { lat: 37.7749, lng: -122.4194 };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

interface ExploreMapProps {
  experiences: Experience[];
  userLocation?: { lat: number; lng: number } | null;
  onExperienceClick?: (experience: Experience) => void;
  className?: string;
}

export function ExploreMap({
  experiences,
  userLocation,
  onExperienceClick,
  className = "",
}: ExploreMapProps) {
  const [, setLocation] = useLocation();
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { isLoaded } = useGoogleMapsContext();
  const lastFitKey = useRef<string>("");
  const initialCenterSet = useRef(false);

  useEffect(() => {
    if (!map) return;

    const points = experiences
      .filter((exp) => exp.locationLat && exp.locationLng)
      .map((exp) => ({ lat: exp.locationLat, lng: exp.locationLng }));

    if (userLocation) {
      points.push(userLocation);
    }

    const fitKey = JSON.stringify({
      expIds: experiences.map(e => e.id).sort(),
      userLoc: userLocation ? `${userLocation.lat},${userLocation.lng}` : null
    });

    if (points.length > 0 && fitKey !== lastFitKey.current) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 50);
      lastFitKey.current = fitKey;
    }
  }, [map, experiences, userLocation]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    initialCenterSet.current = true;
  }, []);

  const handleExperienceClick = (exp: Experience) => {
    if (onExperienceClick) {
      onExperienceClick(exp);
    } else {
      setLocation(`/experience/${exp.id}`);
    }
  };

  const initialCenter = userLocation || defaultCenter;

  if (!isLoaded) {
    return (
      <div className={`relative h-full w-full bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={initialCenterSet.current ? undefined : initialCenter}
        zoom={initialCenterSet.current ? undefined : 12}
        onLoad={onLoad}
        options={mapOptions}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#3b82f6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            }}
            title="You are here"
          />
        )}

        {experiences.map((exp) => (
          <Marker
            key={exp.id}
            position={{ lat: exp.locationLat, lng: exp.locationLng }}
            onClick={() => setSelectedExperience(exp)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4ECDC4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
          />
        ))}

        {selectedExperience && (
          <InfoWindow
            position={{
              lat: selectedExperience.locationLat,
              lng: selectedExperience.locationLng,
            }}
            onCloseClick={() => setSelectedExperience(null)}
          >
            <div
              className="cursor-pointer min-w-[150px] p-1"
              onClick={() => handleExperienceClick(selectedExperience)}
            >
              <img
                src={selectedExperience.image}
                alt={selectedExperience.title}
                className="w-full h-20 object-cover rounded-lg mb-2"
              />
              <h3 className="font-semibold text-sm text-gray-900">
                {selectedExperience.title}
              </h3>
              <p className="text-xs text-gray-500">{selectedExperience.locationName}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-primary font-medium">{selectedExperience.cost}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{selectedExperience.duration}</span>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
