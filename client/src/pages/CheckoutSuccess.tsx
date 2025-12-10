import { useLocation, useSearch } from "wouter";
import { CheckCircle, Loader2, Home, FileText } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const orderId = params.get("order");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => (orderId ? api.orders.getById(parseInt(orderId)) : null),
    enabled: !!orderId,
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => api.orders.complete(id),
  });

  useEffect(() => {
    if (orderId && order?.status === "pending") {
      completeMutation.mutate(parseInt(orderId));
    }
  }, [orderId, order?.status]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      {isLoading ? (
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      ) : (
        <div className="text-center max-w-sm">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          </div>

          <h1 className="font-heading text-2xl font-bold text-charcoal mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-500 mb-6">
            Your booking has been successfully processed. You'll receive a confirmation email shortly.
          </p>

          {order && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="font-bold text-charcoal">Order #{order.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Total Paid</span>
                <span className="font-heading text-xl font-bold text-primary">
                  {formatPrice(order.totalInCents)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setLocation("/")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white hover:bg-primary/90"
              data-testid="button-go-home"
            >
              <Home className="h-5 w-5" />
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
