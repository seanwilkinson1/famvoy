import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, ChevronLeft, ChevronRight, Filter, MapPin, Calendar, Eye, Map } from "lucide-react";
import { Link } from "wouter";

interface Trip {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  itemCount: number;
  user: {
    id: number;
    name: string | null;
    email: string | null;
  };
  conciergeRequest: {
    id: number;
    status: string;
  } | null;
  createdAt: string;
}

export default function AdminTrips() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<{ trips: Trip[]; total: number; pages: number }>({
    queryKey: ["/api/admin/trips", { search, page, status: statusFilter }],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confirmed</Badge>;
      case "confirming":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Confirming</Badge>;
      case "draft":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConciergeStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-slate-400">-</span>;
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Pending</Badge>;
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
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-trips-title">Trip Management</h1>
            <p className="text-slate-500 mt-1">View and manage all trips</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg">
            <Map className="h-5 w-5" />
            <span className="font-semibold">{data?.total || 0}</span>
            <span className="text-emerald-600">Total Trips</span>
          </div>
        </div>

        {/* Filters Bar */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search trips..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-200 focus:border-teal-500"
                  data-testid="input-search-trips"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 h-10 bg-white border-slate-200" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trips</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirming">Confirming</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trips Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <Map className="h-12 w-12 mb-4 text-slate-300" />
                <p className="font-medium">Unable to load trips</p>
                <p className="text-sm">You may not have admin permissions</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">Trip</TableHead>
                      <TableHead className="font-semibold text-slate-700">User</TableHead>
                      <TableHead className="font-semibold text-slate-700">Dates</TableHead>
                      <TableHead className="font-semibold text-slate-700">Items</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700">Concierge</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.trips?.map((trip) => (
                      <TableRow key={trip.id} className="hover:bg-slate-50" data-testid={`row-trip-${trip.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{trip.name}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {trip.destination}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{trip.user?.name || "Unknown"}</p>
                            <p className="text-sm text-slate-500">{trip.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-900 font-medium">{trip.itemCount}</span>
                          <span className="text-slate-500 ml-1">items</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(trip.status)}</TableCell>
                        <TableCell>
                          {getConciergeStatusBadge(trip.conciergeRequest?.status || null)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/trip/${trip.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900" data-testid={`button-view-trip-${trip.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.trips || data.trips.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                          No trips found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Showing {data?.trips?.length || 0} of {data?.total || 0} trips
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-600 px-2">Page {page} of {data?.pages || 1}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= (data?.pages || 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
