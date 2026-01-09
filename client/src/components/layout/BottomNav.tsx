import { House, Compass, Airplane, UsersThree, ChatCircle } from "@phosphor-icons/react";
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
    { href: "/", icon: House, label: "Home" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/trips", icon: Airplane, label: "Trips" },
    { href: "/pods", icon: UsersThree, label: "Pods" },
    { href: "/chat", icon: ChatCircle, label: "Chat" },
  ];

  return (
    <nav 
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/90 px-4 pb-8 pt-3 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md justify-between">
        {tabs.map((tab) => {
          const isActive = location === tab.href;
          return (
            <Link key={tab.href} href={tab.href}>
              <div className="group flex flex-col items-center gap-1 cursor-pointer">
                <div
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 -translate-y-1"
                      : "text-muted-foreground hover:text-foreground group-active:scale-90"
                  )}
                >
                  <tab.icon weight={isActive ? "fill" : "bold"} className="h-6 w-6" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
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
