import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  ShoppingCart,
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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
    setSearch("");
  };
  const [selectedBooking, setSelectedBooking] = useState<ManualBooking | null>(null);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [bookingNotes, setBookingNotes] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");

  const { data: ordersData, isLoading: loadingOrders, error: ordersError } = useQuery<{ orders: Order[]; total: number; pages: number }>({
    queryKey: ["/api/admin/orders", { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/orders?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: activeTab === "orders",
  });

  const { data: manualData, isLoading: loadingManual, error: manualError } = useQuery<{ bookings: ManualBooking[]; total: number; pages: number }>({
    queryKey: ["/api/admin/manual-bookings", { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/manual-bookings?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
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
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Loader2 className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-bookings-title">Booking Management</h1>
            <p className="text-slate-500 mt-1">Manage orders and manual bookings</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">{ordersData?.total || 0}</span>
            <span className="text-amber-600">Total Orders</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="orders" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-manual">Manual Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {/* Filters Bar */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search orders..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-10 bg-white border-slate-200 focus:border-teal-500"
                    data-testid="input-search-orders"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {loadingOrders ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  </div>
                ) : ordersError ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <ShoppingCart className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="font-medium">Unable to load orders</p>
                    <p className="text-sm">You may not have admin permissions</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-semibold text-slate-700">Order ID</TableHead>
                          <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                          <TableHead className="font-semibold text-slate-700">Items</TableHead>
                          <TableHead className="font-semibold text-slate-700">Total</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="font-semibold text-slate-700">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordersData?.orders?.map((order) => (
                          <TableRow key={order.id} className="hover:bg-slate-50" data-testid={`row-order-${order.id}`}>
                            <TableCell className="font-mono text-slate-900">#{order.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900">{order.user?.name || "Unknown"}</p>
                                <p className="text-sm text-slate-500">{order.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-slate-900">{order.items?.length || 0}</span>
                              <span className="text-slate-500 ml-1">items</span>
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-slate-400" />
                                {(order.totalCents / 100).toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell className="text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                        {(!ordersData?.orders || ordersData.orders.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                              No orders found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                      <p className="text-sm text-slate-500">
                        Showing {ordersData?.orders?.length || 0} of {ordersData?.total || 0} orders
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600 px-2">Page {page}</span>
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => p + 1)} disabled={page >= (ordersData?.pages || 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            {/* Filters Bar */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search manual bookings..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-10 bg-white border-slate-200 focus:border-teal-500"
                    data-testid="input-search-manual"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Manual Bookings Table */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {loadingManual ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  </div>
                ) : manualError ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <Phone className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="font-medium">Unable to load bookings</p>
                    <p className="text-sm">You may not have admin permissions</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-semibold text-slate-700">Item</TableHead>
                          <TableHead className="font-semibold text-slate-700">Trip</TableHead>
                          <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                          <TableHead className="font-semibold text-slate-700">Type</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="font-semibold text-slate-700">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manualData?.bookings?.map((booking) => (
                          <TableRow key={booking.id} className="hover:bg-slate-50" data-testid={`row-manual-${booking.id}`}>
                            <TableCell className="font-medium text-slate-900">{booking.itemName}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-slate-900">{booking.session?.trip?.name || "-"}</p>
                                <p className="text-sm text-slate-500">{booking.session?.trip?.destination}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-slate-900">{booking.session?.user?.name || "Unknown"}</p>
                                <p className="text-sm text-slate-500">{booking.session?.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600">{booking.itemType}</Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
                            <TableCell>
                              {booking.status === "pending" && (
                                <Button size="sm" onClick={() => handleCompleteBooking(booking)} className="bg-teal-600 hover:bg-teal-700" data-testid={`button-complete-${booking.id}`}>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Complete
                                </Button>
                              )}
                              {booking.status === "completed" && (
                                <span className="text-sm text-slate-500">
                                  {booking.confirmationNumber ? `#${booking.confirmationNumber}` : "Done"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!manualData?.bookings || manualData.bookings.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                              No manual bookings found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                      <p className="text-sm text-slate-500">
                        Showing {manualData?.bookings?.length || 0} of {manualData?.total || 0} bookings
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600 px-2">Page {page}</span>
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => p + 1)} disabled={page >= (manualData?.pages || 1)}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Manual Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="font-semibold text-slate-900">{selectedBooking?.itemName}</p>
              <p className="text-sm text-slate-500">{selectedBooking?.session?.trip?.destination}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Confirmation Number</Label>
              <Input
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                placeholder="Enter confirmation number"
                className="border-slate-200 focus:border-teal-500"
                data-testid="input-confirmation-number"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Notes</Label>
              <Textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Add any booking notes..."
                className="border-slate-200 focus:border-teal-500"
                data-testid="input-booking-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveBooking} disabled={updateBookingMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
              {updateBookingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
