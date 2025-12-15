import OpenAI from "openai";
import { storage } from "./storage";
import type { TripItem, InsertTripItemOption } from "@shared/schema";
import { searchPlacesForTripItem } from "./googlePlacesService";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface BookingSearchResult {
  title: string;
  description: string;
  priceEstimate: string;
  rating: string;
  reviewCount: number;
  image: string;
  bookingUrl: string;
  address: string;
  provider: string;
}

function generateGenerationId(): string {
  return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getItemTypeLabel(itemType: string): string {
  const labels: Record<string, string> = {
    STAY: "hotel or accommodation",
    MEAL: "restaurant",
    ACTIVITY: "activity or attraction",
    TRANSPORT: "transportation",
  };
  return labels[itemType] || "activity";
}

function getProviderByType(itemType: string): string {
  const providers: Record<string, string> = {
    STAY: "Booking.com",
    MEAL: "OpenTable",
    ACTIVITY: "GetYourGuide",
    TRANSPORT: "Rome2Rio",
  };
  return providers[itemType] || "TripAdvisor";
}

function generateBookingUrl(itemType: string, title: string, destination: string): string {
  const encodedQuery = encodeURIComponent(`${title} ${destination}`);
  const urls: Record<string, string> = {
    STAY: `https://www.booking.com/searchresults.html?ss=${encodedQuery}`,
    MEAL: `https://www.opentable.com/s?term=${encodedQuery}`,
    ACTIVITY: `https://www.getyourguide.com/s/?q=${encodedQuery}`,
    TRANSPORT: `https://www.rome2rio.com/s/${encodeURIComponent(destination)}`,
  };
  return urls[itemType] || `https://www.tripadvisor.com/Search?q=${encodedQuery}`;
}

function getPlaceholderImage(itemType: string, index: number): string {
  const imageIds: Record<string, number[]> = {
    STAY: [164, 1048, 1076],
    MEAL: [292, 312, 429],
    ACTIVITY: [433, 685, 871],
    TRANSPORT: [195, 416, 519],
  };
  const ids = imageIds[itemType] || imageIds.ACTIVITY;
  const imageId = ids[index % ids.length];
  return `https://picsum.photos/id/${imageId}/400/300`;
}

export async function searchBookingOptions(
  tripItem: TripItem,
  destination: string,
  tripDates: { startDate: string; endDate: string }
): Promise<BookingSearchResult[]> {
  // First, try to get real places from Google Places API
  try {
    const googlePlacesResults = await searchPlacesForTripItem(
      tripItem.title,
      tripItem.description,
      tripItem.itemType,
      destination
    );
    
    if (googlePlacesResults.length > 0) {
      console.log(`Found ${googlePlacesResults.length} real places from Google Places API`);
      return googlePlacesResults;
    }
  } catch (error) {
    console.error("Error searching Google Places:", error);
  }

  // Fall back to AI-generated options if Google Places returns no results
  console.log("Falling back to AI-generated options");
  const itemTypeLabel = getItemTypeLabel(tripItem.itemType);
  const provider = getProviderByType(tripItem.itemType);

  const prompt = `You are a travel booking assistant. Generate 3 realistic ${itemTypeLabel} options for the following trip activity:

Activity: ${tripItem.title}
Description: ${tripItem.description || "No description provided"}
Type: ${tripItem.itemType}
Destination: ${destination}
Trip Dates: ${tripDates.startDate} to ${tripDates.endDate}
Day/Time: Day ${tripItem.dayNumber}, ${tripItem.time}

For each option, provide realistic details that might be found on booking sites like ${provider}. 
Include variety in price points (budget, mid-range, premium).

Respond in JSON format with an array of exactly 3 options, each with:
{
  "title": "Name of the place/service",
  "description": "Brief 2-3 sentence description",
  "priceEstimate": "Price range like '$50-80' or '$150/night' or 'Free'",
  "rating": "Rating like '4.5' out of 5",
  "reviewCount": number of reviews (realistic number),
  "address": "Full address in the destination city",
  "imageSearch": "Short search term for finding an image of this place"
}

Make the options realistic and varied. Include real-sounding business names that would exist in ${destination}.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful travel booking assistant that provides realistic booking options. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    const options = parsed.options || parsed.results || parsed;
    
    if (!Array.isArray(options)) {
      throw new Error("Invalid response format");
    }

    return options.slice(0, 3).map((opt: any, index: number) => ({
      title: opt.title || "Unknown",
      description: opt.description || "",
      priceEstimate: opt.priceEstimate || opt.price || "Price varies",
      rating: opt.rating || "4.0",
      reviewCount: opt.reviewCount || Math.floor(Math.random() * 500) + 50,
      image: getPlaceholderImage(tripItem.itemType, index),
      bookingUrl: generateBookingUrl(tripItem.itemType, opt.title, destination),
      address: opt.address || destination,
      provider: provider,
    }));
  } catch (error) {
    console.error("Error searching booking options:", error);
    return generateFallbackOptions(tripItem, destination);
  }
}

function generateFallbackOptions(tripItem: TripItem, destination: string): BookingSearchResult[] {
  const provider = getProviderByType(tripItem.itemType);
  const baseTitle = tripItem.title;
  
  const options = [
    { suffix: "- Budget Option", price: "$30-50", rating: "4.2" },
    { suffix: "- Popular Choice", price: "$75-120", rating: "4.6" },
    { suffix: "- Premium Experience", price: "$150-200", rating: "4.8" },
  ];

  return options.map((opt, index) => ({
    title: `${baseTitle} ${opt.suffix}`,
    description: `A ${index === 0 ? "budget-friendly" : index === 1 ? "popular" : "premium"} option for ${tripItem.title.toLowerCase()} in ${destination}.`,
    priceEstimate: opt.price,
    rating: opt.rating,
    reviewCount: Math.floor(Math.random() * 800) + 100,
    image: getPlaceholderImage(tripItem.itemType, index),
    bookingUrl: generateBookingUrl(tripItem.itemType, baseTitle, destination),
    address: destination,
    provider: provider,
  }));
}

export async function generateAndSaveOptions(
  tripItem: TripItem,
  destination: string,
  tripDates: { startDate: string; endDate: string }
): Promise<{ generationId: string; options: any[] }> {
  const generationId = generateGenerationId();
  
  await storage.deleteTripItemOptions(tripItem.id);
  
  const searchResults = await searchBookingOptions(tripItem, destination, tripDates);
  
  const optionsToInsert: InsertTripItemOption[] = searchResults.map((result) => ({
    tripItemId: tripItem.id,
    generationId,
    provider: result.provider,
    title: result.title,
    description: result.description,
    priceEstimate: result.priceEstimate,
    rating: result.rating,
    reviewCount: result.reviewCount,
    image: result.image,
    bookingUrl: result.bookingUrl,
    address: result.address,
    isLocked: false,
  }));

  const savedOptions = await storage.createTripItemOptions(optionsToInsert);
  
  return {
    generationId,
    options: savedOptions,
  };
}
