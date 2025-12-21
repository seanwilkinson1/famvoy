import { Home, Compass, Plane, Users, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/trips", icon: Plane, label: "Trips" },
    { href: "/pods", icon: Users, label: "Pods" },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/80 px-6 pb-8 pt-4 backdrop-blur-lg md:pb-4">
      <div className="mx-auto flex max-w-md justify-between">
        {tabs.map((tab) => {
          const isActive = location === tab.href;
          return (
            <Link key={tab.href} href={tab.href}>
              <div className="group flex flex-col items-center gap-1 cursor-pointer">
                <div
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-y-[-4px]"
                      : "text-gray-400 hover:text-gray-600 group-active:scale-90"
                  )}
                >
                  <tab.icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-gray-400"
                  )}
                >
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
