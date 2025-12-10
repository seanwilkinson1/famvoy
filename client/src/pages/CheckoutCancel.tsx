import { useLocation } from "wouter";
import { XCircle, ShoppingCart, Home } from "lucide-react";

export default function CheckoutCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="text-center max-w-sm">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-6">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
        </div>

        <h1 className="font-heading text-2xl font-bold text-charcoal mb-2">
          Checkout Cancelled
        </h1>
        <p className="text-gray-500 mb-8">
          Your payment was not processed. Your items are still in your cart if you'd like to try again.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setLocation("/cart")}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white hover:bg-primary/90"
            data-testid="button-return-to-cart"
          >
            <ShoppingCart className="h-5 w-5" />
            Return to Cart
          </button>
          <button
            onClick={() => setLocation("/")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-bold text-charcoal hover:bg-gray-50"
            data-testid="button-go-home"
          >
            <Home className="h-5 w-5" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
