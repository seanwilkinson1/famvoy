import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Clock, CheckCircle2, AlertCircle, ClipboardList, MapPin, Calendar, DollarSign, ChevronRight, Loader2, Utensils, Phone, MessageCircle, ExternalLink, Plane, Compass } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  createdAt: string;
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

interface ManualBookingItem {
  id: number;
  tripItemId: number;
  sessionId: number;
  itemType: string;
  itemName: string;
  requiresManualBooking: boolean;
  openTableAvailable: boolean | null;
  bookingUrl: string | null;
  bookingNotes: string | null;
  status: string;
  tripItem: {
    id: number;
    title: string;
    notes: string | null;
    dateTime: string | null;
  };
  session: {
    tripId: number;
    userId: number;
    trip?: { name: string; destination: string };
    user?: { name: string | null; email: string | null };
  };
}

interface ChatConversation {
  sessionId: number;
  tripId: number;
  userId: number;
  tripName: string;
  userName: string | null;
  messageCount: number;
  lastMessageAt: string;
  aiSuggestionsCount: number;
}

export default function AgentDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedBooking, setSelectedBooking] = useState<ManualBookingItem | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");

  const { data: agentStatus } = useQuery<{ isAgent: boolean }>({
    queryKey: ["/api/agent/status"],
  });

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery<ConciergeRequest[]>({
    queryKey: ["/api/agent/requests/pending"],
    enabled: agentStatus?.isAgent,
  });

  const { data: assignedRequests = [], isLoading: loadingAssigned } = useQuery<ConciergeRequest[]>({
    queryKey: ["/api/agent/requests/assigned"],
    enabled: agentStatus?.isAgent,
  });

  const { data: manualBookings = [], isLoading: loadingManual } = useQuery<ManualBookingItem[]>({
    queryKey: ["/api/agent/manual-bookings"],
    enabled: agentStatus?.isAgent,
  });

  const { data: chatConversations = [], isLoading: loadingChats } = useQuery<ChatConversation[]>({
    queryKey: ["/api/agent/chat-conversations"],
    enabled: agentStatus?.isAgent,
  });

  const claimMutation = useMutation({
    mutationFn: (requestId: number) => apiRequest("POST", `/api/agent/requests/${requestId}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/requests/assigned"] });
      toast({ title: "Request claimed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to claim request", description: error.message, variant: "destructive" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: (data: { id: number; status: string; bookingNotes?: string; confirmationNumber?: string }) => 
      apiRequest("PATCH", `/api/agent/manual-bookings/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/manual-bookings"] });
      toast({ title: "Booking updated successfully" });
      setSelectedBooking(null);
      setBookingNotes("");
      setConfirmationNumber("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to update booking", description: error.message, variant: "destructive" });
    },
  });

  if (!agentStatus?.isAgent) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You are not authorized as a travel agent.</p>
          <Link href="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const RequestCard = ({ request, showClaimButton }: { request: ConciergeRequest; showClaimButton?: boolean }) => (
    <Card className="mb-4" data-testid={`card-request-${request.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <img 
              src={request.user.avatar || '/placeholder-avatar.png'} 
              alt={request.user.name || 'User'} 
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="font-medium">{request.user.name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{request.user.email}</p>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{request.trip.name}</span>
            <span className="text-muted-foreground">- {request.trip.destination}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{request.trip.startDate} - {request.trip.endDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span>Total: {formatCurrency(request.totalPaidCents)}</span>
            <span className="text-muted-foreground">(Fee: {formatCurrency(request.serviceFeeCents)})</span>
          </div>
        </div>

        {request.customerNotes && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium mb-1">Customer Notes:</p>
            <p className="text-sm text-muted-foreground">{request.customerNotes}</p>
          </div>
        )}

        <div className="flex gap-2">
          {showClaimButton && (
            <Button 
              onClick={() => claimMutation.mutate(request.id)}
              disabled={claimMutation.isPending}
              className="flex-1"
              data-testid={`button-claim-${request.id}`}
            >
              {claimMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Claim Request
            </Button>
          )}
          <Link href={`/agent/request/${request.id}`}>
            <Button variant="outline" className="flex items-center gap-1" data-testid={`button-view-${request.id}`}>
              View Details <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const completedRequests = assignedRequests.filter(r => r.status === 'completed');
  const activeRequests = assignedRequests.filter(r => r.status !== 'completed');

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="bg-gradient-to-b from-warm-teal/20 to-background px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <button className="p-2 hover:bg-white/50 rounded-full transition-colors" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Agent Dashboard</h1>
            <p className="text-muted-foreground">Manage booking requests</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <Card>
            <CardContent className="p-2 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
              <p className="text-xl font-bold">{pendingRequests.length}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xl font-bold">{activeRequests.length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-bold">{completedRequests.length}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <Phone className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xl font-bold">{manualBookings.filter(b => b.status === 'pending').length}</p>
              <p className="text-[10px] text-muted-foreground">Manual</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <MessageCircle className="w-5 h-5 mx-auto mb-1 text-purple-600" />
              <p className="text-xl font-bold">{chatConversations.length}</p>
              <p className="text-[10px] text-muted-foreground">Chats</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="pending" className="flex flex-col items-center gap-0.5 py-1.5 text-xs">
              <Clock className="w-4 h-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex flex-col items-center gap-0.5 py-1.5 text-xs">
              <ClipboardList className="w-4 h-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex flex-col items-center gap-0.5 py-1.5 text-xs">
              <Phone className="w-4 h-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex flex-col items-center gap-0.5 py-1.5 text-xs">
              <MessageCircle className="w-4 h-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex flex-col items-center gap-0.5 py-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              Done
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {loadingPending ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No pending requests</p>
              </div>
            ) : (
              pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} showClaimButton />
              ))
            )}
          </TabsContent>

          <TabsContent value="assigned" className="mt-4">
            {loadingAssigned ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No active tasks</p>
              </div>
            ) : (
              activeRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            {loadingManual ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : manualBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No manual bookings pending</p>
                <p className="text-sm mt-1">Items requiring phone/email booking will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {manualBookings.map(booking => (
                  <Card key={booking.id} data-testid={`card-manual-booking-${booking.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {booking.itemType === 'restaurant' ? (
                            <Utensils className="w-5 h-5 text-orange-600" />
                          ) : booking.itemType === 'flight' ? (
                            <Plane className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Compass className="w-5 h-5 text-green-600" />
                          )}
                          <div>
                            <p className="font-medium">{booking.itemName}</p>
                            <p className="text-sm text-muted-foreground capitalize">{booking.itemType}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={
                            booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                          }
                        >
                          {booking.status === 'pending' ? 'Needs Booking' : 
                           booking.status === 'in_progress' ? 'In Progress' : 'Booked'}
                        </Badge>
                      </div>
                      
                      {booking.itemType === 'restaurant' && (
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className={booking.openTableAvailable ? 'text-green-600' : 'text-orange-600'}>
                            {booking.openTableAvailable ? '✓ OpenTable Available' : '✗ No OpenTable - Manual Required'}
                          </span>
                        </div>
                      )}

                      {booking.tripItem.dateTime && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(booking.tripItem.dateTime).toLocaleString()}</span>
                        </div>
                      )}

                      {booking.bookingUrl && (
                        <a 
                          href={booking.bookingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Booking Link
                        </a>
                      )}

                      {booking.tripItem.notes && (
                        <div className="bg-muted/50 rounded p-2 text-sm mb-3">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Notes:</p>
                          <p>{booking.tripItem.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setBookingNotes(booking.bookingNotes || '');
                          }}
                          data-testid={`button-update-booking-${booking.id}`}
                        >
                          Update Status
                        </Button>
                        {booking.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => updateBookingMutation.mutate({ 
                              id: booking.id, 
                              status: 'in_progress' 
                            })}
                            data-testid={`button-start-booking-${booking.id}`}
                          >
                            Start Booking
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chats" className="mt-4">
            {loadingChats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : chatConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No AI chat conversations yet</p>
                <p className="text-sm mt-1">User conversations with AI assistant will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatConversations.map(convo => (
                  <Card key={convo.sessionId} data-testid={`card-chat-${convo.sessionId}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{convo.tripName}</p>
                          <p className="text-sm text-muted-foreground">{convo.userName || 'Unknown user'}</p>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {convo.messageCount} messages
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>AI Suggestions: {convo.aiSuggestionsCount}</span>
                        <span>Last: {new Date(convo.lastMessageAt).toLocaleDateString()}</span>
                      </div>
                      <Link href={`/agent/chat/${convo.sessionId}`}>
                        <Button size="sm" variant="outline" className="mt-3" data-testid={`button-view-chat-${convo.sessionId}`}>
                          View Conversation <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No completed requests yet</p>
              </div>
            ) : (
              completedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Booking Status</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <Label>Booking: {selectedBooking.itemName}</Label>
                <p className="text-sm text-muted-foreground capitalize">{selectedBooking.itemType}</p>
              </div>
              <div>
                <Label htmlFor="confirmationNumber">Confirmation Number</Label>
                <Input
                  id="confirmationNumber"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  placeholder="Enter confirmation number if available"
                />
              </div>
              <div>
                <Label htmlFor="bookingNotes">Agent Notes</Label>
                <Textarea
                  id="bookingNotes"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Add notes about this booking..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedBooking) {
                  updateBookingMutation.mutate({
                    id: selectedBooking.id,
                    status: 'completed',
                    bookingNotes,
                    confirmationNumber,
                  });
                }
              }}
              disabled={updateBookingMutation.isPending}
            >
              {updateBookingMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Mark as Booked
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
