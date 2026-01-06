import { useState, useEffect } from "react";
import { Search, Bell, Heart, Users, User, Loader2, X, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import type { User as UserType, Pod } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

type SearchTab = "all" | "families" | "pods";

export function TopHeader() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const initials = user?.firstName?.[0] || user?.username?.[0] || "U";
  const profileImage = user?.imageUrl;
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [userResults, setUserResults] = useState<UserType[]>([]);
  const [podResults, setPodResults] = useState<Pod[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setUserResults([]);
      setPodResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [users, pods] = await Promise.all([
          api.families.search(searchQuery),
          api.pods.search(searchQuery),
        ]);
        setUserResults(users);
        setPodResults(pods);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClose = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setActiveTab("all");
  };

  const handleResultClick = (type: "user" | "pod", id: number) => {
    handleClose();
    if (type === "user") {
      setLocation(`/family/${id}`);
    } else {
      setLocation(`/pods/${id}`);
    }
  };

  const filteredUsers = activeTab === "pods" ? [] : userResults;
  const filteredPods = activeTab === "families" ? [] : podResults;
  const hasResults = filteredUsers.length > 0 || filteredPods.length > 0;
  const showEmptyState = searchQuery.trim() && !isSearching && !hasResults;

  const tabs: { id: SearchTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "families", label: "Families" },
    { id: "pods", label: "Pods" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-warm-teal to-warm-teal/80 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-outfit font-bold text-charcoal">FamVoy</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
              data-testid="button-search"
            >
              <Search className="w-5 h-5" />
            </button>
            
            <button 
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors relative"
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5" />
            </button>
            
            <Link href="/profile">
              <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-gray-100" data-testid="link-profile-avatar">
                <AvatarImage src={profileImage} alt="Profile" />
                <AvatarFallback className="bg-warm-teal text-white text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-white"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <button
                  onClick={handleClose}
                  className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
                  data-testid="button-close-search"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search families, pods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-warm-teal/30 focus:bg-white transition-all"
                    autoFocus
                    data-testid="input-search"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <button
                  onClick={handleClose}
                  className="text-warm-teal font-medium text-sm"
                  data-testid="button-cancel-search"
                >
                  Cancel
                </button>
              </div>

              <div className="flex gap-2 px-4 py-2 border-b border-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-charcoal text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                {isSearching && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                )}

                {!isSearching && !searchQuery.trim() && (
                  <div className="px-4 py-6">
                    <p className="text-sm text-gray-500 text-center">
                      Search for families to connect with or pods to join
                    </p>
                  </div>
                )}

                {!isSearching && hasResults && (
                  <div className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <motion.button
                        key={`user-${u.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleResultClick("user", u.id)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                        data-testid={`result-user-${u.id}`}
                      >
                        <Avatar className="h-12 w-12 ring-2 ring-gray-100">
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-warm-coral to-warm-coral/70 text-white text-sm font-medium">
                            {u.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                            <span className="flex-shrink-0 px-2 py-0.5 bg-warm-coral/10 text-warm-coral text-xs font-medium rounded-full">
                              Family
                            </span>
                          </div>
                          {u.location && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">{u.location}</p>
                          )}
                          {u.kids && (
                            <p className="text-xs text-gray-400 mt-1">{u.kids}</p>
                          )}
                        </div>
                      </motion.button>
                    ))}

                    {filteredPods.map((pod) => (
                      <motion.button
                        key={`pod-${pod.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleResultClick("pod", pod.id)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                        data-testid={`result-pod-${pod.id}`}
                      >
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warm-teal to-warm-teal/70 flex items-center justify-center ring-2 ring-gray-100">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">{pod.name}</p>
                            <span className="flex-shrink-0 px-2 py-0.5 bg-warm-teal/10 text-warm-teal text-xs font-medium rounded-full">
                              Pod
                            </span>
                          </div>
                          {pod.description && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">{pod.description}</p>
                          )}
                          {pod.isPublic !== undefined && (
                            <p className="text-xs text-gray-400 mt-1">
                              {pod.isPublic ? "Public" : "Private"} pod
                            </p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {showEmptyState && (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No results found</p>
                    <p className="text-sm text-gray-500 text-center">
                      We couldn't find anything matching "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
