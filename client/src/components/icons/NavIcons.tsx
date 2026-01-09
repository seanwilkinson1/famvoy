import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  filled?: boolean;
}

export function HomeIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-6 h-6", className)} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <>
          {/* Cozy tent with flag - filled */}
          <path 
            d="M12 3L3 14H6V20C6 20.5 6.5 21 7 21H17C17.5 21 18 20.5 18 20V14H21L12 3Z" 
            fill="currentColor"
          />
          {/* Door opening */}
          <path 
            d="M10 21V16C10 15.5 10.5 15 11 15H13C13.5 15 14 15.5 14 16V21" 
            fill="hsl(var(--background))"
          />
          {/* Little flag on top */}
          <path 
            d="M12 3V1M12 1L14.5 2L12 3" 
            stroke="hsl(var(--background))"
            strokeWidth="1.5"
          />
          {/* Smoke curl */}
          <path 
            d="M16 8C16.5 7 17.5 7 17.5 6" 
            stroke="hsl(var(--background))"
            strokeWidth="1"
          />
        </>
      ) : (
        <>
          {/* Cozy tent outline */}
          <path 
            d="M12 4L4 14H7V20C7 20.5 7.5 21 8 21H16C16.5 21 17 20.5 17 20V14H20L12 4Z" 
            stroke="currentColor" 
            strokeWidth="2"
          />
          {/* Door opening */}
          <path 
            d="M10 21V16.5C10 16 10.5 15.5 11 15.5H13C13.5 15.5 14 16 14 16.5V21" 
            stroke="currentColor" 
            strokeWidth="1.5"
          />
          {/* Little flag on top */}
          <path 
            d="M12 4V2M12 2L14 3L12 4" 
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </>
      )}
    </svg>
  );
}

export function ExploreIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-6 h-6", className)} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <>
          {/* Treasure map - filled */}
          <rect x="3" y="4" width="18" height="16" rx="2" fill="currentColor" />
          {/* Torn/wavy edges effect */}
          <path d="M3 8C4 8.5 5 7.5 6 8C7 8.5 8 7.5 9 8" stroke="hsl(var(--background))" strokeWidth="1" />
          {/* Dotted path */}
          <path 
            d="M7 10L9 13L12 11L15 14L17 12" 
            stroke="hsl(var(--background))" 
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          {/* X marks the spot */}
          <path d="M15 15L17 17M17 15L15 17" stroke="hsl(var(--secondary))" strokeWidth="2" />
          {/* Little compass rose in corner */}
          <circle cx="7" cy="16" r="2" fill="hsl(var(--background))" />
          <path d="M7 14.5V17.5M5.5 16H8.5" stroke="currentColor" strokeWidth="1" />
        </>
      ) : (
        <>
          {/* Treasure map outline */}
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          {/* Wavy line for aged paper look */}
          <path d="M3 8C4 8.5 5 7.5 6 8C7 8.5 8 7.5 9 8" stroke="currentColor" strokeWidth="1" />
          {/* Dotted path trail */}
          <path 
            d="M7 10L9 13L12 11L15 14L17 12" 
            stroke="currentColor" 
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          {/* X marks the spot */}
          <path d="M15 15L17 17M17 15L15 17" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

export function TripsIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-6 h-6", className)} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <>
          {/* Vintage suitcase - filled */}
          <rect x="4" y="8" width="16" height="12" rx="2" fill="currentColor" />
          {/* Handle */}
          <path d="M8 8V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V8" stroke="currentColor" strokeWidth="2" />
          {/* Belt/strap across middle */}
          <rect x="4" y="12" width="16" height="3" fill="hsl(var(--background))" opacity="0.3" />
          {/* Buckle */}
          <rect x="10" y="12" width="4" height="3" rx="0.5" fill="hsl(var(--background))" />
          {/* Travel stickers */}
          <circle cx="7" cy="16" r="1.5" fill="hsl(var(--secondary))" />
          <circle cx="17" cy="10" r="1" fill="hsl(var(--background))" />
          {/* Little heart sticker */}
          <path d="M15.5 16C15.5 15.5 16 15 16.5 15C17 15 17.5 15.5 17.5 16C17.5 16.5 16.5 17.5 16.5 17.5C16.5 17.5 15.5 16.5 15.5 16Z" fill="hsl(var(--background))" />
        </>
      ) : (
        <>
          {/* Vintage suitcase outline */}
          <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          {/* Handle */}
          <path d="M8 8V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V8" stroke="currentColor" strokeWidth="2" />
          {/* Belt across middle */}
          <line x1="4" y1="13.5" x2="20" y2="13.5" stroke="currentColor" strokeWidth="1.5" />
          {/* Buckle */}
          <rect x="10" y="12" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1" />
          {/* Sticker circles */}
          <circle cx="7" cy="17" r="1.5" stroke="currentColor" strokeWidth="1" />
          <circle cx="17" cy="10" r="1" stroke="currentColor" strokeWidth="1" />
        </>
      )}
    </svg>
  );
}

export function PodsIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-6 h-6", className)} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <>
          {/* Three overlapping hearts cluster - filled */}
          {/* Bottom left heart */}
          <path 
            d="M6 10C6 8 7.5 6.5 9 6.5C10.5 6.5 11.5 8 11.5 8C11.5 8 12.5 6.5 14 6.5C15.5 6.5 17 8 17 10C17 14 11.5 18 11.5 18C11.5 18 6 14 6 10Z" 
            fill="currentColor"
          />
          {/* Top heart (smaller, offset) */}
          <path 
            d="M10 7C10 5.5 11 4.5 12 4.5C13 4.5 14 5.5 14 7C14 9 12 11 12 11C12 11 10 9 10 7Z" 
            fill="currentColor"
            opacity="0.7"
          />
          {/* Connecting dots to show community */}
          <circle cx="8" cy="15" r="1" fill="hsl(var(--background))" />
          <circle cx="15" cy="15" r="1" fill="hsl(var(--background))" />
          <circle cx="11.5" cy="12" r="1" fill="hsl(var(--background))" />
        </>
      ) : (
        <>
          {/* Three overlapping hearts outline */}
          {/* Main heart */}
          <path 
            d="M6 10C6 8 7.5 6.5 9 6.5C10.5 6.5 11.5 8 11.5 8C11.5 8 12.5 6.5 14 6.5C15.5 6.5 17 8 17 10C17 14 11.5 18 11.5 18C11.5 18 6 14 6 10Z" 
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* Small connected hearts/circles representing family members */}
          <circle cx="8" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="15" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="11.5" cy="14" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

export function ChatIcon({ className, filled }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-6 h-6", className)} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <>
          {/* Cloud-shaped speech bubble - filled */}
          <path 
            d="M4 12C4 8.5 7 5 12 5C17 5 20 8.5 20 12C20 15.5 17 18 14 18H10L6 21V18C4.5 17 4 14.5 4 12Z" 
            fill="currentColor"
          />
          {/* Cloud bumps on top */}
          <ellipse cx="9" cy="7" rx="2" ry="1.5" fill="currentColor" />
          <ellipse cx="14" cy="6.5" rx="2.5" ry="1.5" fill="currentColor" />
          {/* Three dots */}
          <circle cx="8" cy="12" r="1.2" fill="hsl(var(--background))" />
          <circle cx="12" cy="12" r="1.2" fill="hsl(var(--background))" />
          <circle cx="16" cy="12" r="1.2" fill="hsl(var(--background))" />
        </>
      ) : (
        <>
          {/* Cloud-shaped speech bubble outline */}
          <path 
            d="M4 12C4 8.5 7 5 12 5C17 5 20 8.5 20 12C20 15.5 17 18 14 18H10L6 21V18C4.5 17 4 14.5 4 12Z" 
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* Cloud bumps */}
          <path d="M8 6.5C8.5 5.5 9.5 5 10.5 5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 5C14 4.5 15.5 5 16 6" stroke="currentColor" strokeWidth="1.5" />
          {/* Three dots */}
          <circle cx="8" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="16" cy="12" r="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
