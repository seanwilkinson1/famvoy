import { useRoute, useLocation } from "wouter";
import { ChevronLeft, MapPin, Calendar, Sparkles, Loader2, RefreshCw, Plus, Trash2, Edit2, X, Clock, Utensils, BedDouble, Car, Ticket, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

const ITEM_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ACTIVITY: { icon: Ticket, color: "text-primary", bg: "bg-primary/10" },
  MEAL: { icon: Utensils, color: "text-orange-500", bg: "bg-orange-50" },
  STAY: { icon: BedDouble, color: "text-blue-500", bg: "bg-blue-50" },
  TRANSPORT: { icon: Car, color: "text-gray-500", bg: "bg-gray-100" },
};

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
}

interface Trip {
  id: number;
  podId: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  aiSummary: string | null;
  createdByUserId: number;
  createdAt: string;
  items: TripItem[];
}

export default function TripDetails() {
  const [match, params] = useRoute("/trip/:id");
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showExperiencePicker, setShowExperiencePicker] = useState(false);
  const [addItemDayNumber, setAddItemDayNumber] = useState(1);
  const [editingItem, setEditingItem] = useState<TripItem | null>(null);
  const [itemForm, setItemForm] = useState({
    time: "09:00 AM",
    title: "",
    description: "",
    itemType: "ACTIVITY",
    experienceId: null as number | null,
  });
  const queryClient = useQueryClient();
  const tripId = params?.id ? parseInt(params.id) : 0;

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: ["trip", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!match && tripId > 0,
  });

  const { data: podExperiences = [] } = useQuery({
    queryKey: ["podExperiences", trip?.podId],
    queryFn: () => trip?.podId ? api.pods.getExperiences(trip.podId) : [],
    enabled: !!trip?.podId,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.trips.generate(tripId),
    onMutate: () => {
      setIsGenerating(true);
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
    <div className="flex h-screen flex-col bg-background">
      <div className="border-b border-gray-100 bg-white px-6 pt-14 pb-4 shadow-sm z-10">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={() => setLocation(`/pod/${trip.podId}`)} 
            className="rounded-full bg-gray-100 p-2 active:scale-90"
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={() => generateMutation.mutate()}
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

        {trip.items.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6">
            <Sparkles className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-center mb-1 font-medium">No itinerary yet</p>
            <p className="text-sm text-center text-gray-400 mb-4">
              Let AI create a personalized {numDays}-day plan based on your pod's interests
            </p>
            <button
              onClick={() => generateMutation.mutate()}
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
                  </div>

                  <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                    {dayItems.map((item) => {
                      const config = ITEM_TYPE_CONFIG[item.itemType] || ITEM_TYPE_CONFIG.ACTIVITY;
                      const Icon = config.icon;
                      
                      return (
                        <div
                          key={item.id}
                          className="relative bg-white rounded-xl border border-gray-100 p-3 shadow-sm"
                          data-testid={`item-${item.id}`}
                        >
                          <div className="absolute -left-6 top-4 w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
                          
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
                              </div>
                              <h4 className="font-bold text-charcoal">{item.title}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
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
                          </div>
                        </div>
                      );
                    })}

                    {dayItems.length === 0 && (
                      <div className="py-4 text-center text-sm text-gray-400">
                        No activities for this day
                      </div>
                    )}
                  </div>
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
    </div>
  );
}
