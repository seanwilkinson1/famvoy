import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronLeft, ChevronRight, Plane, Utensils, Ticket, MessageSquare, Calendar, 
  Check, Loader2, ExternalLink, AlertCircle, Sparkles, MapPin, Clock, Users,
  Send, CalendarPlus, SkipForward, ThumbsUp, ThumbsDown, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface TripItem {
  id: number;
  tripId: number;
  dayNumber: number;
  dayTitle: string | null;
  time: string;
  title: string;
  description: string | null;
  itemType: string;
  sortOrder: number;
  lockedOption?: {
    id: number;
    title: string;
    bookingUrl: string | null;
    address: string | null;
  } | null;
}

interface Trip {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  items: TripItem[];
}

interface ConciergeSession {
  id: number;
  tripId: number;
  currentStep: string;
  flightsSkipped: boolean;
  flightPreferences: any;
  selectedRestaurantIds: number[];
  selectedExcursionIds: number[];
  aiChatComplete: boolean;
  calendarExported: boolean;
}

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

interface AiSuggestion {
  id: number;
  sessionId: number;
  suggestionType: string;
  title: string;
  description: string | null;
  userApproved: boolean | null;
  agentReviewed: boolean;
  createdAt: string;
}

const SUGGESTION_ICONS: Record<string, React.ReactNode> = {
  ACTIVITY: "🎯",
  DINING: "🍽️",
  TRANSPORTATION: "🚗",
  SPECIAL_OCCASION: "🎉",
  ACCOMMODATION: "🏨",
  TIP: "💡",
};

const STEPS = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "restaurants", label: "Restaurants", icon: Utensils },
  { id: "excursions", label: "Excursions", icon: Ticket },
  { id: "ai_chat", label: "AI Concierge", icon: MessageSquare },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

export default function ConciergeBookingWizard() {
  const [match, params] = useRoute("/trip/:id/concierge");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedRestaurants, setSelectedRestaurants] = useState<number[]>([]);
  const [selectedExcursions, setSelectedExcursions] = useState<number[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const tripId = params?.id ? parseInt(params.id) : 0;
  const currentStep = STEPS[currentStepIndex];

  const { data: trip, isLoading: loadingTrip } = useQuery<Trip>({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!match && tripId > 0,
  });

  const { data: session, isLoading: loadingSession } = useQuery<ConciergeSession>({
    queryKey: [`/api/concierge/session/${tripId}`],
    enabled: !!match && tripId > 0,
  });

  const { data: categorizedItems } = useQuery<{
    restaurants: TripItem[];
    excursions: TripItem[];
    flights: { origin: string; destination: string; date: string }[];
  }>({
    queryKey: [`/api/concierge/categorize/${tripId}`],
    enabled: !!trip,
  });

  const { data: chatHistory } = useQuery<{ messages: ChatMessage[]; suggestions: AiSuggestion[] }>({
    queryKey: [`/api/concierge/chat-history/${tripId}`],
    enabled: tripId > 0 && currentStep?.id === 'ai_chat',
    staleTime: 30000,
  });

  // Only load chat history on initial render when we have no local messages
  useEffect(() => {
    if (chatHistory?.messages && chatHistory.messages.length > 0 && chatMessages.length === 0 && !isLoadingChat) {
      setChatMessages(chatHistory.messages);
    }
    if (chatHistory?.suggestions && chatHistory.suggestions.length > 0 && suggestions.length === 0) {
      setSuggestions(chatHistory.suggestions);
    }
  }, [chatHistory, chatMessages.length, suggestions.length, isLoadingChat]);

  const createSessionMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/concierge/session`, { tripId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/concierge/session/${tripId}`] });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: (data: Partial<ConciergeSession>) => 
      apiRequest("PATCH", `/api/concierge/session/${tripId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/concierge/session/${tripId}`] });
    },
  });

  const sendChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", `/api/concierge/chat/${tripId}`, { message });
      return await response.json() as { messages: ChatMessage[]; suggestions: AiSuggestion[] };
    },
    onSuccess: (response) => {
      setChatMessages(response.messages);
      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }
      setIsLoadingChat(false);
    },
    onError: () => {
      setIsLoadingChat(false);
      toast.error("Failed to send message");
    },
  });

  const approveSuggestionMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: number; approved: boolean }) => {
      const response = await apiRequest("PATCH", `/api/concierge/suggestions/${id}`, { userApproved: approved });
      return await response.json() as AiSuggestion;
    },
    onSuccess: (updatedSuggestion) => {
      setSuggestions(prev => prev.map(s => s.id === updatedSuggestion.id ? updatedSuggestion : s));
      toast.success(updatedSuggestion.userApproved ? "Added to your requests!" : "Suggestion dismissed");
    },
    onError: () => {
      toast.error("Failed to update suggestion");
    },
  });

  const exportCalendarMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/concierge/calendar/${tripId}`),
    onSuccess: (data: { url: string; filename?: string } | { message: string }) => {
      if ('url' in data && data.url) {
        // Create a proper download link for the ICS file
        const link = document.createElement('a');
        link.href = data.url;
        link.download = data.filename || 'trip_itinerary.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      updateSessionMutation.mutate({ calendarExported: true });
      toast.success("Calendar file downloaded!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to export calendar");
    },
  });

  useEffect(() => {
    if (trip && !session && !loadingSession) {
      createSessionMutation.mutate();
    }
  }, [trip, session, loadingSession]);

  useEffect(() => {
    if (session) {
      const stepIndex = STEPS.findIndex(s => s.id === session.currentStep);
      if (stepIndex >= 0) {
        setCurrentStepIndex(stepIndex);
      }
      if (session.selectedRestaurantIds) {
        setSelectedRestaurants(session.selectedRestaurantIds);
      }
      if (session.selectedExcursionIds) {
        setSelectedExcursions(session.selectedExcursionIds);
      }
    }
  }, [session]);

  if (!match) return null;

  if (loadingTrip || loadingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6">
        <p className="text-gray-500">Trip not found</p>
        <Button onClick={() => setLocation("/trips")} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  const restaurants = categorizedItems?.restaurants || 
    trip.items.filter(item => item.itemType === "MEAL" || item.itemType === "RESTAURANT");
  const excursions = categorizedItems?.excursions || 
    trip.items.filter(item => item.itemType === "ACTIVITY" || item.itemType === "EXCURSION");

  const handleNextStep = () => {
    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) {
      updateSessionMutation.mutate({ 
        currentStep: nextStep.id,
        selectedRestaurantIds: selectedRestaurants,
        selectedExcursionIds: selectedExcursions,
      });
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevStep = STEPS[currentStepIndex - 1];
      updateSessionMutation.mutate({ currentStep: prevStep.id });
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkipFlights = () => {
    updateSessionMutation.mutate({ flightsSkipped: true, currentStep: "restaurants" });
    setCurrentStepIndex(1);
  };

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    setIsLoadingChat(true);
    setChatMessages(prev => [...prev, { id: Date.now(), role: "user", content: chatMessage, createdAt: new Date().toISOString() }]);
    sendChatMutation.mutate(chatMessage);
    setChatMessage("");
  };

  const handleComplete = () => {
    updateSessionMutation.mutate({ currentStep: "complete" });
    toast.success("Concierge booking complete! We'll be in touch soon.");
    setLocation(`/trip/${tripId}`);
  };

  const buildSkyscannerUrl = () => {
    const origin = "NYC";
    const destination = trip.destination.split(",")[0].trim().substring(0, 3).toUpperCase();
    const departDate = format(new Date(trip.startDate), "yyMMdd");
    const returnDate = format(new Date(trip.endDate), "yyMMdd");
    return `https://www.skyscanner.com/transport/flights/${origin}/${destination}/${departDate}/${returnDate}/`;
  };

  const renderFlightsStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
          <Plane className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Would you like help with flights?</h2>
        <p className="text-muted-foreground">
          We can help you search for the best flights to {trip.destination}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">Your Trip</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{trip.destination}</p>
            </div>
          </div>

          <a
            href={buildSkyscannerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            data-testid="button-skyscanner"
          >
            <ExternalLink className="h-5 w-5" />
            Search Flights on Skyscanner
          </a>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={handleSkipFlights}
          className="flex-1"
          data-testid="button-skip-flights"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip This Step
        </Button>
        <Button 
          onClick={handleNextStep}
          className="flex-1"
          data-testid="button-flights-next"
        >
          Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderRestaurantsStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
          <Utensils className="h-8 w-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold">Restaurant Reservations</h2>
        <p className="text-muted-foreground">
          Select which restaurants you'd like us to make reservations for
        </p>
      </div>

      <div className="space-y-3">
        {restaurants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Utensils className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No restaurants in your itinerary</p>
          </div>
        ) : (
          restaurants.map((restaurant) => {
            const isSelected = selectedRestaurants.includes(restaurant.id);
            const hasOpenTable = restaurant.lockedOption?.bookingUrl?.includes("opentable");
            
            return (
              <Card 
                key={restaurant.id}
                className={cn(
                  "cursor-pointer transition-all",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => {
                  setSelectedRestaurants(prev => 
                    prev.includes(restaurant.id) 
                      ? prev.filter(id => id !== restaurant.id)
                      : [...prev, restaurant.id]
                  );
                }}
                data-testid={`card-restaurant-${restaurant.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={isSelected}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{restaurant.lockedOption?.title || restaurant.title}</p>
                        {hasOpenTable ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            OpenTable
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Manual
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>Day {restaurant.dayNumber} at {restaurant.time}</span>
                      </div>
                      {restaurant.lockedOption?.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{restaurant.lockedOption.address}</span>
                        </div>
                      )}
                      {!hasOpenTable && isSelected && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          This reservation will be made manually by our team
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handlePrevStep} data-testid="button-restaurants-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNextStep} className="flex-1" data-testid="button-restaurants-next">
          Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderExcursionsStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
          <Ticket className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold">Book Excursions</h2>
        <p className="text-muted-foreground">
          Select which excursions you'd like us to book for you
        </p>
      </div>

      <div className="space-y-3">
        {excursions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No excursions in your itinerary</p>
          </div>
        ) : (
          excursions.map((excursion) => {
            const isSelected = selectedExcursions.includes(excursion.id);
            
            return (
              <Card 
                key={excursion.id}
                className={cn(
                  "cursor-pointer transition-all",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    setSelectedExcursions(prev => 
                      prev.includes(excursion.id) 
                        ? prev.filter(id => id !== excursion.id)
                        : [...prev, excursion.id]
                    );
                  }}
                  data-testid={`card-excursion-${excursion.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={isSelected}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{excursion.lockedOption?.title || excursion.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>Day {excursion.dayNumber} at {excursion.time}</span>
                        </div>
                        {excursion.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {excursion.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handlePrevStep} data-testid="button-excursions-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNextStep} className="flex-1" data-testid="button-excursions-next">
          Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderAiChatStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-primary to-teal-600 rounded-full flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">How can we make your trip better?</h2>
        <p className="text-muted-foreground">
          Chat with our AI concierge for personalized suggestions
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {(!chatMessages || chatMessages.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Start a conversation to get personalized suggestions</p>
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium">Tell us about your trip:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { emoji: "🍽️", text: "Dietary needs", prompt: "We have dietary restrictions. Can you help us find suitable restaurants? We need..." },
                      { emoji: "🎉", text: "Celebrating", prompt: "We're celebrating a special occasion! It's a..." },
                      { emoji: "♿", text: "Accessibility", prompt: "We have accessibility requirements. Can you help us find suitable options? We need..." },
                      { emoji: "👶", text: "With kids", prompt: "We're traveling with young kids. What are the best family-friendly activities?" },
                    ].map(item => (
                      <Button
                        key={item.text}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setChatMessage(item.prompt)}
                        data-testid={`button-quick-${item.text.replace(/\s+/g, '-')}`}
                      >
                        <span>{item.emoji}</span> {item.text}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {["Best local restaurants", "Hidden gems", "Day trip ideas", "Must-see attractions"].map(suggestion => (
                      <Button
                        key={suggestion}
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setChatMessage(suggestion)}
                        data-testid={`button-suggestion-${suggestion.replace(/\s+/g, '-')}`}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {(chatMessages || []).map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "p-4 rounded-2xl max-w-[80%]",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground ml-auto" 
                    : "bg-muted"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI Concierge</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {isLoadingChat && (
              <div className="p-4 rounded-2xl bg-muted max-w-[80%]">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {/* Suggestion Cards */}
            {suggestions.filter(s => s.userApproved === null).length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Would you like us to arrange any of these?</p>
                {suggestions.filter(s => s.userApproved === null).map((suggestion) => (
                  <Card key={suggestion.id} className="border-primary/20 bg-primary/5">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{SUGGESTION_ICONS[suggestion.suggestionType] || "💡"}</span>
                          <div>
                            <p className="font-medium text-sm">{suggestion.title}</p>
                            {suggestion.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>
                            )}
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {suggestion.suggestionType.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                            onClick={() => approveSuggestionMutation.mutate({ id: suggestion.id, approved: true })}
                            data-testid={`button-approve-${suggestion.id}`}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                            onClick={() => approveSuggestionMutation.mutate({ id: suggestion.id, approved: false })}
                            data-testid={`button-reject-${suggestion.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Approved suggestions summary */}
            {suggestions.filter(s => s.userApproved === true).length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-2">
                  <Check className="h-4 w-4 inline mr-1" />
                  Your requests ({suggestions.filter(s => s.userApproved === true).length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.filter(s => s.userApproved === true).map(s => (
                    <Badge key={s.id} className="bg-green-100 text-green-700 hover:bg-green-200">
                      {SUGGESTION_ICONS[s.suggestionType]} {s.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask about your trip..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              className="resize-none"
              rows={2}
              data-testid="input-chat-message"
            />
            <Button 
              type="button"
              onClick={handleSendChat} 
              disabled={!chatMessage.trim() || isLoadingChat}
              data-testid="button-send-chat"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handlePrevStep} data-testid="button-chat-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNextStep} className="flex-1" data-testid="button-chat-next">
          Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderCalendarStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <Calendar className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Add to Your Calendar</h2>
        <p className="text-muted-foreground">
          Export your complete itinerary to your personal calendar
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Trip</span>
              <span>{trip.name}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Dates</span>
              <span>{format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Total Activities</span>
              <span>{trip.items.length} items</span>
            </div>
          </div>

          <Button 
            onClick={() => exportCalendarMutation.mutate()}
            disabled={exportCalendarMutation.isPending || session?.calendarExported}
            className="w-full"
            data-testid="button-export-calendar"
          >
            {exportCalendarMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : session?.calendarExported ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <CalendarPlus className="h-4 w-4 mr-2" />
            )}
            {session?.calendarExported ? "Calendar Exported" : "Export to Calendar"}
          </Button>

          {session?.calendarExported && (
            <p className="text-sm text-center text-green-600">
              <Check className="h-4 w-4 inline mr-1" />
              Your itinerary has been exported to your calendar
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-100 rounded-xl">
          <h3 className="font-bold mb-2">What happens next?</h3>
          <ul className="space-y-2 text-sm">
            {selectedRestaurants.length > 0 && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                We'll make reservations for {selectedRestaurants.length} restaurant(s)
              </li>
            )}
            {selectedExcursions.length > 0 && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                We'll book {selectedExcursions.length} excursion(s) for you
              </li>
            )}
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Our concierge team will review your preferences
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              You'll receive confirmation emails for all bookings
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrevStep} data-testid="button-calendar-back">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={() => setShowConfirmDialog(true)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            data-testid="button-complete-wizard"
          >
            <Check className="h-4 w-4 mr-2" />
            Complete Concierge Booking
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep.id) {
      case "flights":
        return renderFlightsStep();
      case "restaurants":
        return renderRestaurantsStep();
      case "excursions":
        return renderExcursionsStep();
      case "ai_chat":
        return renderAiChatStep();
      case "calendar":
        return renderCalendarStep();
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="sticky top-0 border-b border-gray-100 bg-white px-6 pt-14 md:pt-6 pb-4 shadow-sm z-20">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => setLocation(`/trip/${tripId}`)} 
            className="rounded-full bg-gray-100 p-2 active:scale-90"
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <div>
            <h1 className="font-heading text-xl font-bold text-charcoal">Concierge Booking</h1>
            <p className="text-sm text-muted-foreground">{trip.name}</p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-1">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;
            const canNavigate = isComplete || index === currentStepIndex;
            
            return (
              <div 
                key={step.id}
                className="flex-1 flex flex-col items-center"
              >
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div 
                      className={cn(
                        "flex-1 h-0.5",
                        index <= currentStepIndex ? "bg-green-500" : "bg-muted"
                      )}
                    />
                  )}
                  <button
                    onClick={() => {
                      if (canNavigate) {
                        const targetStep = STEPS[index];
                        updateSessionMutation.mutate({ currentStep: targetStep.id });
                        setCurrentStepIndex(index);
                      }
                    }}
                    disabled={!canNavigate}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                      isActive && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                      isComplete && "bg-green-500 text-white hover:bg-green-600",
                      !isActive && !isComplete && "bg-muted text-muted-foreground",
                      canNavigate && "cursor-pointer"
                    )}
                    data-testid={`button-step-${step.id}`}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </button>
                  {index < STEPS.length - 1 && (
                    <div 
                      className={cn(
                        "flex-1 h-0.5",
                        isComplete ? "bg-green-500" : "bg-muted"
                      )}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium mt-1.5 text-center whitespace-nowrap",
                  isActive && "text-primary",
                  isComplete && "text-green-600",
                  !isActive && !isComplete && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          {renderCurrentStep()}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Booking Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Your booking request will be sent to our concierge team for review. They will begin making reservations and bookings on your behalf.
              {selectedRestaurants.length > 0 && (
                <span className="block mt-2">• {selectedRestaurants.length} restaurant reservation(s)</span>
              )}
              {selectedExcursions.length > 0 && (
                <span className="block">• {selectedExcursions.length} excursion booking(s)</span>
              )}
              <span className="block mt-2 font-medium">You can still edit your booking after submission.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleComplete}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              Submit Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
