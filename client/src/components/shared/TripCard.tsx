import { MapPin, Calendar, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { ImageCarousel } from "@/components/ui/image-carousel";

interface TripCardProps {
  trip: {
    id: number;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    status: string;
    itemCount?: number;
    coverImage?: string;
    activatedAt?: string | null;
  };
  className?: string;
  horizontal?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  planning: "bg-blue-50 text-blue-600 border-blue-200",
  active: "bg-emerald-50 text-emerald-600 border-emerald-200",
  completed: "bg-gray-100 text-gray-500",
  published: "bg-purple-50 text-purple-600 border-purple-200",
};

function formatDateRange(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

export function TripCard({ trip, className, horizontal = false }: TripCardProps) {
  const images = trip.coverImage ? [trip.coverImage] : [];
  const isLive = trip.status === "active" && trip.activatedAt;

  return (
    <Link href={`/trip/${trip.id}`}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl bg-card cursor-pointer transition-all duration-300 hover:-translate-y-0.5",
          horizontal ? "w-[260px] flex-shrink-0" : "w-full",
          className
        )}
        data-testid={`card-trip-${trip.id}`}
      >
        {/* Image — only show when a real cover image exists */}
        {images.length > 0 && (
          <div className="relative">
            <ImageCarousel
              images={images}
              alt={trip.destination}
              aspectRatio={horizontal ? "h-36" : "aspect-[16/10]"}
            />

            {/* Live indicator */}
            {isLive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium z-10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                Live
              </div>
            )}
          </div>
        )}

        {/* Live indicator when no image */}
        {images.length === 0 && isLive && (
          <div className="px-4 pt-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              Live
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-1.5">
          {/* Location */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {trip.destination}
          </p>

          {/* Trip name */}
          <h3 className="font-semibold text-[15px] leading-snug text-foreground line-clamp-1">
            {trip.name}
          </h3>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateRange(trip.startDate, trip.endDate)}
            </span>
            {trip.itemCount !== undefined && trip.itemCount > 0 && (
              <span className="flex items-center gap-1">
                <Route className="h-3.5 w-3.5" />
                {trip.itemCount} stops
              </span>
            )}
          </div>

          {/* Status badge */}
          <div className="pt-1.5">
            <span className={cn(
              "inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium border capitalize",
              STATUS_STYLES[trip.status] || STATUS_STYLES.draft,
            )}>
              {trip.status}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
