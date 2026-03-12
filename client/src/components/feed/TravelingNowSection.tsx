import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { MapPin, ChevronRight } from "lucide-react";
import { ImageCarousel } from "@/components/ui/image-carousel";

export function TravelingNowSection() {
  const { data: trips = [] } = useQuery({
    queryKey: ["/api/feed/traveling-now"],
    queryFn: () => api.feedTravelingNow.get(),
  });

  if (trips.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-xl font-medium text-foreground">Traveling Now</h2>
        <button className="text-sm font-medium text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
          See all <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="overflow-x-auto overflow-y-visible -mx-6 no-scrollbar">
        <div className="flex w-max space-x-4 pb-4 px-6">
          {trips.map((trip: any) => (
            <Link key={trip.id} href={`/trip/${trip.id}`}>
              <div className="group w-[220px] flex-shrink-0 overflow-hidden rounded-2xl bg-card cursor-pointer transition-all duration-300 hover:-translate-y-0.5">
                {/* Image */}
                <div className="relative">
                  <ImageCarousel
                    images={trip.coverImage ? [trip.coverImage] : []}
                    alt={trip.destination}
                    aspectRatio="h-32"
                  />
                  {/* Live indicator */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium z-10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    Live
                  </div>
                </div>

                {/* Content */}
                <div className="p-3.5 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {trip.destination}
                  </p>
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {trip.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {trip.creator?.firstName || "Someone"} is traveling
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
