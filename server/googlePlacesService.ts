interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number;
  photoReference?: string;
  photoUrl?: string;
  types: string[];
  location: {
    lat: number;
    lng: number;
  };
}

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number;
  photos: string[];
  website?: string;
  phoneNumber?: string;
  openingHours?: string[];
  reviews?: {
    rating: number;
    text: string;
    authorName: string;
  }[];
}

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

function getPlaceTypeForItemType(itemType: string): string[] {
  const typeMap: Record<string, string[]> = {
    STAY: ["lodging", "hotel"],
    MEAL: ["restaurant", "cafe", "food"],
    ACTIVITY: ["tourist_attraction", "museum", "amusement_park", "park"],
    TRANSPORT: ["car_rental", "transit_station"],
  };
  return typeMap[itemType] || ["point_of_interest"];
}

function getPriceLevelString(priceLevel?: number): string {
  if (priceLevel === undefined) return "Price varies";
  const levels = ["Free", "$", "$$", "$$$", "$$$$"];
  return levels[priceLevel] || "Price varies";
}

function getNumericPriceEstimate(priceLevel: number | undefined, itemType: string): number {
  const basePrices: Record<string, Record<number, number>> = {
    MEAL: { 0: 0, 1: 15, 2: 30, 3: 60, 4: 100 },
    STAY: { 0: 0, 1: 80, 2: 150, 3: 250, 4: 400 },
    ACTIVITY: { 0: 0, 1: 20, 2: 50, 3: 100, 4: 200 },
    TRANSPORT: { 0: 0, 1: 15, 2: 30, 3: 50, 4: 80 },
  };
  
  const defaultPrices = { 0: 0, 1: 25, 2: 50, 3: 100, 4: 175 };
  const prices = basePrices[itemType] || defaultPrices;
  
  if (priceLevel === undefined) {
    return prices[2];
  }
  
  return prices[priceLevel] ?? prices[2];
}

export async function searchPlaces(
  query: string,
  location: string,
  itemType: string
): Promise<PlaceSearchResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("Google Places API key not configured");
    return [];
  }

  const placeTypes = getPlaceTypeForItemType(itemType);
  const searchQuery = `${query} ${placeTypes[0]} in ${location}`;
  
  try {
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(textSearchUrl);
    const data = await response.json();
    
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.status, data.error_message);
      return [];
    }
    
    const results = (data.results || []).slice(0, 5);
    
    return results.map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity || location,
      rating: place.rating || 0,
      userRatingsTotal: place.user_ratings_total || 0,
      priceLevel: place.price_level,
      photoReference: place.photos?.[0]?.photo_reference,
      photoUrl: place.photos?.[0]?.photo_reference 
        ? getPhotoUrl(place.photos[0].photo_reference)
        : undefined,
      types: place.types || [],
      location: {
        lat: place.geometry?.location?.lat || 0,
        lng: place.geometry?.location?.lng || 0,
      },
    }));
  } catch (error) {
    console.error("Error searching Google Places:", error);
    return [];
  }
}

export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  if (!photoReference) return "";
  // Use a server-side proxy endpoint to hide the API key from clients
  return `/api/places/photo?ref=${encodeURIComponent(photoReference)}&maxwidth=${maxWidth}`;
}

export function getDirectPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  if (!GOOGLE_PLACES_API_KEY || !photoReference) return "";
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("Google Places API key not configured");
    return null;
  }

  try {
    const fields = "place_id,name,formatted_address,rating,user_ratings_total,price_level,photos,website,formatted_phone_number,opening_hours,reviews";
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(detailsUrl);
    const data = await response.json();
    
    if (data.status !== "OK") {
      console.error("Google Places Details API error:", data.status, data.error_message);
      return null;
    }
    
    const place = data.result;
    
    return {
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address || "",
      rating: place.rating || 0,
      userRatingsTotal: place.user_ratings_total || 0,
      priceLevel: place.price_level,
      photos: (place.photos || []).slice(0, 5).map((photo: any) => 
        getPhotoUrl(photo.photo_reference, 600)
      ),
      website: place.website,
      phoneNumber: place.formatted_phone_number,
      openingHours: place.opening_hours?.weekday_text,
      reviews: (place.reviews || []).slice(0, 3).map((review: any) => ({
        rating: review.rating,
        text: review.text,
        authorName: review.author_name,
      })),
    };
  } catch (error) {
    console.error("Error getting place details:", error);
    return null;
  }
}

export async function searchPlacesForTripItem(
  itemTitle: string,
  itemDescription: string | null,
  itemType: string,
  destination: string
): Promise<{
  title: string;
  description: string;
  priceEstimate: string;
  numericPriceEstimate: number;
  rating: string;
  reviewCount: number;
  image: string;
  bookingUrl: string;
  address: string;
  provider: string;
  placeId?: string;
}[]> {
  const searchQuery = itemTitle;
  const places = await searchPlaces(searchQuery, destination, itemType);
  
  if (places.length === 0) {
    return [];
  }

  const providerMap: Record<string, string> = {
    STAY: "Google Hotels",
    MEAL: "Google Maps",
    ACTIVITY: "Google Maps",
    TRANSPORT: "Google Maps",
  };
  const provider = providerMap[itemType] || "Google Maps";

  return places.slice(0, 3).map((place) => {
    const bookingUrl = itemType === "STAY"
      ? `https://www.google.com/travel/hotels/entity/${place.placeId}`
      : `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;

    return {
      title: place.name,
      description: `${place.name} - Located at ${place.address}. ${place.rating > 0 ? `Rated ${place.rating}/5 by ${place.userRatingsTotal} reviewers.` : ""}`,
      priceEstimate: getPriceLevelString(place.priceLevel),
      numericPriceEstimate: getNumericPriceEstimate(place.priceLevel, itemType),
      rating: place.rating > 0 ? place.rating.toFixed(1) : "N/A",
      reviewCount: place.userRatingsTotal,
      image: place.photoUrl || "",
      bookingUrl,
      address: place.address,
      provider,
      placeId: place.placeId,
    };
  });
}
