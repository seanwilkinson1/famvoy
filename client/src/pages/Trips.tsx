import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, MapPin, Users, ChevronRight, Plane } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";

export default function Trips() {
  const { data: pods = [], isLoading: podsLoading } = useQuery({
    queryKey: ["pods"],
    queryFn: () => api.pods.getAll(),
  });

  const { data: allTrips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["allTrips", pods.map((p: any) => p.id).join(",")],
    queryFn: async () => {
      const tripPromises = pods.map((pod: any) => 
        api.trips.getByPod(pod.id).then((trips: any[]) => 
          trips.map((trip: any) => ({ ...trip, pod }))
        )
      );
      const tripArrays = await Promise.all(tripPromises);
      return tripArrays.flat();
    },
    enabled: pods.length > 0,
  });

  const isLoading = podsLoading || tripsLoading;

  const upcomingTrips = allTrips.filter(trip => 
    new Date(trip.startDate) >= new Date()
  ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const pastTrips = allTrips.filter(trip => 
    new Date(trip.endDate) < new Date()
  ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

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
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Your Trips</h1>

      {allTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plane className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No trips yet</h3>
          <p className="text-gray-500 mb-6 max-w-xs">
            Create a pod with friends or family to start planning your first adventure together!
          </p>
          <Link href="/pods">
            <button className="px-6 py-3 bg-warm-teal text-white rounded-full font-medium" data-testid="button-go-to-pods">
              Go to Pods
            </button>
          </Link>
        </div>
      ) : (
        <>
          {upcomingTrips.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-charcoal mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcomingTrips.map(trip => (
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
                {pastTrips.map(trip => (
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
  );
}
