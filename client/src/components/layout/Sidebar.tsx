import { Home, Compass, Plane, Users, MessageCircle, Settings, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/clerk-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();

  const mainTabs = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/trips", icon: Plane, label: "Trips" },
    { href: "/pods", icon: Users, label: "Pods" },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
  ];

  const bottomTabs = [
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0">
      <div className="p-6 border-b border-gray-100">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="font-heading text-xl font-bold text-charcoal">FamVoy</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {mainTabs.map((tab) => {
          const isActive = location === tab.href || 
            (tab.href !== "/" && location.startsWith(tab.href));
          return (
            <Link key={tab.href} href={tab.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-gray-600 hover:bg-gray-50 hover:text-charcoal"
                )}
              >
                <tab.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span className="font-medium">{tab.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-1">
        {bottomTabs.map((tab) => {
          const isActive = location === tab.href;
          return (
            <Link key={tab.href} href={tab.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-gray-600 hover:bg-gray-50 hover:text-charcoal"
                )}
              >
                <tab.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span className="font-medium">{tab.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="p-4 border-t border-gray-100">
          <Link href="/profile">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
              <img
                src={user.imageUrl}
                alt={user.fullName || "User"}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-charcoal truncate text-sm">
                  {user.fullName || user.primaryEmailAddress?.emailAddress}
                </p>
                <p className="text-xs text-gray-400 truncate">View profile</p>
              </div>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
