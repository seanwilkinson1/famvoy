import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Calendar, MapPin, Users, ChevronRight, Plane, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";

export default function Trips() {
  const [, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tripName, setTripName] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const queryClient = useQueryClient();

  const { data: userTrips = [], isLoading } = useQuery({
    queryKey: ["userTrips"],
    queryFn: () => api.users.getMyTrips(),
  });

  const createTripMutation = useMutation({
    mutationFn: () => api.trips.create({
      name: tripName,
      destination: tripDestination,
      startDate: tripStartDate,
      endDate: tripEndDate,
    }),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ["userTrips"] });
      setShowCreateModal(false);
      setTripName("");
      setTripDestination("");
      setTripStartDate("");
      setTripEndDate("");
      setLocation(`/trip/${trip.id}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      confirming: "bg-yellow-100 text-yellow-700",
      confirmed: "bg-green-100 text-green-700",
      booking_in_progress: "bg-blue-100 text-blue-700",
      booked: "bg-purple-100 text-purple-700",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      confirming: "Confirming",
      confirmed: "Confirmed",
      booking_in_progress: "Booking",
      booked: "Booked",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const upcomingTrips = userTrips.filter((trip: any) => 
    new Date(trip.startDate) >= new Date()
  ).sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const pastTrips = userTrips.filter((trip: any) => 
    new Date(trip.endDate) < new Date()
  ).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 pt-14 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-charcoal font-heading">Your Trips</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white active:scale-95 transition-transform"
            data-testid="button-create-trip"
          >
            <Plus className="h-4 w-4" />
            New Trip
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {userTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plane className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No trips yet</h3>
            <p className="text-gray-500 mb-6 max-w-xs">
              Start planning your first family adventure!
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-full font-medium"
              data-testid="button-start-planning"
            >
              Plan a Trip
            </button>
          </div>
        ) : (
          <>
            {upcomingTrips.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-charcoal mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {upcomingTrips.map((trip: any) => (
                    <Link key={trip.id} href={`/trip/${trip.id}`}>
                      <div 
                        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        data-testid={`card-trip-${trip.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-charcoal">{trip.name}</h3>
                              {getStatusBadge(trip.status)}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="w-4 h-4" />
                              <span>{trip.destination || "No destination set"}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                            </span>
                          </div>
                          {trip.pod && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{trip.pod.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {pastTrips.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-charcoal mb-3">Past Trips</h2>
                <div className="space-y-3">
                  {pastTrips.map((trip: any) => (
                    <Link key={trip.id} href={`/trip/${trip.id}`}>
                      <div 
                        className="bg-gray-50 rounded-2xl p-4 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors opacity-75"
                        data-testid={`card-trip-past-${trip.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-charcoal">{trip.name}</h3>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="w-4 h-4" />
                              <span>{trip.destination || "No destination set"}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-heading text-lg font-bold">Plan a New Trip</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="rounded-full bg-gray-100 p-2"
                data-testid="button-close-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
                <input
                  type="text"
                  placeholder="e.g., Summer Road Trip"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  data-testid="input-trip-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input
                  type="text"
                  placeholder="e.g., Hawaii"
                  value={tripDestination}
                  onChange={(e) => setTripDestination(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  data-testid="input-trip-destination"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={tripStartDate}
                    onChange={(e) => setTripStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={tripEndDate}
                    onChange={(e) => setTripEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              <button
                onClick={() => createTripMutation.mutate()}
                disabled={!tripName || !tripDestination || !tripStartDate || !tripEndDate || createTripMutation.isPending}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                data-testid="button-create-trip-submit"
              >
                {createTripMutation.isPending ? "Creating..." : "Create Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
