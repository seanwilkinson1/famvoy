import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowLeft, Calendar, Map, Camera, Users } from "lucide-react";

interface TripModeLayoutProps {
  children: React.ReactNode;
}

const TABS = [
  { path: "", label: "Today", icon: Calendar },
  { path: "/map", label: "Map", icon: Map },
  { path: "/memories", label: "Memories", icon: Camera },
  { path: "/pod", label: "Pod", icon: Users },
] as const;

export default function TripModeLayout({ children }: TripModeLayoutProps) {
  const params = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const tripId = Number(params.id);

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!tripId,
  });

  const basePath = `/trip/${tripId}/live`;

  // Determine active tab from current location
  const activeTab = TABS.findIndex((tab) => {
    const fullPath = basePath + tab.path;
    return location === fullPath;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0D1117" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setLocation(`/trip/${tripId}`)}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-white/80">
            Trip Mode · Live
          </span>
        </div>

        <div className="w-9" /> {/* Spacer for alignment */}
      </div>

      {/* Trip name */}
      {trip && (
        <div className="px-5 pb-3">
          <h1 className="text-white font-heading text-xl font-semibold truncate">
            {trip.name}
          </h1>
          <p className="text-white/50 text-sm">{trip.destination}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24">
        {children}
      </div>

      {/* Custom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10" style={{ backgroundColor: "#0D1117" }}>
        <div className="flex items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === index;
            const fullPath = basePath + tab.path;

            return (
              <Link key={tab.label} href={fullPath}>
                <button className="flex flex-col items-center gap-1 min-w-[3rem] py-1">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-white" : "text-white/40"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isActive ? "text-white" : "text-white/40"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
