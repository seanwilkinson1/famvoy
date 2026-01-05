import { Home, Compass, Plane, Users, MessageCircle, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  useEffect(() => {
    const index = tabs.findIndex(tab => tab.href === location);
    if (index !== -1) setActiveIndex(index);
  }, [location]);

  return (
    <nav 
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      {/* Background with glass effect */}
      <div className="absolute inset-0 bg-white/85 backdrop-blur-xl border-t border-gray-100/50" />
      
      <div className="relative px-2 pb-8 pt-3">
        <div className="mx-auto flex max-w-md items-end justify-between">
          {tabs.slice(0, 2).map((tab, index) => {
            const isActive = location === tab.href;
            return (
              <Link key={tab.href} href={tab.href}>
                <div className="group flex flex-col items-center gap-1 cursor-pointer px-4">
                  <div
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                      isActive
                        ? "gradient-primary text-white shadow-lg shadow-primary/30"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 group-active:scale-90"
                    )}
                  >
                    <tab.icon 
                      className={cn(
                        "h-6 w-6 transition-all duration-300",
                        isActive ? "stroke-[2.5px] nav-icon-active" : "stroke-[1.5px]",
                        isActive && "fill-white/20"
                      )} 
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold transition-all duration-300",
                      isActive ? "text-primary" : "text-gray-400"
                    )}
                  >
                    {tab.label}
                  </span>
                </div>
              </Link>
            );
          })}
          
          {/* Floating Action Button - Plan Trip */}
          <div className="relative -mt-6">
            <button
              onClick={() => setLocation("/trips")}
              className="relative flex h-16 w-16 items-center justify-center rounded-full gradient-sunset text-white shadow-xl fab-pulse transition-transform active:scale-95"
              data-testid="fab-add-trip"
            >
              <Plus className="h-7 w-7 stroke-[2.5px]" />
            </button>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-500 whitespace-nowrap">
              Plan
            </span>
          </div>
          
          {tabs.slice(3).map((tab, index) => {
            const isActive = location === tab.href;
            return (
              <Link key={tab.href} href={tab.href}>
                <div className="group flex flex-col items-center gap-1 cursor-pointer px-4">
                  <div
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                      isActive
                        ? "gradient-primary text-white shadow-lg shadow-primary/30"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 group-active:scale-90"
                    )}
                  >
                    <tab.icon 
                      className={cn(
                        "h-6 w-6 transition-all duration-300",
                        isActive ? "stroke-[2.5px] nav-icon-active" : "stroke-[1.5px]",
                        isActive && "fill-white/20"
                      )} 
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold transition-all duration-300",
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
