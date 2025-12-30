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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plane,
  Utensils,
  MapPin,
  Calendar,
  Users,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface ConciergeBooking {
  id: number;
  tripId: number;
  currentStep: string;
  isComplete: boolean;
  completedAt: string | null;
  createdAt: string;
  flightsSkipped: boolean;
  flightPreferences: Record<string, any> | null;
  calendarExported: boolean;
  trip: {
    id: number;
    name: string;
    destination: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
  } | null;
  customer: {
    id: number;
    name: string | null;
    email: string | null;
    avatar: string | null;
  } | null;
  restaurants: Array<{
    id: number;
    title: string;
    description: string | null;
    time: string | null;
    reservationDate: string | null;
    reservationTime: string | null;
    partySize: number | null;
    specialRequests: string | null;
    requiresManualBooking: boolean | null;
    openTableUrl: string | null;
  }>;
  excursions: Array<{
    id: number;
    title: string;
    description: string | null;
    time: string | null;
    requiresManualBooking: boolean | null;
    bookingPlatform: string | null;
  }>;
  totalItems: number;
  aiChatComplete: boolean;
  chatMessageCount: number;
  aiSuggestions: Array<{
    type: string;
    title: string;
    description: string | null;
    approved: boolean | null;
    agentReviewed: boolean | null;
    agentNotes: string | null;
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
  const [activeTab, setActiveTab] = useState("concierge");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedBookings, setExpandedBookings] = useState<Set<number>>(new Set());

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
    setSearch("");
  };

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedBookings);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedBookings(newExpanded);
  };

  const [selectedBooking, setSelectedBooking] = useState<ManualBooking | null>(null);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [bookingNotes, setBookingNotes] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");

  const { data: conciergeData, isLoading: loadingConcierge, error: conciergeError } = useQuery<{ bookings: ConciergeBooking[]; total: number; pages: number }>({
    queryKey: ["/api/admin/concierge-bookings", { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/concierge-bookings?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch concierge bookings");
      return res.json();
    },
    enabled: activeTab === "concierge",
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

  const formatTripDates = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return "No dates";
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    if (end) {
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    }
    return format(start, "MMM d, yyyy");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-bookings-title">Booking Management</h1>
            <p className="text-slate-500 mt-1">Manage concierge bookings and manual reservations</p>
          </div>
          <div className="flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-lg">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">{conciergeData?.total || 0}</span>
            <span className="text-teal-600">Concierge Bookings</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="concierge" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-concierge">
              <Sparkles className="h-4 w-4 mr-2" />
              Concierge Bookings
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-manual">
              <Phone className="h-4 w-4 mr-2" />
              Manual Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="concierge" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search by trip, destination, or customer..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-10 bg-white border-slate-200 focus:border-teal-500"
                    data-testid="input-search-concierge"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {loadingConcierge ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  </div>
                ) : conciergeError ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <Sparkles className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="font-medium">Unable to load concierge bookings</p>
                    <p className="text-sm">You may not have admin permissions</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100">
                      {conciergeData?.bookings?.map((booking) => (
                        <Collapsible key={booking.id} open={expandedBookings.has(booking.id)}>
                          <div className="p-4 hover:bg-slate-50" data-testid={`row-concierge-${booking.id}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                                  <MapPin className="h-6 w-6 text-teal-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{booking.trip?.name || "Unknown Trip"}</p>
                                  <p className="text-sm text-slate-500">{booking.trip?.destination}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="font-medium text-slate-900">{booking.customer?.name || "Unknown"}</p>
                                  <p className="text-sm text-slate-500">{booking.customer?.email}</p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-slate-600">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm">{formatTripDates(booking.trip?.startDate || null, booking.trip?.endDate || null)}</span>
                                  </div>
                                  <p className="text-sm text-slate-500">{booking.totalItems} items</p>
                                </div>
                                <div>
                                  {booking.isComplete ? (
                                    <Badge className="bg-emerald-100 text-emerald-700">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-700">
                                      <Clock className="h-3 w-3 mr-1" />In Progress
                                    </Badge>
                                  )}
                                </div>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => toggleExpanded(booking.id)} data-testid={`button-expand-${booking.id}`}>
                                    {expandedBookings.has(booking.id) ? (
                                      <ChevronUp className="h-5 w-5" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </div>
                          </div>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
                                <Card className="border-slate-200">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                      <Plane className="h-4 w-4 text-blue-500" />
                                      Flight Preferences
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    {booking.flightsSkipped ? (
                                      <p className="text-sm text-slate-500">Flights skipped</p>
                                    ) : booking.flightPreferences ? (
                                      <div className="text-sm space-y-1">
                                        {Object.entries(booking.flightPreferences).map(([key, value]) => (
                                          <div key={key} className="flex justify-between">
                                            <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                                            <span className="text-slate-900">{String(value)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-500">No preferences set</p>
                                    )}
                                  </CardContent>
                                </Card>

                                <Card className="border-slate-200">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                      <Utensils className="h-4 w-4 text-orange-500" />
                                      Restaurants to Book ({booking.restaurants.length})
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    {booking.restaurants.length === 0 ? (
                                      <p className="text-sm text-slate-500">No restaurants selected</p>
                                    ) : (
                                      <div className="space-y-3">
                                        {booking.restaurants.map((restaurant) => (
                                          <div key={restaurant.id} className="p-2 bg-white rounded border border-slate-100">
                                            <p className="font-medium text-slate-900 text-sm">{restaurant.title}</p>
                                            <div className="mt-1 text-xs space-y-0.5">
                                              {restaurant.time && (
                                                <p className="text-slate-500">Time: {restaurant.time}</p>
                                              )}
                                              {restaurant.partySize && (
                                                <p className="text-slate-500 flex items-center gap-1">
                                                  <Users className="h-3 w-3" /> Party of {restaurant.partySize}
                                                </p>
                                              )}
                                              {restaurant.specialRequests && (
                                                <p className="text-slate-600 italic">"{restaurant.specialRequests}"</p>
                                              )}
                                              {restaurant.openTableUrl && (
                                                <a href={restaurant.openTableUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline flex items-center gap-1">
                                                  <ExternalLink className="h-3 w-3" /> OpenTable
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                <Card className="border-slate-200">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-green-500" />
                                      Excursions to Book ({booking.excursions.length})
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    {booking.excursions.length === 0 ? (
                                      <p className="text-sm text-slate-500">No excursions selected</p>
                                    ) : (
                                      <div className="space-y-3">
                                        {booking.excursions.map((excursion) => (
                                          <div key={excursion.id} className="p-2 bg-white rounded border border-slate-100">
                                            <p className="font-medium text-slate-900 text-sm">{excursion.title}</p>
                                            {excursion.time && (
                                              <p className="text-xs text-slate-500 mt-1">Time: {excursion.time}</p>
                                            )}
                                            {excursion.bookingPlatform && (
                                              <p className="text-xs text-slate-500">Platform: {excursion.bookingPlatform}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>

                              {booking.aiSuggestions.length > 0 && (
                                <Card className="mt-4 border-slate-200">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                      <MessageSquare className="h-4 w-4 text-purple-500" />
                                      AI Suggestions Approved ({booking.aiSuggestions.length})
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    <div className="space-y-2">
                                      {booking.aiSuggestions.map((suggestion, idx) => (
                                        <div key={idx} className="p-2 bg-white rounded border border-slate-100">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">{suggestion.type}</Badge>
                                            <span className="font-medium text-sm text-slate-900">{suggestion.title}</span>
                                          </div>
                                          {suggestion.description && (
                                            <p className="text-xs text-slate-500 mt-1">{suggestion.description}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                                <span>Created: {format(new Date(booking.createdAt), "MMM d, yyyy h:mm a")}</span>
                                {booking.completedAt && (
                                  <span>Completed: {format(new Date(booking.completedAt), "MMM d, yyyy h:mm a")}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {booking.chatMessageCount} AI messages
                                </span>
                                {booking.calendarExported && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />Calendar Exported
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                      {(!conciergeData?.bookings || conciergeData.bookings.length === 0) && (
                        <div className="h-32 flex items-center justify-center text-slate-500">
                          No concierge bookings found
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                      <p className="text-sm text-slate-500">
                        Showing {conciergeData?.bookings?.length || 0} of {conciergeData?.total || 0} bookings
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600 px-2">Page {page}</span>
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => p + 1)} disabled={page >= (conciergeData?.pages || 1)}>
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
