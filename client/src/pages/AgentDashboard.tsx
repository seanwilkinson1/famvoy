import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Clock, CheckCircle2, AlertCircle, ClipboardList, MapPin, Calendar, DollarSign, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

export default function AgentDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");

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

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="w-6 h-6 mx-auto mb-1 text-yellow-600" />
              <p className="text-2xl font-bold">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold">{activeRequests.length}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold">{completedRequests.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex items-center gap-1">
              <ClipboardList className="w-4 h-4" />
              My Tasks
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-1">
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
    </div>
  );
}
