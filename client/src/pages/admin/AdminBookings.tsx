import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Order {
  id: number;
  userId: number;
  stripeCheckoutSessionId: string;
  status: string;
  totalCents: number;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
  items: Array<{
    id: number;
    title: string;
    priceCents: number;
  }>;
}

interface ManualBooking {
  id: number;
  tripItemId: number;
  sessionId: number;
  itemType: string;
  itemName: string;
  requiresManualBooking: boolean;
  bookingUrl: string | null;
  bookingNotes: string | null;
  status: string;
  confirmationNumber: string | null;
  createdAt: string;
  session: {
    tripId: number;
    user: { name: string | null; email: string | null };
    trip: { name: string; destination: string };
  };
}

export default function AdminBookings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<ManualBooking | null>(null);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [bookingNotes, setBookingNotes] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");

  const { data: ordersData, isLoading: loadingOrders } = useQuery<{ orders: Order[]; total: number; pages: number }>({
    queryKey: ["/api/admin/orders", { search, page }],
    enabled: activeTab === "orders",
  });

  const { data: manualData, isLoading: loadingManual } = useQuery<{ bookings: ManualBooking[]; total: number; pages: number }>({
    queryKey: ["/api/admin/manual-bookings", { search, page }],
    enabled: activeTab === "manual",
  });

  const updateBookingMutation = useMutation({
    mutationFn: (data: { id: number; status: string; bookingNotes?: string; confirmationNumber?: string }) =>
      apiRequest("PATCH", `/api/admin/manual-bookings/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/manual-bookings"] });
      setBookingDialog(false);
      toast({ title: "Booking updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update booking", description: error.message, variant: "destructive" });
    },
  });

  const handleCompleteBooking = (booking: ManualBooking) => {
    setSelectedBooking(booking);
    setBookingNotes(booking.bookingNotes || "");
    setConfirmationNumber(booking.confirmationNumber || "");
    setBookingDialog(true);
  };

  const handleSaveBooking = () => {
    if (!selectedBooking) return;
    updateBookingMutation.mutate({
      id: selectedBooking.id,
      status: "completed",
      bookingNotes,
      confirmationNumber,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-orange-100 text-orange-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-bookings-title">Booking Management</h1>
            <p className="text-muted-foreground">Manage orders and manual bookings</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="manual" data-testid="tab-manual">Manual Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-orders"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordersData?.orders?.map((order) => (
                          <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                            <TableCell className="font-mono">#{order.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.user.name || "Unknown"}</p>
                                <p className="text-sm text-muted-foreground">{order.user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{order.items?.length || 0} items</TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {(order.totalCents / 100).toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {ordersData?.orders?.length || 0} of {ordersData?.total || 0} orders
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">Page {page}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (ordersData?.pages || 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search manual bookings..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-manual"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingManual ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Trip</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manualData?.bookings?.map((booking) => (
                          <TableRow key={booking.id} data-testid={`row-manual-${booking.id}`}>
                            <TableCell className="font-medium">{booking.itemName}</TableCell>
                            <TableCell>
                              <div>
                                <p>{booking.session.trip?.name || "-"}</p>
                                <p className="text-sm text-muted-foreground">{booking.session.trip?.destination}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{booking.session.user?.name || "Unknown"}</p>
                                <p className="text-sm text-muted-foreground">{booking.session.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{booking.itemType}</Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
                            <TableCell>
                              {booking.status === "pending" && (
                                <Button size="sm" onClick={() => handleCompleteBooking(booking)} data-testid={`button-complete-${booking.id}`}>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Complete
                                </Button>
                              )}
                              {booking.status === "completed" && (
                                <span className="text-sm text-muted-foreground">
                                  {booking.confirmationNumber ? `#${booking.confirmationNumber}` : "Done"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {manualData?.bookings?.length || 0} of {manualData?.total || 0} bookings
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">Page {page}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (manualData?.pages || 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Manual Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="font-medium">{selectedBooking?.itemName}</p>
              <p className="text-sm text-muted-foreground">{selectedBooking?.session.trip?.destination}</p>
            </div>
            <div className="space-y-2">
              <Label>Confirmation Number</Label>
              <Input
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                placeholder="Enter confirmation number"
                data-testid="input-confirmation-number"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Add any booking notes..."
                data-testid="input-booking-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveBooking} disabled={updateBookingMutation.isPending}>
              {updateBookingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
