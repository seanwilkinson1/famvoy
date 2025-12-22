import { useRoute, useLocation } from "wouter";
import { ChevronLeft, MapPin, Calendar, Sparkles, Loader2, RefreshCw, Plus, Trash2, Edit2, X, Clock, Utensils, BedDouble, Car, Ticket, Check, ShoppingCart, CreditCard, DollarSign, ExternalLink, Star, Share2, GripVertical, Settings2, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { BookingModal } from "@/components/shared/BookingModal";
import { useAuth } from "@clerk/clerk-react";
import { apiRequest } from "@/lib/queryClient";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PACE_OPTIONS = [
  { value: "relaxed", label: "Relaxed", description: "Fewer activities, more downtime" },
  { value: "moderate", label: "Moderate", description: "Balanced mix" },
  { value: "active", label: "Active", description: "Action-packed" },
];

const KIDS_AGE_GROUPS = ["Infant (0-1)", "Toddler (1-3)", "Preschool (3-5)", "Elementary (5-10)", "Tween (10-13)", "Teen (13-18)"];

const TRIP_INTERESTS = ["Beach & Water", "Adventure & Outdoors", "Cultural & History", "Theme Parks", "Nature & Wildlife", "Food & Dining", "Relaxation & Spa", "Shopping", "Sports", "Arts & Crafts"];

const ITEM_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ACTIVITY: { icon: Ticket, color: "text-primary", bg: "bg-primary/10" },
  MEAL: { icon: Utensils, color: "text-orange-500", bg: "bg-orange-50" },
  STAY: { icon: BedDouble, color: "text-blue-500", bg: "bg-blue-50" },
  TRANSPORT: { icon: Car, color: "text-gray-500", bg: "bg-gray-100" },
};

interface LockedBookingOption {
  id: number;
  title: string;
  description: string | null;
  priceEstimate: string | null;
  rating: string | null;
  reviewCount: number | null;
  image: string | null;
  bookingUrl: string | null;
  address: string | null;
  provider: string | null;
}

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
  experienceId: number | null;
  lockedOption?: LockedBookingOption | null;
}

interface CostSummary {
  total: number;
  serviceFee: number;
  grandTotal: number;
  formatted: string;
  serviceFeeFormatted: string;
  grandTotalFormatted: string;
}

interface TripDestination {
  id: number;
  tripId: number;
  destination: string;
  startDate: string;
  endDate: string;
  sortOrder: number;
}

interface Trip {
  id: number;
  podId: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  aiSummary: string | null;
  status: string;
  createdByUserId: number;
  createdAt: string;
  items: TripItem[];
  costSummary?: CostSummary;
}

interface DraggableItemWrapperProps {
  id: number;
  disabled: boolean;
  children: React.ReactNode;
}

function DraggableItemWrapper({ id, disabled, children }: DraggableItemWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-50 shadow-xl")}>
      <div className="relative group">
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-1 top-3 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white rounded-full p-1 shadow-sm"
          data-testid={`drag-handle-${id}`}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
        {children}
      </div>
    </div>
  );
}

export default function TripDetails() {
  const [match, params] = useRoute("/trip/:id");
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showExperiencePicker, setShowExperiencePicker] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [addItemDayNumber, setAddItemDayNumber] = useState(1);
  const [editingItem, setEditingItem] = useState<TripItem | null>(null);
  const [itemForm, setItemForm] = useState({
    time: "09:00 AM",
    title: "",
    description: "",
    itemType: "ACTIVITY",
    experienceId: null as number | null,
  });
  const [preferences, setPreferences] = useState({
    budgetMin: undefined as number | undefined,
    budgetMax: undefined as number | undefined,
    pace: "moderate" as string,
    kidsAgeGroups: [] as string[],
    tripInterests: [] as string[],
  });
  const [bookingItem, setBookingItem] = useState<TripItem | null>(null);
  const [newDestination, setNewDestination] = useState({ destination: "", startDate: "", endDate: "" });
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const { isSignedIn } = useAuth();
  
  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.cart.get(),
    enabled: !!isSignedIn,
  });
  
  const cartItemCount = cart?.items?.length || 0;
  const tripId = params?.id ? parseInt(params.id) : 0;

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: ["trip", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!match && tripId > 0,
  });

  interface ConciergeRequestData {
    id: number;
    status: string;
    totalEstimatedCents: number;
    serviceFeeCents: number;
    totalPaidCents: number;
    customerNotes: string | null;
    items?: { id: number; status: string; confirmationCode: string | null; providerName: string | null }[];
  }

  const { data: conciergeRequest } = useQuery<ConciergeRequestData | null>({
    queryKey: [`/api/trips/${tripId}/concierge`],
    queryFn: () => apiRequest("GET", `/api/trips/${tripId}/concierge`),
    enabled: !!trip && (trip.status === "confirmed" || trip.status === "booking_in_progress" || trip.status === "booked"),
  });

  const conciergeCheckoutMutation = useMutation({
    mutationFn: (data: { tripId: number; customerNotes?: string }) => 
      apiRequest("POST", "/api/concierge/checkout", data),
    onSuccess: (data: { url: string }) => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/concierge`] });
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start checkout");
    },
  });

  const { data: podExperiences = [] } = useQuery({
    queryKey: ["podExperiences", trip?.podId],
    queryFn: () => trip?.podId ? api.pods.getExperiences(trip.podId) : [],
    enabled: !!trip?.podId,
  });

  const { data: destinations = [] } = useQuery<TripDestination[]>({
    queryKey: ["tripDestinations", tripId],
    queryFn: () => api.trips.getDestinations(tripId),
    enabled: !!match && tripId > 0,
  });

  const addDestinationMutation = useMutation({
    mutationFn: (data: { destination: string; startDate: string; endDate: string; sortOrder?: number }) =>
      api.trips.addDestination(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripDestinations", tripId] });
      setNewDestination({ destination: "", startDate: "", endDate: "" });
      toast.success("Destination added!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteDestinationMutation = useMutation({
    mutationFn: (destId: number) => api.trips.deleteDestination(tripId, destId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripDestinations", tripId] });
      toast.success("Destination removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const generateMutation = useMutation({
    mutationFn: (prefs?: typeof preferences) => api.trips.generate(tripId, prefs),
    onMutate: () => {
      setIsGenerating(true);
      setShowPreferencesModal(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast.success("Itinerary generated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: number; dayNumber: number; sortOrder: number }[]) => 
      api.trips.reorderItems(tripId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to reorder items");
    },
  });

  const regenerateDayMutation = useMutation({
    mutationFn: (dayNumber: number) => api.trips.regenerateDay(tripId, dayNumber),
    onMutate: (dayNumber) => {
      setRegeneratingDay(dayNumber);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast.success("Day regenerated with fresh ideas!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setRegeneratingDay(null);
    },
  });

  const resetItemForm = () => {
    setItemForm({ time: "09:00 AM", title: "", description: "", itemType: "ACTIVITY", experienceId: null });
  };

  const handleDragEnd = (event: DragEndEvent, dayNumber: number, dayItems: TripItem[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = dayItems.findIndex(item => item.id === active.id);
    const newIndex = dayItems.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(dayItems, oldIndex, newIndex);
      const reorderData = newItems.map((item, index) => ({
        id: item.id,
        dayNumber,
        sortOrder: index,
      }));
      reorderMutation.mutate(reorderData);
    }
  };

  const addItemMutation = useMutation({
    mutationFn: (data: any) => api.trips.addItem(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      setShowAddItemModal(false);
      setShowExperiencePicker(false);
      resetItemForm();
      toast.success("Activity added!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) => 
      api.trips.updateItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      setEditingItem(null);
      resetItemForm();
      toast.success("Activity updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => api.trips.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast.success("Activity removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!match) return null;

  if (isLoading) {
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
        <button
          onClick={() => setLocation("/pods")}
          className="mt-4 text-primary font-bold"
        >
          Go back
        </button>
      </div>
    );
  }

  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const itemsByDay: Record<number, TripItem[]> = {};
  const dayTitles: Record<number, string> = {};
  
  for (let i = 1; i <= numDays; i++) {
    itemsByDay[i] = [];
  }
  
  (trip.items || []).forEach((item) => {
    if (!itemsByDay[item.dayNumber]) {
      itemsByDay[item.dayNumber] = [];
    }
    itemsByDay[item.dayNumber].push(item);
    if (item.dayTitle) {
      dayTitles[item.dayNumber] = item.dayTitle;
    }
  });

  Object.keys(itemsByDay).forEach((day) => {
    itemsByDay[parseInt(day)].sort((a, b) => a.sortOrder - b.sortOrder);
  });

  const handleAddItem = () => {
    const dayItems = itemsByDay[addItemDayNumber] || [];
    addItemMutation.mutate({
      dayNumber: addItemDayNumber,
      time: itemForm.time,
      title: itemForm.title,
      description: itemForm.description,
      itemType: itemForm.itemType,
      sortOrder: dayItems.length,
      dayTitle: dayTitles[addItemDayNumber] || `Day ${addItemDayNumber}`,
      experienceId: itemForm.experienceId,
    });
  };

  const handleAddFromExperience = (exp: any) => {
    const dayItems = itemsByDay[addItemDayNumber] || [];
    addItemMutation.mutate({
      dayNumber: addItemDayNumber,
      time: "10:00 AM",
      title: exp.title,
      description: exp.description,
      itemType: "ACTIVITY",
      sortOrder: dayItems.length,
      dayTitle: dayTitles[addItemDayNumber] || `Day ${addItemDayNumber}`,
      experienceId: exp.id,
    });
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateItemMutation.mutate({
      itemId: editingItem.id,
      data: {
        time: itemForm.time,
        title: itemForm.title,
        description: itemForm.description,
        itemType: itemForm.itemType,
      },
    });
  };

  const openEditModal = (item: TripItem) => {
    setEditingItem(item);
    setItemForm({
      time: item.time,
      title: item.title,
      description: item.description || "",
      itemType: item.itemType,
      experienceId: item.experienceId,
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background md:pb-0">
      <div className="border-b border-gray-100 bg-white px-6 pt-14 md:pt-6 pb-4 shadow-sm z-10 md:max-w-5xl md:mx-auto md:w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLocation(`/pod/${trip.podId}`)} 
              className="rounded-full bg-gray-100 p-2 active:scale-90"
              data-testid="button-back"
            >
              <ChevronLeft className="h-6 w-6 text-gray-700" />
            </button>
            <button
              onClick={() => setLocation("/cart")}
              className="relative rounded-full bg-gray-100 p-2 active:scale-90"
              data-testid="button-cart"
            >
              <ShoppingCart className="h-5 w-5 text-gray-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => setShowPreferencesModal(true)}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all",
              trip.items.length > 0
                ? "bg-purple-50 text-purple-600"
                : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            )}
            data-testid="button-generate-ai"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {trip.items.length > 0 ? "Regenerate" : "Generate with AI"}
              </>
            )}
          </button>
        </div>

        <h1 className="font-heading text-2xl font-bold text-charcoal">{trip.name}</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <MapPin className="h-4 w-4" />
          <span>{trip.destination}</span>
          <span className="text-gray-300">•</span>
          <Calendar className="h-4 w-4" />
          <span>
            {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {trip.aiSummary && (
          <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-bold text-purple-700">AI Summary</span>
            </div>
            <p className="text-sm text-purple-900/80 leading-relaxed">{trip.aiSummary}</p>
          </div>
        )}

        {trip.items.length > 0 && trip.status === "draft" && (
          <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-primary to-primary/80 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="font-bold text-lg">Ready to book?</h3>
                <p className="text-sm opacity-90">Convert your draft into a confirmed trip with real bookings</p>
              </div>
              <button
                onClick={() => setLocation(`/trip/${tripId}/confirm`)}
                className="shrink-0 bg-white text-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
                data-testid="button-start-confirming"
              >
                <Check className="h-4 w-4" />
                Confirm Trip
              </button>
            </div>
          </div>
        )}

        {trip.status === "confirming" && (
          <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="font-bold text-lg">Confirmation in progress</h3>
                <p className="text-sm opacity-90">Continue choosing your booking options</p>
              </div>
              <button
                onClick={() => setLocation(`/trip/${tripId}/confirm`)}
                className="shrink-0 bg-white text-orange-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
                data-testid="button-continue-confirming"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {(trip.status === "confirmed" || trip.status === "booking_in_progress" || trip.status === "booked") && (
          <>
            {trip.status === "booked" ? (
              <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">All Booked!</h3>
                    <p className="text-sm opacity-90">Your trip is fully booked and ready</p>
                  </div>
                </div>
              </div>
            ) : trip.status === "booking_in_progress" ? (
              <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Booking In Progress</h3>
                    <p className="text-sm opacity-90">Your concierge is booking your trip</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Check className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Trip Confirmed!</h3>
                      <p className="text-sm opacity-90">Ready to book with concierge</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: trip.name,
                            text: `Check out my trip to ${trip.destination}!`,
                            url: window.location.href,
                          });
                        } else {
                          await navigator.clipboard.writeText(window.location.href);
                          toast.success("Link copied to clipboard!");
                        }
                      } catch (err) {
                        if ((err as Error).name !== 'AbortError') {
                          try {
                            await navigator.clipboard.writeText(window.location.href);
                            toast.success("Link copied to clipboard!");
                          } catch {
                            toast.error("Failed to share");
                          }
                        }
                      }
                    }}
                    className="shrink-0 bg-white/20 text-white p-2.5 rounded-xl hover:bg-white/30 transition-colors"
                    data-testid="button-share-trip"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {!conciergeRequest && trip.status === "confirmed" && (
              <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-5 w-5" />
                      <h3 className="font-bold text-lg">Book with Concierge</h3>
                    </div>
                    <p className="text-sm opacity-90">Let our travel agent book everything for you</p>
                    <p className="text-xs opacity-75 mt-1">15% service fee • Personal support</p>
                  </div>
                  <button
                    onClick={() => conciergeCheckoutMutation.mutate({ tripId })}
                    disabled={conciergeCheckoutMutation.isPending}
                    className="shrink-0 bg-white text-purple-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    data-testid="button-book-concierge"
                  >
                    {conciergeCheckoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Book Now
                  </button>
                </div>
              </div>
            )}

            {conciergeRequest && (
              <div className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <h4 className="font-bold text-charcoal">Concierge Booking</h4>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    conciergeRequest.status === 'completed' || conciergeRequest.status === 'booked' ? "bg-green-100 text-green-700" :
                    conciergeRequest.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                    "bg-yellow-100 text-yellow-700"
                  )}>
                    {conciergeRequest.status === 'completed' || conciergeRequest.status === 'booked' ? 'Completed' :
                     conciergeRequest.status === 'in_progress' ? 'In Progress' : 'Pending'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estimated Total</span>
                    <span className="font-medium">${(conciergeRequest.totalEstimatedCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service Fee</span>
                    <span className="font-medium">${(conciergeRequest.serviceFeeCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Paid</span>
                    <span className="font-bold text-primary">${(conciergeRequest.totalPaidCents / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {trip.costSummary && !conciergeRequest && (
              <div className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-600" />
                    <h4 className="font-bold text-charcoal">Concierge Booking</h4>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    Pending
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estimated Total</span>
                    <span className="font-medium">{trip.costSummary.formatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service Fee (15%)</span>
                    <span className="font-medium">{trip.costSummary.serviceFeeFormatted}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Paid</span>
                    <span className="font-bold text-primary">{trip.costSummary.grandTotalFormatted}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Based on your selected booking options. Actual prices may vary.
                </p>
              </div>
            )}

            <div className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-charcoal">{trip.destination}</h4>
                  <p className="text-sm text-gray-500">
                    {trip.items.length} activities across {numDays} days
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {trip.items.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6">
            <Sparkles className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-center mb-1 font-medium">No itinerary yet</p>
            <p className="text-sm text-center text-gray-400 mb-4">
              Let AI create a personalized {numDays}-day plan based on your pod's interests
            </p>
            <button
              onClick={() => setShowPreferencesModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-bold text-white"
              data-testid="button-generate-empty"
            >
              <Sparkles className="h-4 w-4" />
              Generate Itinerary
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-64 p-6">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-purple-500 animate-pulse" />
              <div className="absolute inset-0 h-16 w-16 rounded-full bg-purple-500/20 animate-ping" />
            </div>
            <p className="mt-4 font-heading font-bold text-charcoal">Creating your itinerary...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
          </div>
        )}

        {!isGenerating && trip.items.length > 0 && (
          <div className="p-4 space-y-6">
            {Array.from({ length: numDays }, (_, i) => i + 1).map((dayNumber) => {
              const dayItems = itemsByDay[dayNumber] || [];
              const dayDate = new Date(startDate);
              dayDate.setDate(dayDate.getDate() + dayNumber - 1);
              const dayTitle = dayTitles[dayNumber];
              const isRegenerating = regeneratingDay === dayNumber;

              return (
                <div key={dayNumber} className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold">
                          {dayNumber}
                        </span>
                        <div>
                          <h3 className="font-heading font-bold text-charcoal">
                            {dayTitle || `Day ${dayNumber}`}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {format(dayDate, "EEEE, MMM d")}
                          </p>
                        </div>
                      </div>
                    </div>
                    {trip.status !== "confirmed" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setAddItemDayNumber(dayNumber);
                            setShowAddItemModal(true);
                          }}
                          className="rounded-full bg-gray-100 p-2 hover:bg-gray-200"
                          data-testid={`button-add-item-day-${dayNumber}`}
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => regenerateDayMutation.mutate(dayNumber)}
                          disabled={isRegenerating}
                          className="rounded-full bg-purple-50 p-2 hover:bg-purple-100"
                          data-testid={`button-regenerate-day-${dayNumber}`}
                        >
                          {isRegenerating ? (
                            <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 text-purple-500" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, dayNumber, dayItems)}
                  >
                    <SortableContext items={dayItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                    {dayItems.map((item) => {
                      const config = ITEM_TYPE_CONFIG[item.itemType] || ITEM_TYPE_CONFIG.ACTIVITY;
                      const Icon = config.icon;
                      const isConfirmed = trip.status === "confirmed";
                      const hasLockedOption = item.lockedOption;
                      
                      return (
                        <DraggableItemWrapper key={item.id} id={item.id} disabled={isConfirmed}>
                        <div
                          className={cn(
                            "relative bg-white rounded-xl border shadow-sm overflow-hidden",
                            hasLockedOption ? "border-green-200" : "border-gray-100"
                          )}
                          data-testid={`item-${item.id}`}
                        >
                          <div className="absolute -left-6 top-4 w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
                          
                          {hasLockedOption && hasLockedOption.image && (
                            <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                              <img
                                src={hasLockedOption.image}
                                alt={hasLockedOption.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="p-3">
                            <div className="flex items-start gap-3">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                                <Icon className={cn("h-5 w-5", config.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{item.time}</span>
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                    config.bg, config.color
                                  )}>
                                    {item.itemType}
                                  </span>
                                  {hasLockedOption && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                      Booked
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-charcoal">
                                  {hasLockedOption ? hasLockedOption.title : item.title}
                                </h4>
                                {(hasLockedOption?.description || item.description) && (
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                    {hasLockedOption?.description || item.description}
                                  </p>
                                )}
                                
                                {hasLockedOption && (
                                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                                    {hasLockedOption.priceEstimate && (
                                      <span className="flex items-center gap-1 text-green-600 font-medium">
                                        <DollarSign className="h-3.5 w-3.5" />
                                        {hasLockedOption.priceEstimate}
                                      </span>
                                    )}
                                    {hasLockedOption.rating && (
                                      <span className="flex items-center gap-1 text-gray-600">
                                        <Star className="h-3.5 w-3.5 text-yellow-500" />
                                        {hasLockedOption.rating}
                                      </span>
                                    )}
                                    {hasLockedOption.provider && (
                                      <span className="text-gray-400 text-xs">{hasLockedOption.provider}</span>
                                    )}
                                  </div>
                                )}
                                
                                {hasLockedOption?.bookingUrl && (
                                  <a
                                    href={hasLockedOption.bookingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary text-sm mt-2 hover:underline"
                                    data-testid={`link-book-${item.id}`}
                                  >
                                    View booking
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                              {!isConfirmed && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => setBookingItem(item)}
                                    className="rounded-full p-1.5 hover:bg-primary/10"
                                    data-testid={`button-book-item-${item.id}`}
                                  >
                                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="rounded-full p-1.5 hover:bg-gray-100"
                                    data-testid={`button-edit-item-${item.id}`}
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                  </button>
                                  <button
                                    onClick={() => deleteItemMutation.mutate(item.id)}
                                    className="rounded-full p-1.5 hover:bg-red-50"
                                    data-testid={`button-delete-item-${item.id}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        </DraggableItemWrapper>
                      );
                    })}

                    {dayItems.length === 0 && (
                      <div className="py-4 text-center text-sm text-gray-400">
                        No activities for this day
                      </div>
                    )}
                  </div>
                    </SortableContext>
                  </DndContext>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(showAddItemModal || editingItem) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-heading text-lg font-bold">
                {editingItem ? "Edit Activity" : "Add Activity"}
              </h3>
              <button 
                onClick={() => {
                  setShowAddItemModal(false);
                  setShowExperiencePicker(false);
                  setEditingItem(null);
                  resetItemForm();
                }}
                className="rounded-full bg-gray-100 p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {!editingItem && podExperiences.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-gray-700">From Pod Experiences</label>
                    <button
                      onClick={() => setShowExperiencePicker(!showExperiencePicker)}
                      className="text-xs text-primary font-medium"
                      data-testid="button-toggle-experiences"
                    >
                      {showExperiencePicker ? "Hide" : "Show saved experiences"}
                    </button>
                  </div>
                  {showExperiencePicker && (
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto rounded-xl bg-gray-50 p-2">
                      {podExperiences.map((exp: any) => (
                        <button
                          key={exp.id}
                          onClick={() => handleAddFromExperience(exp)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-100 hover:border-primary transition-colors text-left"
                          data-testid={`button-add-experience-${exp.id}`}
                        >
                          <img 
                            src={exp.image} 
                            alt={exp.title} 
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{exp.title}</p>
                            <p className="text-xs text-gray-500 truncate">{exp.locationName}</p>
                          </div>
                          <Plus className="h-4 w-4 text-primary shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-bold text-gray-700 mb-1 block">Time</label>
                <input
                  type="text"
                  placeholder="e.g., 09:00 AM"
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none"
                  value={itemForm.time}
                  onChange={(e) => setItemForm(f => ({ ...f, time: e.target.value }))}
                  data-testid="input-item-time"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 mb-1 block">Title</label>
                <input
                  type="text"
                  placeholder="e.g., Visit the Zoo"
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none"
                  value={itemForm.title}
                  onChange={(e) => setItemForm(f => ({ ...f, title: e.target.value }))}
                  data-testid="input-item-title"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 mb-1 block">Description (optional)</label>
                <textarea
                  placeholder="What's planned?"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none resize-none"
                  value={itemForm.description}
                  onChange={(e) => setItemForm(f => ({ ...f, description: e.target.value }))}
                  data-testid="input-item-description"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(ITEM_TYPE_CONFIG).map(([type, config]) => {
                    const Icon = config.icon;
                    const isSelected = itemForm.itemType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setItemForm(f => ({ ...f, itemType: type }))}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-gray-100 hover:border-gray-200"
                        )}
                        data-testid={`button-type-${type.toLowerCase()}`}
                      >
                        <Icon className={cn("h-5 w-5", isSelected ? config.color : "text-gray-400")} />
                        <span className={cn(
                          "text-xs font-medium",
                          isSelected ? "text-charcoal" : "text-gray-500"
                        )}>
                          {type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                disabled={!itemForm.title.trim() || addItemMutation.isPending || updateItemMutation.isPending}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                data-testid="button-save-item"
              >
                {addItemMutation.isPending || updateItemMutation.isPending
                  ? "Saving..."
                  : editingItem
                  ? "Update Activity"
                  : "Add Activity"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bookingItem && (
        <BookingModal
          tripItemId={bookingItem.id}
          tripItemTitle={bookingItem.title}
          podTripId={trip.id}
          onClose={() => setBookingItem(null)}
        />
      )}

      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 pb-24">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-heading text-lg font-bold">Trip Preferences</h3>
                <p className="text-sm text-gray-500">Help AI create a better itinerary</p>
              </div>
              <button 
                onClick={() => setShowPreferencesModal(false)}
                className="rounded-full bg-gray-100 p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-5 overflow-y-auto flex-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">
                    Destinations
                  </label>
                  {destinations.length === 0 && (
                    <span className="text-xs text-gray-500">Add stops for your trip</span>
                  )}
                </div>
                
                {destinations.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {destinations.map((dest, idx) => (
                      <div 
                        key={dest.id} 
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl"
                        data-testid={`destination-${dest.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                            <span className="font-medium text-sm truncate">{dest.destination}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(dest.startDate), "MMM d")} - {format(new Date(dest.endDate), "MMM d")}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteDestinationMutation.mutate(dest.id)}
                          className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                          data-testid={`delete-destination-${dest.id}`}
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 p-3 border border-dashed border-gray-200 rounded-xl bg-white">
                  <input
                    type="text"
                    placeholder="Add destination (e.g., Paris, France)"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    value={newDestination.destination}
                    onChange={(e) => setNewDestination(d => ({ ...d, destination: e.target.value }))}
                    data-testid="input-new-destination"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Start</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        value={newDestination.startDate}
                        onChange={(e) => setNewDestination(d => ({ ...d, startDate: e.target.value }))}
                        data-testid="input-new-destination-start"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">End</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        value={newDestination.endDate}
                        onChange={(e) => setNewDestination(d => ({ ...d, endDate: e.target.value }))}
                        data-testid="input-new-destination-end"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (newDestination.destination && newDestination.startDate && newDestination.endDate) {
                        addDestinationMutation.mutate({
                          ...newDestination,
                          sortOrder: destinations.length,
                        });
                      }
                    }}
                    disabled={!newDestination.destination || !newDestination.startDate || !newDestination.endDate || addDestinationMutation.isPending}
                    className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-1"
                    data-testid="button-add-destination"
                  >
                    <Plus className="h-4 w-4" />
                    Add Destination
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  Budget Range (total trip)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full rounded-xl border border-gray-200 pl-8 pr-3 py-3 text-sm focus:border-primary focus:outline-none"
                      value={preferences.budgetMin || ""}
                      onChange={(e) => setPreferences(p => ({ ...p, budgetMin: e.target.value ? parseInt(e.target.value) : undefined }))}
                      data-testid="input-budget-min"
                    />
                  </div>
                  <span className="text-gray-400">to</span>
                  <div className="flex-1 relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full rounded-xl border border-gray-200 pl-8 pr-3 py-3 text-sm focus:border-primary focus:outline-none"
                      value={preferences.budgetMax || ""}
                      onChange={(e) => setPreferences(p => ({ ...p, budgetMax: e.target.value ? parseInt(e.target.value) : undefined }))}
                      data-testid="input-budget-max"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  Trip Pace
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PACE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPreferences(p => ({ ...p, pace: option.value }))}
                      className={cn(
                        "p-3 rounded-xl border-2 text-center transition-all",
                        preferences.pace === option.value
                          ? "border-primary bg-primary/5"
                          : "border-gray-100 hover:border-gray-200"
                      )}
                      data-testid={`button-pace-${option.value}`}
                    >
                      <span className={cn(
                        "text-sm font-bold block",
                        preferences.pace === option.value ? "text-primary" : "text-charcoal"
                      )}>
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  Kids Age Groups
                </label>
                <div className="flex flex-wrap gap-2">
                  {KIDS_AGE_GROUPS.map(age => (
                    <button
                      key={age}
                      onClick={() => {
                        setPreferences(p => ({
                          ...p,
                          kidsAgeGroups: p.kidsAgeGroups.includes(age)
                            ? p.kidsAgeGroups.filter(a => a !== age)
                            : [...p.kidsAgeGroups, age]
                        }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        preferences.kidsAgeGroups.includes(age)
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                      data-testid={`button-age-${age.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  Trip Interests
                </label>
                <div className="flex flex-wrap gap-2">
                  {TRIP_INTERESTS.map(interest => (
                    <button
                      key={interest}
                      onClick={() => {
                        setPreferences(p => ({
                          ...p,
                          tripInterests: p.tripInterests.includes(interest)
                            ? p.tripInterests.filter(i => i !== interest)
                            : [...p.tripInterests, interest]
                        }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        preferences.tripInterests.includes(interest)
                          ? "bg-accent text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                      data-testid={`button-interest-${interest.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

            </div>
            <div className="shrink-0 bg-white p-4 pt-2 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => generateMutation.mutate(undefined)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                data-testid="button-skip-preferences"
              >
                Skip
              </button>
              <button
                onClick={() => generateMutation.mutate(preferences)}
                disabled={generateMutation.isPending}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 text-sm font-bold text-white flex items-center justify-center gap-2"
                data-testid="button-generate-with-preferences"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
