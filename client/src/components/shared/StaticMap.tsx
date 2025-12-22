import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMapsContext } from "./GoogleMapsProvider";

interface StaticMapProps {
  center: { lat: number; lng: number };
  className?: string;
  zoom?: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'none',
  draggable: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

export function StaticMap({ center, className = "", zoom = 12 }: StaticMapProps) {
  const { isLoaded, loadError } = useGoogleMapsContext();

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <span className="text-gray-500 text-sm">Map unavailable</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <span className="text-gray-500 text-sm">Loading map...</span>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={mapOptions}
      >
        <Marker position={center} />
      </GoogleMap>
    </div>
  );
}
