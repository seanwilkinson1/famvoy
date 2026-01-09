import { useState, useEffect } from "react";
import { MagnifyingGlass, Bell, Heart, UsersThree, User, SpinnerGap, X, ArrowLeft } from "@phosphor-icons/react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import type { User as UserType, Pod } from "@shared/schema";

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
      setLocation(`/pod/${id}`);
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
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer" data-testid="link-logo">
              <div className="w-10 h-10 rounded-2xl bg-teal-gradient flex items-center justify-center shadow-sm">
                <Heart weight="fill" className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-heading font-medium text-foreground tracking-tight">FamVoy</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              data-testid="button-search"
            >
              <MagnifyingGlass weight="bold" className="w-5 h-5" />
            </button>
            
            <button 
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all relative"
              data-testid="button-notifications"
            >
              <Bell weight="bold" className="w-5 h-5" />
            </button>
            
            <Link href="/profile">
              <Avatar className="w-10 h-10 cursor-pointer ring-2 ring-border/50 hover:ring-primary/30 transition-all" data-testid="link-profile-avatar">
                <AvatarImage src={profileImage} alt="Profile" />
                <AvatarFallback className="bg-teal-gradient text-white text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-background"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <button
                onClick={handleClose}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-close-search"
              >
                <ArrowLeft weight="bold" className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <MagnifyingGlass weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search families, pods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-10 bg-muted/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all font-medium"
                  autoFocus
                  data-testid="input-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X weight="bold" className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <button
                onClick={handleClose}
                className="text-primary font-semibold text-sm"
                data-testid="button-cancel-search"
              >
                Cancel
              </button>
            </div>

            <div className="flex gap-2 px-4 py-3 border-b border-border/50">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isSearching && (
                <div className="flex items-center justify-center py-16">
                  <SpinnerGap weight="bold" className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isSearching && !searchQuery.trim() && (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                    <MagnifyingGlass weight="bold" className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Search for families to connect with or pods to join
                  </p>
                </div>
              )}

              {!isSearching && hasResults && (
                <div className="divide-y divide-border/50">
                  {filteredUsers.map((u, i) => (
                    <button
                      key={`user-${u.id}`}
                      onClick={() => handleResultClick("user", u.id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
                      data-testid={`result-user-${u.id}`}
                    >
                      <Avatar className="h-14 w-14 ring-2 ring-border/30">
                        <AvatarImage src={u.avatar || undefined} />
                        <AvatarFallback className="bg-coral-gradient text-white text-base font-semibold">
                          {u.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{u.name}</p>
                          <span className="flex-shrink-0 px-2.5 py-0.5 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">
                            Family
                          </span>
                        </div>
                        {u.location && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{u.location}</p>
                        )}
                        {u.kids && (
                          <p className="text-xs text-muted-foreground/70 mt-1">{u.kids}</p>
                        )}
                      </div>
                    </button>
                  ))}

                  {filteredPods.map((pod, i) => (
                    <button
                      key={`pod-${pod.id}`}
                      onClick={() => handleResultClick("pod", pod.id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
                      data-testid={`result-pod-${pod.id}`}
                    >
                      <div className="h-14 w-14 rounded-2xl bg-teal-gradient flex items-center justify-center ring-2 ring-border/30">
                        <UsersThree weight="fill" className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{pod.name}</p>
                          <span className="flex-shrink-0 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                            Pod
                          </span>
                        </div>
                        {pod.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{pod.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {pod.isPublic ? "Public" : "Private"} pod
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showEmptyState && (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
                    <MagnifyingGlass weight="bold" className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-foreground font-semibold text-lg mb-1">No results found</p>
                  <p className="text-sm text-muted-foreground text-center">
                    We couldn't find anything matching "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
