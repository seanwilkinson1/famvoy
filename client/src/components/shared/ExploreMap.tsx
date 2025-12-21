import { useCallback, useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, InfoWindow, OverlayView } from "@react-google-maps/api";
import { useLocation } from "wouter";
import type { Experience, User } from "@shared/schema";
import { useGoogleMapsContext } from "./GoogleMapsProvider";

interface ExplorePerson extends User {
  podIds: number[];
  distance?: number;
}

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
  searchLocation?: { lat: number; lng: number } | null;
  people?: ExplorePerson[];
}

export function ExploreMap({
  experiences,
  userLocation,
  onExperienceClick,
  className = "",
  searchLocation,
  people = [],
}: ExploreMapProps) {
  const [, setLocation] = useLocation();
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<ExplorePerson | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { isLoaded } = useGoogleMapsContext();
  const lastFitKey = useRef<string>("");
  const initialCenterSet = useRef(false);
  const lastSearchLocation = useRef<string>("");

  useEffect(() => {
    if (!map || !searchLocation) return;
    
    const searchKey = `${searchLocation.lat},${searchLocation.lng}`;
    if (searchKey !== lastSearchLocation.current) {
      map.panTo(searchLocation);
      map.setZoom(12);
      lastSearchLocation.current = searchKey;
    }
  }, [map, searchLocation]);

  useEffect(() => {
    if (!map) return;

    const points: { lat: number; lng: number }[] = experiences
      .filter((exp) => exp.locationLat && exp.locationLng)
      .map((exp) => ({ lat: exp.locationLat, lng: exp.locationLng }));

    // Include people coordinates in bounds
    people.forEach((person) => {
      if (person.locationLat && person.locationLng) {
        points.push({ lat: person.locationLat, lng: person.locationLng });
      }
    });

    if (userLocation) {
      points.push(userLocation);
    }

    const fitKey = JSON.stringify({
      expIds: experiences.map(e => e.id).sort(),
      peopleIds: people.map(p => p.id).sort(),
      userLoc: userLocation ? `${userLocation.lat},${userLocation.lng}` : null
    });

    if (points.length > 0 && fitKey !== lastFitKey.current) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 50);
      lastFitKey.current = fitKey;
    }
  }, [map, experiences, people, userLocation]);

  // Clear selectedPerson when they're no longer in the people array
  useEffect(() => {
    if (selectedPerson && !people.find(p => p.id === selectedPerson.id)) {
      setSelectedPerson(null);
    }
  }, [people, selectedPerson]);

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

        {/* People Markers - Avatar Style like SeaPeople */}
        {people.map((person) => {
          if (!person.locationLat || !person.locationLng) return null;
          return (
            <OverlayView
              key={person.id}
              position={{ lat: person.locationLat, lng: person.locationLng }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div 
                className="relative cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                onClick={() => setSelectedPerson(person)}
              >
                <div className="w-12 h-12 rounded-full border-3 border-white shadow-lg overflow-hidden bg-gray-200">
                  {person.avatar || person.profileImageUrl ? (
                    <img 
                      src={person.avatar || person.profileImageUrl || ''} 
                      alt={person.name || 'Family'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-coral to-amber-400 flex items-center justify-center text-white font-bold text-lg">
                      {(person.name || 'F').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              </div>
            </OverlayView>
          );
        })}

        {/* Selected Person InfoWindow */}
        {selectedPerson && selectedPerson.locationLat && selectedPerson.locationLng && (
          <InfoWindow
            position={{
              lat: selectedPerson.locationLat,
              lng: selectedPerson.locationLng,
            }}
            onCloseClick={() => setSelectedPerson(null)}
          >
            <div
              className="cursor-pointer min-w-[150px] p-1"
              onClick={() => setLocation(`/family/${selectedPerson.id}`)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {selectedPerson.avatar || selectedPerson.profileImageUrl ? (
                    <img 
                      src={selectedPerson.avatar || selectedPerson.profileImageUrl || ''} 
                      alt={selectedPerson.name || 'Family'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-coral to-amber-400 flex items-center justify-center text-white font-bold">
                      {(selectedPerson.name || 'F').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">
                    {selectedPerson.name || 'Family'}
                  </h3>
                  <p className="text-xs text-gray-500">{selectedPerson.location || 'Unknown location'}</p>
                </div>
              </div>
              {selectedPerson.distance !== undefined && (
                <p className="text-xs text-gray-400">
                  {selectedPerson.distance < 1 
                    ? `${(selectedPerson.distance * 5280).toFixed(0)} ft away`
                    : `${selectedPerson.distance.toFixed(1)} mi away`
                  }
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
