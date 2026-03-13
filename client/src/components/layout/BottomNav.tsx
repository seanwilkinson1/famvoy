import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Home, Search, Plus, MapPin, User, Plane, Users, Camera } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/explore", icon: Search, label: "Explore" },
  { href: "create", icon: Plus, label: "" }, // center button, no route
  { href: "/trips", icon: MapPin, label: "Trips" },
  { href: "/profile", icon: User, label: "Profile" },
];

const createActions = [
  { href: "/trips", icon: Plane, label: "Plan a Trip" },
  { href: "/create", icon: MapPin, label: "Create Experience" },
  { href: "/pods?create=true", icon: Users, label: "Create a Pod" },
  { href: "/trips?log=true", icon: Camera, label: "Log a Memory" },
];

export function BottomNav() {
  const [location] = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  return (
    <>
      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-2 pb-1">
          {tabs.map((tab) => {
            const isCenter = tab.href === "create";

            if (isCenter) {
              return (
                <button
                  key="create"
                  onClick={() => setSheetOpen(true)}
                  className="relative -mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg active:scale-95 transition-transform"
                  data-testid="button-create"
                >
                  <Plus className="h-7 w-7" strokeWidth={2.5} />
                </button>
              );
            }

            const isActive = tab.href === "/"
              ? location === "/"
              : location.startsWith(tab.href);

            return (
              <Link key={tab.href} href={tab.href}>
                <div className="flex flex-col items-center gap-0.5 cursor-pointer min-w-[48px]">
                  <tab.icon
                    className={cn(
                      "h-6 w-6 transition-colors",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                    fill={isActive ? "currentColor" : "none"}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  {isActive && (
                    <span className="text-[10px] font-semibold text-foreground">
                      {tab.label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left font-heading text-xl">Create</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {createActions.map((action) => (
              <Link key={action.href} href={action.href} onClick={() => setSheetOpen(false)}>
                <div className="flex items-center gap-4 rounded-2xl px-4 py-3.5 hover:bg-muted/50 cursor-pointer transition-colors active:scale-[0.98]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <action.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="text-base font-medium text-foreground">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
