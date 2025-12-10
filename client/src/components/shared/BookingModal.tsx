import { useState } from "react";
import { X, ShoppingCart, Loader2, Users, Calendar, Check, Plus, Minus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookingOption {
  id: number;
  name: string;
  description: string | null;
  priceInCents: number;
  currency: string;
  image: string | null;
  vendorName: string | null;
  bookingType: string;
  maxGuests: number | null;
  durationMinutes: number | null;
}

interface BookingModalProps {
  tripItemId?: number;
  tripItemTitle: string;
  podTripId?: number;
  onClose: () => void;
}

export function BookingModal({ tripItemId, tripItemTitle, podTripId, onClose }: BookingModalProps) {
  const [selectedOption, setSelectedOption] = useState<BookingOption | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const queryClient = useQueryClient();

  const { data: options = [], isLoading, isError } = useQuery<BookingOption[]>({
    queryKey: ["bookingOptions", tripItemId],
    queryFn: () => api.booking.getOptions(tripItemId),
  });

  if (isError) {
    toast.error("Failed to load booking options");
  }

  const addToCartMutation = useMutation({
    mutationFn: (data: { bookingOptionId: number; guestCount: number; podTripId?: number }) =>
      api.cart.addItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart!");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleAddToCart = () => {
    if (!selectedOption) return;
    addToCartMutation.mutate({
      bookingOptionId: selectedOption.id,
      guestCount,
      podTripId,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-96 max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="font-heading text-lg font-bold">Book</h3>
            <p className="text-sm text-gray-500">{tripItemTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2 hover:bg-gray-200"
            data-testid="button-close-booking-modal"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Failed to load options</p>
              <p className="text-sm mt-1">Please try again later</p>
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No booking options available</p>
              <p className="text-sm mt-1">Check back later for bookable experiences</p>
            </div>
          ) : (
            <div className="space-y-3">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option)}
                  className={cn(
                    "w-full text-left rounded-xl border-2 p-3 transition-all",
                    selectedOption?.id === option.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                  data-testid={`booking-option-${option.id}`}
                >
                  <div className="flex gap-3">
                    {option.image && (
                      <img
                        src={option.image}
                        alt={option.name}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-charcoal line-clamp-1">{option.name}</h4>
                        {selectedOption?.id === option.id && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                      {option.vendorName && (
                        <p className="text-xs text-gray-400">{option.vendorName}</p>
                      )}
                      {option.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{option.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary">{formatPrice(option.priceInCents)}</span>
                        {option.durationMinutes && (
                          <span className="text-xs text-gray-400">{option.durationMinutes} min</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedOption && (
          <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Guests</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="rounded-full bg-white border border-gray-200 p-1.5 hover:bg-gray-100"
                  disabled={guestCount <= 1}
                  data-testid="button-decrease-guests"
                >
                  <Minus className="h-4 w-4 text-gray-600" />
                </button>
                <span className="font-bold text-charcoal w-8 text-center">{guestCount}</span>
                <button
                  onClick={() => setGuestCount(guestCount + 1)}
                  className="rounded-full bg-white border border-gray-200 p-1.5 hover:bg-gray-100"
                  disabled={selectedOption.maxGuests ? guestCount >= selectedOption.maxGuests : false}
                  data-testid="button-increase-guests"
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-heading text-xl font-bold text-charcoal">
                  {formatPrice(selectedOption.priceInCents * guestCount)}
                </p>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={addToCartMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                data-testid="button-add-to-cart"
              >
                {addToCartMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
