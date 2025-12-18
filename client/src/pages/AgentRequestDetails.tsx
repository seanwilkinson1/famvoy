import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, MapPin, Calendar, Clock, DollarSign, CheckCircle2, Loader2, AlertCircle, ExternalLink, Phone, Mail, User, Building2, Plane, Utensils, Ticket, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConciergeRequestItem {
  id: number;
  conciergeRequestId: number;
  tripItemId: number;
  selectedOptionId: number | null;
  status: string;
  estimatedPriceCents: number | null;
  actualPriceCents: number | null;
  confirmationCode: string | null;
  bookingReference: string | null;
  providerName: string | null;
  agentNotes: string | null;
  bookedAt: string | null;
  tripItem: {
    id: number;
    dayNumber: number;
    time: string;
    title: string;
    description: string | null;
    itemType: string;
  };
  selectedOption?: {
    id: number;
    title: string;
    description: string | null;
    priceEstimate: string | null;
    bookingUrl: string | null;
    address: string | null;
  };
}

export default function AgentRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [bookingForm, setBookingForm] = useState({
    confirmationCode: "",
    bookingReference: "",
    providerName: "",
    actualPriceCents: "",
    agentNotes: "",
  });

  interface ConciergeRequest {
    id: number;
    tripId: number;
    userId: number;
    assignedAgentId: number | null;
    status: string;
    totalEstimatedCents: number;
    serviceFeeCents: number;
    totalPaidCents: number;
    customerNotes: string | null;
    agentNotes: string | null;
    trip: {
      id: number;
      name: string;
      destination: string;
      startDate: string;
      endDate: string;
    };
    user: {
      id: number;
      name: string | null;
      email: string | null;
      avatar: string | null;
    };
  }

  const { data: request, isLoading } = useQuery<ConciergeRequest>({
    queryKey: [`/api/concierge/requests/${id}`],
  });

  const { data: items = [], isLoading: loadingItems } = useQuery<ConciergeRequestItem[]>({
    queryKey: [`/api/concierge/requests/${id}/items`],
    enabled: !!id,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      apiRequest("PATCH", `/api/agent/requests/${id}/items/${itemId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/concierge/requests/${id}/items`] });
      setEditingItemId(null);
      setBookingForm({ confirmationCode: "", bookingReference: "", providerName: "", actualPriceCents: "", agentNotes: "" });
      toast({ title: "Item updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update item", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/agent/requests/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/concierge/requests/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/requests/assigned"] });
      toast({ title: "Request marked as complete!" });
      navigate("/agent");
    },
    onError: (error: any) => {
      toast({ title: "Cannot complete request", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p>Request not found</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'hotel': return <Building2 className="w-5 h-5" />;
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'restaurant': return <Utensils className="w-5 h-5" />;
      case 'activity': return <Ticket className="w-5 h-5" />;
      case 'transport': return <Car className="w-5 h-5" />;
      default: return <MapPin className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'booked':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Booked</Badge>;
      case 'skipped':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Skipped</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleMarkBooked = (itemId: number) => {
    updateItemMutation.mutate({
      itemId,
      data: {
        status: 'booked',
        ...bookingForm,
        actualPriceCents: bookingForm.actualPriceCents ? parseInt(bookingForm.actualPriceCents) * 100 : null,
      },
    });
  };

  const handleSkip = (itemId: number) => {
    updateItemMutation.mutate({ itemId, data: { status: 'skipped' } });
  };

  const bookedCount = items.filter(i => i.status === 'booked').length;
  const skippedCount = items.filter(i => i.status === 'skipped').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const allDone = pendingCount === 0;

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="bg-gradient-to-b from-warm-teal/20 to-background px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/agent">
            <button className="p-2 hover:bg-white/50 rounded-full transition-colors" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{request.trip?.name}</h1>
            <p className="text-sm text-muted-foreground">{request.trip?.destination}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{request.user?.name || 'Unknown'}</span>
              </div>
              {request.user?.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Mail className="w-3 h-3" />
                  <span>{request.user.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{request.trip?.startDate}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <DollarSign className="w-3 h-3" />
                <span>{formatCurrency(request.totalPaidCents)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>{bookedCount} booked</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span>{pendingCount} pending</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>{skippedCount} skipped</span>
          </div>
        </div>
      </div>

      {request.customerNotes && (
        <div className="px-4 mb-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <p className="text-sm font-medium text-blue-800">Customer Notes:</p>
              <p className="text-sm text-blue-700">{request.customerNotes}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3">Booking Items ({items.length})</h2>
        
        {loadingItems ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className={item.status === 'booked' ? 'border-green-200 bg-green-50/50' : ''} data-testid={`card-item-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getItemIcon(item.tripItem.itemType)}
                      <div>
                        <p className="font-medium">{item.tripItem.title}</p>
                        <p className="text-sm text-muted-foreground">Day {item.tripItem.dayNumber} at {item.tripItem.time}</p>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  {item.selectedOption && (
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium">{item.selectedOption.title}</p>
                      {item.selectedOption.priceEstimate && (
                        <p className="text-sm text-muted-foreground">Est: {item.selectedOption.priceEstimate}</p>
                      )}
                      {item.selectedOption.address && (
                        <p className="text-xs text-muted-foreground mt-1">{item.selectedOption.address}</p>
                      )}
                      {item.selectedOption.bookingUrl && (
                        <a 
                          href={item.selectedOption.bookingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary flex items-center gap-1 mt-2"
                        >
                          Open booking site <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {item.status === 'booked' && (
                    <div className="bg-green-100 rounded-lg p-3 space-y-1">
                      {item.confirmationCode && (
                        <p className="text-sm"><span className="font-medium">Confirmation:</span> {item.confirmationCode}</p>
                      )}
                      {item.bookingReference && (
                        <p className="text-sm"><span className="font-medium">Reference:</span> {item.bookingReference}</p>
                      )}
                      {item.providerName && (
                        <p className="text-sm"><span className="font-medium">Provider:</span> {item.providerName}</p>
                      )}
                      {item.actualPriceCents && (
                        <p className="text-sm"><span className="font-medium">Actual Price:</span> {formatCurrency(item.actualPriceCents)}</p>
                      )}
                    </div>
                  )}

                  {item.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Dialog open={editingItemId === item.id} onOpenChange={(open) => {
                        if (open) setEditingItemId(item.id);
                        else setEditingItemId(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button className="flex-1" data-testid={`button-book-${item.id}`}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Booked
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Booking Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="confirmationCode">Confirmation Code</Label>
                              <Input
                                id="confirmationCode"
                                value={bookingForm.confirmationCode}
                                onChange={(e) => setBookingForm(prev => ({ ...prev, confirmationCode: e.target.value }))}
                                placeholder="e.g., ABC123XYZ"
                                data-testid="input-confirmation-code"
                              />
                            </div>
                            <div>
                              <Label htmlFor="bookingReference">Booking Reference</Label>
                              <Input
                                id="bookingReference"
                                value={bookingForm.bookingReference}
                                onChange={(e) => setBookingForm(prev => ({ ...prev, bookingReference: e.target.value }))}
                                placeholder="e.g., Order #12345"
                                data-testid="input-booking-reference"
                              />
                            </div>
                            <div>
                              <Label htmlFor="providerName">Provider Name</Label>
                              <Input
                                id="providerName"
                                value={bookingForm.providerName}
                                onChange={(e) => setBookingForm(prev => ({ ...prev, providerName: e.target.value }))}
                                placeholder="e.g., Marriott, Viator"
                                data-testid="input-provider-name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="actualPrice">Actual Price ($)</Label>
                              <Input
                                id="actualPrice"
                                type="number"
                                value={bookingForm.actualPriceCents}
                                onChange={(e) => setBookingForm(prev => ({ ...prev, actualPriceCents: e.target.value }))}
                                placeholder="e.g., 150"
                                data-testid="input-actual-price"
                              />
                            </div>
                            <div>
                              <Label htmlFor="agentNotes">Notes</Label>
                              <Textarea
                                id="agentNotes"
                                value={bookingForm.agentNotes}
                                onChange={(e) => setBookingForm(prev => ({ ...prev, agentNotes: e.target.value }))}
                                placeholder="Any notes about this booking..."
                                data-testid="input-agent-notes"
                              />
                            </div>
                            <Button 
                              className="w-full" 
                              onClick={() => handleMarkBooked(item.id)}
                              disabled={updateItemMutation.isPending}
                              data-testid="button-save-booking"
                            >
                              {updateItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              Save & Mark Booked
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        onClick={() => handleSkip(item.id)}
                        disabled={updateItemMutation.isPending}
                        data-testid={`button-skip-${item.id}`}
                      >
                        Skip
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {allDone && request.status !== 'completed' && (
          <div className="mt-6">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              data-testid="button-complete-request"
            >
              {completeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              Complete Request
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
