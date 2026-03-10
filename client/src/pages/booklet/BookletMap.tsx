import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function BookletMap() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const tripId = parseInt(id!);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId, "booklet"],
    queryFn: () => api.booklet.get(tripId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF7F2]">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!data) return null;

  const { chapters } = data;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF7F2]/80 backdrop-blur-sm border-b border-stone-200/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(`/trips/${tripId}/booklet`)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <span className="text-sm font-medium text-stone-600">Trip Map</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Map placeholder - Google Maps SDK can be integrated later */}
        <div className="mt-4 rounded-xl overflow-hidden bg-stone-200 aspect-square flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-stone-400 mx-auto mb-2" />
            <p className="text-stone-500 text-sm">Interactive map coming soon</p>
            <p className="text-stone-400 text-xs mt-1">
              {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} across your trip
            </p>
          </div>
        </div>

        {/* Chapter location list */}
        <div className="mt-6 space-y-2">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Locations
          </h3>
          {chapters.map((chapter: any) => (
            <div
              key={chapter.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone-100"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: chapter.accentColor }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-800">Day {chapter.dayNumber}: {chapter.title}</p>
                <p className="text-xs text-stone-500">{chapter.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
