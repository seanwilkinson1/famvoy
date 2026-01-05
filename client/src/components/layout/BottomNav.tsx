import { Home, Compass, Plane, Users, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export function BottomNav() {
  const [location] = useLocation();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current) {
        const height = navRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--bottom-nav-height', `${height}px`);
      }
    };
    
    updateNavHeight();
    window.addEventListener('resize', updateNavHeight);
    return () => window.removeEventListener('resize', updateNavHeight);
  }, []);

  const tabs = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/trips", icon: Plane, label: "Trips" },
    { href: "/pods", icon: Users, label: "Pods" },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
  ];

  return (
    <nav 
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200"
    >
      <div className="px-4 pb-8 pt-2">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {tabs.map((tab) => {
            const isActive = location === tab.href;
            return (
              <Link key={tab.href} href={tab.href}>
                <div className="flex flex-col items-center gap-1 cursor-pointer px-3 py-1">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <tab.icon className="h-5 w-5" />
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
      </div>
    </nav>
  );
}
