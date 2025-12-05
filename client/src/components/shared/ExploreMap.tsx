import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import { useLocation } from "wouter";
import type { Experience } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const experienceIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapCenterProps {
  center: [number, number];
  zoom?: number;
}

function MapCenter({ center, zoom = 13 }: MapCenterProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

interface FitBoundsProps {
  experiences: Experience[];
  userLocation?: { lat: number; lng: number } | null;
}

function FitBounds({ experiences, userLocation }: FitBoundsProps) {
  const map = useMap();
  const lastFitKey = useRef<string>("");
  
  useEffect(() => {
    const points: [number, number][] = experiences
      .filter(exp => exp.locationLat !== undefined && exp.locationLng !== undefined)
      .map(exp => [exp.locationLat, exp.locationLng]);
    
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }
    
    const fitKey = JSON.stringify({
      expIds: experiences.map(e => e.id).sort(),
      userLoc: userLocation ? `${userLocation.lat},${userLocation.lng}` : null
    });
    
    if (points.length > 0 && fitKey !== lastFitKey.current) {
      const bounds = new LatLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      lastFitKey.current = fitKey;
    }
  }, [map, experiences, userLocation]);
  
  return null;
}

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
  className = ""
}: ExploreMapProps) {
  const [, setLocation] = useLocation();
  
  const defaultCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [37.7749, -122.4194];

  const handleExperienceClick = (exp: Experience) => {
    if (onExperienceClick) {
      onExperienceClick(exp);
    } else {
      setLocation(`/experience/${exp.id}`);
    }
  };

  return (
    <div className={`relative h-full w-full ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds experiences={experiences} userLocation={userLocation} />
        
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-sm">You are here</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {experiences.map((exp) => (
          <Marker
            key={exp.id}
            position={[exp.locationLat, exp.locationLng]}
            icon={experienceIcon}
            eventHandlers={{
              click: () => handleExperienceClick(exp),
            }}
          >
            <Popup>
              <div 
                className="cursor-pointer min-w-[150px]"
                onClick={() => handleExperienceClick(exp)}
              >
                <img
                  src={exp.image}
                  alt={exp.title}
                  className="w-full h-20 object-cover rounded-lg mb-2"
                />
                <h3 className="font-semibold text-sm text-gray-900">{exp.title}</h3>
                <p className="text-xs text-gray-500">{exp.locationName}</p>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="text-primary font-medium">{exp.cost}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{exp.duration}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
