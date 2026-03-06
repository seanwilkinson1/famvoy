import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { CheckCircle2, Clock, ArrowRight, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function ConciergeSuccess() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const tripId = searchParams.get('tripId');

  interface ConciergeRequest {
    id: number;
    status: string;
    totalEstimatedCents: number;
    serviceFeePercent: number;
    serviceFeeCents: number;
    totalPaidCents: number;
  }

  const { data: conciergeRequest, isLoading } = useQuery<ConciergeRequest | null>({
    queryKey: [`/api/trips/${tripId}/concierge`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/trips/${tripId}/concierge`);
      return await res.json() as ConciergeRequest | null;
    },
    enabled: !!tripId,
  });

  const completeMutation = useMutation({
    mutationFn: (requestId: number) => apiRequest("POST", `/api/concierge/requests/${requestId}/complete-payment`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/concierge`] });
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: ["trip", parseInt(tripId)] });
      }
    },
  });

  useEffect(() => {
    if (conciergeRequest && conciergeRequest.status === 'pending_payment' && !completeMutation.isPending && !completeMutation.isSuccess) {
      completeMutation.mutate(conciergeRequest.id);
    }
  }, [conciergeRequest, completeMutation.isPending, completeMutation.isSuccess]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Processing your payment...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PartyPopper className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Booking Request Submitted!</h1>
        <p className="text-muted-foreground">
          Your travel concierge will start booking your trip.
        </p>
      </div>

      {conciergeRequest && (
        <Card className="w-full max-w-sm mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Trip Total</span>
              <span className="font-semibold">{formatCurrency(conciergeRequest.totalEstimatedCents)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Service Fee ({conciergeRequest.serviceFeePercent}%)</span>
              <span className="font-semibold">{formatCurrency(conciergeRequest.serviceFeeCents)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-medium">Total Paid</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(conciergeRequest.totalPaidCents)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="w-full max-w-sm space-y-4">
        <Card className="border-warm-teal/30 bg-warm-teal/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-warm-teal mt-0.5" />
              <div>
                <p className="font-medium">What happens next?</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Your concierge receives your trip details
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 rounded-full" />
                    They book each item on your itinerary
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 rounded-full" />
                    You'll get confirmation codes for everything
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href={tripId ? `/trip/${tripId}` : "/"}>
          <Button className="w-full" size="lg" data-testid="button-view-trip">
            View Your Trip <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>

        <Link href="/">
          <Button variant="outline" className="w-full" data-testid="button-go-home">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
