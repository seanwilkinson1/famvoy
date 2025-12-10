import { useLocation } from "wouter";
import { ChevronLeft, ShoppingCart, Trash2, Loader2, CreditCard, Plus, Minus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface CartItem {
  id: number;
  quantity: number;
  guestCount: number;
  priceSnapshot: number;
  selectedDate: string | null;
  bookingOption: {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    vendorName: string | null;
    currency: string;
    maxGuests: number | null;
  };
}

interface Cart {
  id: number;
  items: CartItem[];
}

export default function Cart() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: () => api.cart.get(),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => api.cart.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Item removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: { guestCount: number } }) =>
      api.cart.updateItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const getMaxGuests = (item: CartItem) => {
    return item.bookingOption.maxGuests || 20;
  };

  const checkoutMutation = useMutation({
    mutationFn: () => api.cart.checkout(),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
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

  const totalAmount = cart?.items.reduce(
    (sum, item) => sum + item.priceSnapshot * item.quantity * item.guestCount,
    0
  ) || 0;

  return (
    <div className="flex h-screen flex-col bg-background pb-16">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button
          onClick={() => setLocation("/")}
          className="rounded-full bg-gray-100 p-2"
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="font-heading text-xl font-bold text-charcoal">Your Cart</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-gray-400">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
            <h2 className="font-heading text-lg font-bold text-charcoal">Your cart is empty</h2>
            <p className="text-sm text-center mt-2">
              Add booking options from trip itineraries to get started
            </p>
            <button
              onClick={() => setLocation("/pods")}
              className="mt-6 rounded-xl bg-primary px-6 py-3 font-bold text-white"
              data-testid="button-browse-trips"
            >
              Browse Trips
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
                data-testid={`cart-item-${item.id}`}
              >
                <div className="flex gap-3">
                  {item.bookingOption.image && (
                    <img
                      src={item.bookingOption.image}
                      alt={item.bookingOption.name}
                      className="w-20 h-20 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-charcoal">{item.bookingOption.name}</h3>
                    {item.bookingOption.vendorName && (
                      <p className="text-xs text-gray-400">{item.bookingOption.vendorName}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-gray-500">Guests:</span>
                      <button
                        onClick={() =>
                          updateItemMutation.mutate({
                            itemId: item.id,
                            data: { guestCount: Math.max(1, item.guestCount - 1) },
                          })
                        }
                        disabled={item.guestCount <= 1 || updateItemMutation.isPending}
                        className="rounded-full bg-gray-100 p-1 hover:bg-gray-200 disabled:opacity-50"
                        data-testid={`button-decrease-guests-${item.id}`}
                      >
                        <Minus className="h-3 w-3 text-gray-600" />
                      </button>
                      <span className="font-bold text-sm">{item.guestCount}</span>
                      <button
                        onClick={() => {
                          const maxGuests = getMaxGuests(item);
                          if (item.guestCount < maxGuests) {
                            updateItemMutation.mutate({
                              itemId: item.id,
                              data: { guestCount: item.guestCount + 1 },
                            });
                          }
                        }}
                        disabled={updateItemMutation.isPending || item.guestCount >= getMaxGuests(item)}
                        className="rounded-full bg-gray-100 p-1 hover:bg-gray-200 disabled:opacity-50"
                        data-testid={`button-increase-guests-${item.id}`}
                      >
                        <Plus className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">
                      {formatPrice(item.priceSnapshot * item.guestCount)}
                    </p>
                    <button
                      onClick={() => removeItemMutation.mutate(item.id)}
                      disabled={removeItemMutation.isPending}
                      className="mt-2 rounded-full bg-red-50 p-1.5 hover:bg-red-100"
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart && cart.items.length > 0 && (
        <div className="border-t border-gray-100 p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500">Total</span>
            <span className="font-heading text-2xl font-bold text-charcoal">
              {formatPrice(totalAmount)}
            </span>
          </div>
          <button
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
            data-testid="button-checkout"
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Proceed to Checkout
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
