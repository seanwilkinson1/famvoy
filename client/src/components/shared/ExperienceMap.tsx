import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMapsContext } from "./GoogleMapsProvider";

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
  gestureHandling: "none",
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

interface ExperienceMapProps {
  lat: number;
  lng: number;
  title?: string;
  className?: string;
}

export function ExperienceMap({ lat, lng, title, className = "" }: ExperienceMapProps) {
  const { isLoaded } = useGoogleMapsContext();
  const center = { lat, lng };

  if (!isLoaded) {
    return (
      <div className={`h-full w-full bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={14}
      options={mapOptions}
    >
      <Marker
        position={center}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4ECDC4",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }}
        title={title}
      />
    </GoogleMap>
  );
}
