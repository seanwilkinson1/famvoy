// Google Places API - New Text Search API (places.googleapis.com/v1/)

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// --- Types ---

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number;
  photoUrl?: string;
  types: string[];
  location: {
    lat: number;
    lng: number;
  };
  distanceMiles?: number;
}

export interface PlaceDetails {
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
}

// --- Category Search Config ---

interface CategorySearchConfig {
  textQuery: string;
  includedType?: string;
  radiusMeters: number;
}

const CATEGORY_SEARCH_CONFIG: Record<string, CategorySearchConfig | null> = {
  "Breakfast Spot":     { textQuery: "breakfast restaurant",      includedType: "restaurant",       radiusMeters: 3000 },
  "Casual Lunch":       { textQuery: "casual lunch restaurant",   includedType: "restaurant",       radiusMeters: 3000 },
  "Fine Dining":        { textQuery: "fine dining restaurant",    includedType: "restaurant",       radiusMeters: 5000 },
  "Quick Bite":         { textQuery: "quick food",                includedType: "restaurant",       radiusMeters: 2000 },
  "Coffee Stop":        { textQuery: "coffee shop cafe",          includedType: "cafe",             radiusMeters: 1500 },
  "Beach Time":         { textQuery: "beach",                                                       radiusMeters: 15000 },
  "Hike":               { textQuery: "hiking trail",              includedType: "park",             radiusMeters: 15000 },
  "Nature Walk":        { textQuery: "nature walk park",          includedType: "park",             radiusMeters: 10000 },
  "Park Visit":         { textQuery: "park",                      includedType: "park",             radiusMeters: 5000 },
  "Scenic Viewpoint":   { textQuery: "scenic viewpoint lookout",                                    radiusMeters: 15000 },
  "Water Activity":     { textQuery: "water sports kayak surf",                                     radiusMeters: 15000 },
  "Museum":             { textQuery: "museum",                    includedType: "museum",           radiusMeters: 10000 },
  "Historic Site":      { textQuery: "historic site landmark",    includedType: "tourist_attraction", radiusMeters: 10000 },
  "Neighborhood Explore": { textQuery: "neighborhood walking tour",                                 radiusMeters: 5000 },
  "Shopping":           { textQuery: "shopping",                  includedType: "shopping_mall",    radiusMeters: 5000 },
  "Drinks / Bar":       { textQuery: "bar cocktail lounge",       includedType: "bar",              radiusMeters: 3000 },
  "Theme Park":         { textQuery: "theme park amusement park", includedType: "amusement_park",   radiusMeters: 15000 },
  "Water Park":         { textQuery: "water park",                includedType: "amusement_park",   radiusMeters: 15000 },
  "Indoor Activity":    { textQuery: "indoor entertainment bowling arcade",                         radiusMeters: 10000 },
  "Outdoor Activity":   { textQuery: "outdoor activity adventure",                                  radiusMeters: 15000 },
  "Sports Activity":    { textQuery: "sports recreation",                                           radiusMeters: 10000 },
  "Pool / Resort Time": { textQuery: "resort pool spa",                                             radiusMeters: 10000 },
  "Rest / Free Time":   null,
  "Transport":          null,
};

// Broad fallbacks for the parent category groups
const BROAD_CATEGORY_CONFIG: Record<string, CategorySearchConfig> = {
  "Food":        { textQuery: "restaurant",            includedType: "restaurant",       radiusMeters: 3000 },
  "Coffee":      { textQuery: "coffee shop cafe",      includedType: "cafe",             radiusMeters: 1500 },
  "Outdoors":    { textQuery: "outdoor activity park",                                   radiusMeters: 15000 },
  "Culture":     { textQuery: "museum historic site",  includedType: "museum",           radiusMeters: 10000 },
  "Shopping":    { textQuery: "shopping",              includedType: "shopping_mall",     radiusMeters: 5000 },
  "Nightlife":   { textQuery: "bar cocktail lounge",   includedType: "bar",              radiusMeters: 3000 },
  "Family Fun":  { textQuery: "family entertainment",  includedType: "amusement_park",   radiusMeters: 15000 },
  "Relaxation":  { textQuery: "spa wellness resort",                                     radiusMeters: 10000 },
};

export function getCategorySearchConfig(categoryLabel: string): CategorySearchConfig | null {
  return CATEGORY_SEARCH_CONFIG[categoryLabel] ?? BROAD_CATEGORY_CONFIG[categoryLabel] ?? null;
}

// --- Haversine distance ---

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Price helpers ---

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
  const prices = basePrices[itemType] || { 0: 0, 1: 25, 2: 50, 3: 100, 4: 175 };
  return prices[priceLevel ?? 2] ?? prices[2];
}

// --- New Places API: Text Search ---

export async function searchPlaces(
  query: string,
  location: { lat: number; lng: number } | string,
  options?: {
    categoryLabel?: string;
    itemType?: string;
    radiusMeters?: number;
    maxResults?: number;
    referenceCoords?: { lat: number; lng: number };
  }
): Promise<PlaceSearchResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("Google Places API key not configured");
    return [];
  }

  const config = options?.categoryLabel ? getCategorySearchConfig(options.categoryLabel) : null;
  const destinationSuffix = typeof location === "string" ? ` in ${location}` : "";
  const textQuery = config ? `${config.textQuery}${destinationSuffix}` : `${query}${destinationSuffix}`;
  const radiusMeters = config?.radiusMeters ?? options?.radiusMeters ?? 5000;

  // Build location bias if we have coordinates
  let locationBias: any = undefined;
  if (typeof location === "object") {
    locationBias = {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radiusMeters,
      },
    };
  }

  const body: any = {
    textQuery,
    maxResultCount: options?.maxResults ?? 10,
    languageCode: "en",
  };
  if (config?.includedType) body.includedType = config.includedType;
  if (locationBias) body.locationBias = locationBias;

  try {
    let results = await fetchTextSearch(body);

    // Fallback: if <3 results, retry without includedType and wider radius
    if (results.length < 3 && config?.includedType) {
      const fallbackBody = {
        ...body,
        includedType: undefined,
        locationBias: locationBias ? {
          circle: {
            center: locationBias.circle.center,
            radiusMeters: radiusMeters * 2,
          },
        } : undefined,
      };
      delete fallbackBody.includedType;
      const fallbackResults = await fetchTextSearch(fallbackBody);
      // Merge, dedup by placeId
      const seen = new Set(results.map(r => r.placeId));
      for (const r of fallbackResults) {
        if (!seen.has(r.placeId)) results.push(r);
      }
    }

    // Sort by distance if reference coordinates provided
    const refCoords = options?.referenceCoords ?? (typeof location === "object" ? location : undefined);
    if (refCoords) {
      for (const r of results) {
        r.distanceMiles = calculateDistance(refCoords.lat, refCoords.lng, r.location.lat, r.location.lng);
      }
      results.sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
    }

    return results;
  } catch (error) {
    console.error("Error searching Google Places:", error);
    return [];
  }
}

async function fetchTextSearch(body: any): Promise<PlaceSearchResult[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.websiteUri,places.types",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.places) return [];

  return data.places.map((place: any) => ({
    placeId: place.id,
    name: place.displayName?.text || "",
    address: place.formattedAddress || "",
    rating: place.rating || 0,
    userRatingsTotal: place.userRatingCount || 0,
    priceLevel: parsePriceLevel(place.priceLevel),
    photoUrl: place.photos?.[0]
      ? getPhotoUrl(place.photos[0].name)
      : undefined,
    types: place.types || [],
    location: {
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
    },
  }));
}

function parsePriceLevel(priceLevel?: string): number | undefined {
  if (!priceLevel) return undefined;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[priceLevel];
}

// --- Photo URL (New API format) ---

export function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
  if (!photoName) return "";
  // New API: photo name is like "places/PLACE_ID/photos/PHOTO_REF"
  // Use server-side proxy to hide the API key
  return `/api/places/photo?name=${encodeURIComponent(photoName)}&maxwidth=${maxWidth}`;
}

export function getDirectPhotoUrl(photoName: string, maxWidth: number = 400): string {
  if (!GOOGLE_PLACES_API_KEY || !photoName) return "";
  // New API photo URL format
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_PLACES_API_KEY}`;
}

// --- Place Details (New API) ---

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("Google Places API key not configured");
    return null;
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,priceLevel,photos,websiteUri,nationalPhoneNumber,regularOpeningHours",
      },
    });

    const place = await response.json();
    if (!place.id) return null;

    return {
      placeId: place.id,
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      rating: place.rating || 0,
      userRatingsTotal: place.userRatingCount || 0,
      priceLevel: parsePriceLevel(place.priceLevel),
      photos: (place.photos || []).slice(0, 5).map((photo: any) =>
        getPhotoUrl(photo.name, 600)
      ),
      website: place.websiteUri,
      phoneNumber: place.nationalPhoneNumber,
      openingHours: place.regularOpeningHours?.weekdayDescriptions,
    };
  } catch (error) {
    console.error("Error getting place details:", error);
    return null;
  }
}

// --- Trip Item Search (used by booking/curate flow) ---

export async function searchPlacesForTripItem(
  itemTitle: string,
  itemDescription: string | null,
  itemType: string,
  destination: string,
  categoryLabel?: string | null,
  referenceCoords?: { lat: number; lng: number } | null
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
  placeId: string;
  locationLat: number;
  locationLng: number;
}[]> {
  // Try category-based search first (broad), then fall back to title-based search
  let places = await searchPlaces(
    categoryLabel ? "" : itemTitle,
    referenceCoords || destination,
    {
      categoryLabel: categoryLabel || undefined,
      itemType,
      referenceCoords: referenceCoords || undefined,
      maxResults: 10,
    }
  );

  // Fallback: if category search returned nothing, try the item title directly
  if (places.length === 0 && categoryLabel) {
    console.log(`Category "${categoryLabel}" returned 0 results, falling back to title search: "${itemTitle}"`);
    places = await searchPlaces(
      itemTitle,
      referenceCoords || destination,
      { itemType, referenceCoords: referenceCoords || undefined, maxResults: 10 }
    );
  }

  if (places.length === 0) return [];

  const providerMap: Record<string, string> = {
    STAY: "Google Hotels",
    MEAL: "Google Maps",
    ACTIVITY: "Google Maps",
    TRANSPORT: "Google Maps",
  };
  const provider = providerMap[itemType] || "Google Maps";

  return places.slice(0, 5).map((place) => {
    const bookingUrl = `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;

    return {
      title: place.name,
      description: `${place.name} - ${place.address}${place.rating > 0 ? `. Rated ${place.rating}/5 (${place.userRatingsTotal} reviews)` : ""}${place.distanceMiles !== undefined ? `. ${place.distanceMiles.toFixed(1)} mi away` : ""}`,
      priceEstimate: getPriceLevelString(place.priceLevel),
      numericPriceEstimate: getNumericPriceEstimate(place.priceLevel, itemType),
      rating: place.rating > 0 ? place.rating.toFixed(1) : "N/A",
      reviewCount: place.userRatingsTotal,
      image: place.photoUrl || "",
      bookingUrl,
      address: place.address,
      provider,
      placeId: place.placeId,
      locationLat: place.location.lat,
      locationLng: place.location.lng,
    };
  });
}
