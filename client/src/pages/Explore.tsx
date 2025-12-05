import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { FamilySwipeCard, SwipeButtons } from "@/components/shared/FamilySwipeCard";
import { MatchModal } from "@/components/shared/MatchModal";
import { Search, Navigation, Map, Users, Compass, X, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { cn } from "@/lib/utils";
import mapBg from "@assets/generated_images/stylized_map_background_for_explore_screen.png";
import type { User } from "@shared/schema";

type ExploreTab = "map" | "discover" | "connections";

export default function Explore() {
  const [activeTab, setActiveTab] = useState<ExploreTab>("map");
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentFamilyIndex, setCurrentFamilyIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedFamily, setMatchedFamily] = useState<User | null>(null);
  
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: experiences = [], isLoading: loadingExperiences } = useQuery({
    queryKey: ["experiences"],
    queryFn: api.experiences.getAll,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["experienceSearch", searchQuery],
    queryFn: () => api.experiences.search(searchQuery),
    enabled: searchQuery.length > 1,
  });

  const { data: discoverFamilies = [], isLoading: loadingFamilies } = useQuery({
    queryKey: ["discoverFamilies", currentUser?.id],
    queryFn: () => currentUser ? api.families.discover(currentUser.id) : [],
    enabled: !!currentUser && activeTab === "discover",
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["connections", currentUser?.id],
    queryFn: () => currentUser ? api.users.getMatches(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const swipeMutation = useMutation({
    mutationFn: async ({ swipedUserId, liked }: { swipedUserId: number; liked: boolean }) => {
      if (!currentUser) throw new Error("No user");
      return api.families.swipe(currentUser.id, swipedUserId, liked);
    },
    onSuccess: (result, variables) => {
      if (result.matched) {
        const family = discoverFamilies[currentFamilyIndex];
        setMatchedFamily(family);
        setShowMatch(true);
        queryClient.invalidateQueries({ queryKey: ["connections"] });
      }
      setCurrentFamilyIndex((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["discoverFamilies"] });
    },
  });

  const handleSwipe = (liked: boolean) => {
    const family = discoverFamilies[currentFamilyIndex];
    if (family) {
      swipeMutation.mutate({ swipedUserId: family.id, liked });
    }
  };

  const formattedExperiences = (searchQuery.length > 1 ? searchResults : experiences).map(exp => 
    formatExperience(exp, "Family", "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400")
  );

  const currentFamily = discoverFamilies[currentFamilyIndex];
  const nextFamily = discoverFamilies[currentFamilyIndex + 1];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100">
      {/* Tab Selector */}
      <div className="absolute top-14 left-0 right-0 z-40 px-4">
        <div className="flex rounded-2xl bg-white/90 backdrop-blur-md p-1.5 shadow-lg">
          {[
            { id: "map" as const, icon: Map, label: "Explore" },
            { id: "discover" as const, icon: Users, label: "Discover" },
            { id: "connections" as const, icon: Compass, label: "Friends" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              )}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map View */}
      <AnimatePresence mode="wait">
        {activeTab === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Map Background */}
            <div className="absolute inset-0 h-full w-full">
              <img src={mapBg} alt="Map" className="h-full w-full object-cover opacity-80" />
              <div className="absolute left-1/4 top-1/3 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-white/50 animate-pulse" />
              <div className="absolute right-1/3 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary ring-4 ring-white/50" />
            </div>

            {/* Search Overlay */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-32 left-4 right-4 z-50"
                >
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search experiences, places..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl bg-white py-4 pl-12 pr-12 text-base shadow-lg outline-none placeholder:text-gray-400"
                      autoFocus
                      data-testid="input-search"
                    />
                    <button
                      onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-gray-100 p-1"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Map Overlays */}
            <div className="absolute right-4 top-32 flex flex-col gap-3">
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  "rounded-full p-3 shadow-lg shadow-black/5 active:scale-90 transition-transform",
                  showSearch ? "bg-primary text-white" : "bg-white text-gray-700"
                )}
                data-testid="button-search"
              >
                <Search className="h-6 w-6" />
              </button>
              <button className="rounded-full bg-white p-3 shadow-lg shadow-black/5 active:scale-90 transition-transform" data-testid="button-locate">
                <Navigation className="h-6 w-6 text-primary fill-primary" />
              </button>
            </div>

            {/* Bottom Sheet */}
            <motion.div
              drag="y"
              dragConstraints={{ top: -500, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y < -100) setIsExpanded(true);
                if (info.offset.y > 100) setIsExpanded(false);
              }}
              animate={{ height: isExpanded ? "75%" : "180px" }}
              className="absolute bottom-0 left-0 right-0 z-30 rounded-t-[32px] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
            >
              <div className="flex justify-center pt-3 pb-2" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="h-1.5 w-12 rounded-full bg-gray-200" />
              </div>

              <div className="px-6 pt-2 h-full overflow-hidden flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    {searchQuery ? `Results for "${searchQuery}"` : `${experiences.length} experiences nearby`}
                  </h3>
                  <button className="text-xs font-medium text-primary uppercase tracking-wide" data-testid="button-filter">Filter</button>
                </div>

                <div className="flex-1 overflow-y-auto pb-32 space-y-4 no-scrollbar">
                  {loadingExperiences ? (
                    <div className="text-center py-8 text-gray-400">Loading...</div>
                  ) : (
                    formattedExperiences.map((exp) => (
                      <ExperienceCard key={exp.id} experience={exp} className="shadow-none border border-gray-100" />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Discover View (Swipe) */}
        {activeTab === "discover" && (
          <motion.div
            key="discover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pt-28 pb-24 px-4"
          >
            <div className="relative h-full w-full max-w-sm mx-auto">
              {loadingFamilies ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading families...
                </div>
              ) : currentFamilyIndex >= discoverFamilies.length ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Users className="h-10 w-10 text-gray-300" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-gray-900 mb-2">No more families</h3>
                  <p className="text-sm text-gray-500">Check back later for new families nearby!</p>
                </div>
              ) : (
                <>
                  {/* Card Stack */}
                  <div className="relative h-[70%]">
                    {nextFamily && (
                      <div className="absolute inset-0 scale-95 opacity-50">
                        <FamilySwipeCard family={nextFamily} onSwipe={() => {}} isTop={false} />
                      </div>
                    )}
                    {currentFamily && (
                      <FamilySwipeCard
                        key={currentFamily.id}
                        family={currentFamily}
                        onSwipe={handleSwipe}
                        isTop={true}
                      />
                    )}
                  </div>

                  {/* Swipe Buttons */}
                  <SwipeButtons onSwipe={handleSwipe} disabled={swipeMutation.isPending} />
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Connections View */}
        {activeTab === "connections" && (
          <motion.div
            key="connections"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pt-28 pb-24 px-6 overflow-y-auto no-scrollbar"
          >
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Your Family Friends</h2>
            <p className="text-sm text-gray-500 mb-6">Families you've connected with</p>

            {connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">No connections yet</h3>
                <p className="text-sm text-gray-500 mb-4">Start swiping to find families near you!</p>
                <button
                  onClick={() => setActiveTab("discover")}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white"
                >
                  Discover Families
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map((family) => (
                  <div
                    key={family.id}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
                    data-testid={`card-connection-${family.id}`}
                  >
                    <img
                      src={family.avatar}
                      alt={family.name}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
                    />
                    <div className="flex-1">
                      <h3 className="font-heading font-bold text-gray-900">{family.name}</h3>
                      <p className="text-sm text-gray-500">{family.location}</p>
                      <div className="mt-1 flex gap-1">
                        {family.interests.slice(0, 2).map((i) => (
                          <span key={i} className="text-xs text-primary font-medium">{i}</span>
                        ))}
                      </div>
                    </div>
                    <button className="rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                      Message
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Modal */}
      <MatchModal
        isOpen={showMatch}
        onClose={() => setShowMatch(false)}
        matchedFamily={matchedFamily}
        currentUser={currentUser || null}
      />
    </div>
  );
}
