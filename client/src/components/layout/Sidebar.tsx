import { Home, Search, MapPin, User, Plus, MessageCircle, Bell, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/clerk-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/explore", icon: Search, label: "Explore" },
    { href: "/create", icon: Plus, label: "Create" },
    { href: "/trips", icon: MapPin, label: "Trips" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-background border-r border-border/50 h-screen sticky top-0">
      {/* Wordmark */}
      <div className="px-6 py-5 flex items-center justify-between">
        <Link href="/">
          <span className="font-heading text-2xl font-semibold text-foreground tracking-tight cursor-pointer">
            FamVoy
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/chat">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <MessageCircle className="w-5 h-5" />
            </button>
          </Link>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.href === "/"
            ? location === "/"
            : location.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200",
                  isActive
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className="h-5 w-5"
                  fill={isActive ? "currentColor" : "none"}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-2 border-t border-border/50">
        <Link href="/settings">
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200",
              location === "/settings"
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="text-sm font-medium">Settings</span>
          </div>
        </Link>
      </div>

      {/* User profile */}
      {user && (
        <div className="px-3 py-4 border-t border-border/50">
          <Link href="/profile">
            <div className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-muted cursor-pointer transition-colors">
              <img
                src={user.imageUrl}
                alt={user.fullName || "User"}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-border/50"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate text-sm">
                  {user.fullName || user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
