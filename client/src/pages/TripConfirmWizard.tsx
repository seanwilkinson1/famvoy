import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChevronLeft, Loader2, RefreshCw, Check, ExternalLink, SkipForward, MapPin, Star, Clock, DollarSign, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface TripItemOption {
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
  isLocked: boolean;
}

interface TripItem {
  id: number;
  title: string;
  description: string | null;
  itemType: string;
  dayNumber: number;
  time: string;
  confirmationState: string | null;
}

interface ConfirmSession {
  session: {
    id: number;
    currentItemIndex: number;
    completedAt: string | null;
  };
  items: TripItem[];
  currentItem: TripItem | null;
  currentOptions: TripItemOption[];
  trip: {
    id: number;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  STAY: "Accommodation",
  MEAL: "Restaurant",
  ACTIVITY: "Activity",
  TRANSPORT: "Transportation",
};

const ITEM_TYPE_COLORS: Record<string, string> = {
  STAY: "bg-blue-100 text-blue-700",
  MEAL: "bg-orange-100 text-orange-700",
  ACTIVITY: "bg-purple-100 text-purple-700",
  TRANSPORT: "bg-green-100 text-green-700",
};

export default function TripConfirmWizard() {
  const [, params] = useRoute("/trip/:id/confirm");
  const [, navigate] = useLocation();
  const tripId = params?.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: session, isLoading, error, refetch } = useQuery<ConfirmSession>({
    queryKey: ["confirmSession", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/confirm/session`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) {
          const startRes = await fetch(`/api/trips/${tripId}/confirm/start`, {
            method: "POST",
            credentials: "include",
          });
          if (!startRes.ok) throw new Error("Failed to start confirmation");
          return startRes.json();
        }
        throw new Error("Failed to fetch session");
      }
      return res.json();
    },
    enabled: tripId > 0,
  });

  useEffect(() => {
    if (session?.currentItem && session.currentOptions.length === 0 && !isGenerating) {
      generateOptions();
    }
  }, [session?.currentItem?.id]);

  const generateOptions = async () => {
    if (!session?.currentItem) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/items/${session.currentItem.id}/options/generate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate options");
      const data = await res.json();
      console.log("Generated new options:", data);
      await queryClient.invalidateQueries({ queryKey: ["confirmSession", tripId] });
    } catch (error) {
      console.error("Generate options error:", error);
      toast.error("Failed to generate booking options");
    } finally {
      setIsGenerating(false);
    }
  };

  const lockOptionMutation = useMutation({
    mutationFn: async ({ itemId, optionId }: { itemId: number; optionId: number }) => {
      const res = await fetch(`/api/trips/${tripId}/items/${itemId}/options/${optionId}/lock`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to lock option");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Choice locked!");
      setSelectedOption(null);
      queryClient.invalidateQueries({ queryKey: ["confirmSession", tripId] });
    },
    onError: () => {
      toast.error("Failed to save your choice");
    },
  });

  const skipItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await fetch(`/api/trips/${tripId}/items/${itemId}/skip`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to skip item");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Item skipped");
      queryClient.invalidateQueries({ queryKey: ["confirmSession", tripId] });
    },
  });

  const completeTripMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/confirm/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete trip");
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Trip confirmed! 🎉");
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me/trips"] });
      navigate(`/trip/${tripId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Loading your trip...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-white">
        <div className="text-center">
          <p className="text-red-500 mb-4">Unable to load trip confirmation</p>
          <button
            onClick={() => navigate(`/trip/${tripId}`)}
            className="text-primary hover:underline"
            data-testid="button-go-back"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const isLastItem = session.progress.current >= session.progress.total;
  const currentItem = session.currentItem;

  if (isLastItem && !currentItem) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-white p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6"
        >
          <Check className="h-10 w-10 text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">All Items Reviewed!</h1>
        <p className="text-gray-500 mb-8 text-center">
          You've gone through all the bookable items in your trip.
        </p>
        <button
          onClick={() => completeTripMutation.mutate()}
          disabled={completeTripMutation.isPending}
          className="bg-primary text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2"
          data-testid="button-confirm-trip"
        >
          {completeTripMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          Confirm My Trip
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate(`/trip/${tripId}`)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
              data-testid="button-back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <span className="text-sm text-gray-500">
              {session.progress.current} of {session.progress.total}
            </span>
            {currentItem && (
              <button
                onClick={() => skipItemMutation.mutate(currentItem.id)}
                disabled={skipItemMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-skip-top"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </button>
            )}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${session.progress.percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        <AnimatePresence mode="wait">
          {currentItem && (
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <span className={cn(
                  "inline-block px-3 py-1 rounded-full text-xs font-medium mb-2",
                  ITEM_TYPE_COLORS[currentItem.itemType] || "bg-gray-100 text-gray-700"
                )}>
                  {ITEM_TYPE_LABELS[currentItem.itemType] || currentItem.itemType}
                </span>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{currentItem.title}</h1>
                <p className="text-gray-500 text-sm">
                  Day {currentItem.dayNumber} • {currentItem.time}
                </p>
                {currentItem.description && (
                  <p className="text-gray-600 mt-2 text-sm">{currentItem.description}</p>
                )}
              </div>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-gray-500">Finding booking options...</p>
                </div>
              ) : session.currentOptions.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 mb-4">No options available</p>
                  <button
                    onClick={generateOptions}
                    className="text-primary hover:underline flex items-center gap-2 mx-auto"
                    data-testid="button-generate-options"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generate Options
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-center text-sm text-gray-500 mb-4">
                    Choose your preferred option for this activity
                  </p>
                  
                  <div className="space-y-4">
                    {session.currentOptions.map((option, index) => (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedOption(option.id)}
                        className={cn(
                          "bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all",
                          selectedOption === option.id
                            ? "border-primary shadow-lg"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        data-testid={`option-card-${option.id}`}
                      >
                        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                          {option.image && (
                            <img
                              src={option.image}
                              alt={option.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{option.title}</h3>
                            {selectedOption === option.id && (
                              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                          
                          {option.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{option.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-3 text-sm">
                            {option.priceEstimate && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <DollarSign className="h-4 w-4" />
                                {option.priceEstimate}
                              </span>
                            )}
                            {option.rating && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Star className="h-4 w-4 text-yellow-500" />
                                {option.rating}
                                {option.reviewCount && (
                                  <span className="text-gray-400">({option.reviewCount})</span>
                                )}
                              </span>
                            )}
                            {option.provider && (
                              <span className="text-gray-400">{option.provider}</span>
                            )}
                          </div>
                          
                          {option.address && (
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {option.address}
                            </p>
                          )}
                          
                          {option.bookingUrl && (
                            <a
                              href={option.bookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-primary text-sm mt-3 hover:underline"
                              data-testid={`link-book-${option.id}`}
                            >
                              View on {option.provider || "website"}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => {
                        if (selectedOption && currentItem) {
                          lockOptionMutation.mutate({
                            itemId: currentItem.id,
                            optionId: selectedOption,
                          });
                        }
                      }}
                      disabled={!selectedOption || lockOptionMutation.isPending}
                      className={cn(
                        "w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all",
                        selectedOption
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      )}
                      data-testid="button-lock-choice"
                    >
                      {lockOptionMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Check className="h-5 w-5" />
                      )}
                      Lock In My Choice
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={generateOptions}
                        disabled={isGenerating}
                        className="flex-1 py-3 border border-gray-300 rounded-full font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50"
                        data-testid="button-regenerate"
                      >
                        <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                        New Options
                      </button>
                      
                      <button
                        onClick={() => currentItem && skipItemMutation.mutate(currentItem.id)}
                        disabled={skipItemMutation.isPending}
                        className="flex-1 py-3 border border-gray-300 rounded-full font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50"
                        data-testid="button-skip"
                      >
                        <SkipForward className="h-4 w-4" />
                        Skip
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
