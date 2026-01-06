import { useState, useEffect } from "react";
import { Search, Bell, Heart, Users, User, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { User as UserType, Pod } from "@shared/schema";

export function TopHeader() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const initials = user?.firstName?.[0] || user?.username?.[0] || "U";
  const profileImage = user?.imageUrl;
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleResultClick = (type: "user" | "pod", id: number) => {
    setSearchOpen(false);
    setSearchQuery("");
    if (type === "user") {
      setLocation(`/family/${id}`);
    } else {
      setLocation(`/pods/${id}`);
    }
  };

  const hasResults = userResults.length > 0 || podResults.length > 0;
  const showEmptyState = searchQuery.trim() && !isSearching && !hasResults;

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

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search families or pods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
                data-testid="input-search"
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}

            {!isSearching && hasResults && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {userResults.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Families
                    </h3>
                    <div className="space-y-1">
                      {userResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleResultClick("user", u.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                          data-testid={`result-user-${u.id}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatar || undefined} />
                            <AvatarFallback className="bg-warm-coral text-white text-xs">
                              {u.name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{u.name}</p>
                            {u.location && (
                              <p className="text-xs text-gray-500 truncate">{u.location}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {podResults.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Pods
                    </h3>
                    <div className="space-y-1">
                      {podResults.map((pod) => (
                        <button
                          key={pod.id}
                          onClick={() => handleResultClick("pod", pod.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                          data-testid={`result-pod-${pod.id}`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-warm-teal to-warm-teal/70 flex items-center justify-center">
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{pod.name}</p>
                            {pod.description && (
                              <p className="text-xs text-gray-500 truncate">{pod.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showEmptyState && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found for "{searchQuery}"</p>
              </div>
            )}

            {!searchQuery.trim() && !isSearching && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Start typing to search for families or pods</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
