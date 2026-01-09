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
          <path 
            d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z" 
            fill="currentColor"
          />
          <path 
            d="M12 7L12 3M12 3L8 6M12 3L16 6" 
            stroke="currentColor" 
            strokeWidth="0"
          />
          <path 
            d="M9 21V14C9 13.4477 9.44772 13 10 13H14C14.5523 13 15 13.4477 15 14V21" 
            fill="hsl(var(--background))"
          />
          <path
            d="M10.5 16.5C10.5 16.5 11 15.5 12 15.5C13 15.5 13.5 16.5 13.5 16.5"
            stroke="hsl(var(--background))"
            strokeWidth="1.5"
          />
        </>
      ) : (
        <>
          <path 
            d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z" 
            stroke="currentColor" 
            strokeWidth="2"
          />
          <path 
            d="M9 21V14C9 13.4477 9.44772 13 10 13H14C14.5523 13 15 13.4477 15 14V21" 
            stroke="currentColor" 
            strokeWidth="2"
          />
          <path
            d="M10.5 16.5C10.5 16.5 11 15.5 12 15.5C13 15.5 13.5 16.5 13.5 16.5"
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
          <circle cx="12" cy="12" r="9" fill="currentColor" />
          <path 
            d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" 
            fill="hsl(var(--background))"
          />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <path d="M12 5V6" stroke="hsl(var(--background))" strokeWidth="1.5" />
          <path d="M12 18V19" stroke="hsl(var(--background))" strokeWidth="1.5" />
          <path d="M5 12H6" stroke="hsl(var(--background))" strokeWidth="1.5" />
          <path d="M18 12H19" stroke="hsl(var(--background))" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path 
            d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" 
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
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
          <rect x="4" y="7" width="16" height="13" rx="2" fill="currentColor" />
          <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" />
          <path d="M4 12H20" stroke="hsl(var(--background))" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="hsl(var(--background))" />
          <path d="M9 15H7" stroke="hsl(var(--background))" strokeWidth="1.5" />
          <path d="M17 15H15" stroke="hsl(var(--background))" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <rect x="4" y="7" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" />
          <path d="M4 12H20" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
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
          <circle cx="12" cy="8" r="3.5" fill="currentColor" />
          <circle cx="6" cy="10" r="2.5" fill="currentColor" />
          <circle cx="18" cy="10" r="2.5" fill="currentColor" />
          <path 
            d="M12 12C8.68629 12 6 14.6863 6 18V20H18V18C18 14.6863 15.3137 12 12 12Z" 
            fill="currentColor"
          />
          <path 
            d="M6 13C4.34315 13.5 3 15.0147 3 17V19H6" 
            fill="currentColor"
          />
          <path 
            d="M18 13C19.6569 13.5 21 15.0147 21 17V19H18" 
            fill="currentColor"
          />
          <path 
            d="M9 16.5C9 16.5 10 15 12 15C14 15 15 16.5 15 16.5" 
            stroke="hsl(var(--background))" 
            strokeWidth="1.5"
          />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="6" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="18" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path 
            d="M12 12C8.68629 12 6 14.6863 6 18V20H18V18C18 14.6863 15.3137 12 12 12Z" 
            stroke="currentColor"
            strokeWidth="2"
          />
          <path 
            d="M6 13C4.34315 13.5 3 15.0147 3 17V19H6" 
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path 
            d="M18 13C19.6569 13.5 21 15.0147 21 17V19H18" 
            stroke="currentColor"
            strokeWidth="1.5"
          />
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
          <path 
            d="M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.2561C3.51156 14.9828 3 13.5423 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" 
            fill="currentColor"
          />
          <path d="M8 11H8.01" stroke="hsl(var(--background))" strokeWidth="2.5" />
          <path d="M12 11H12.01" stroke="hsl(var(--background))" strokeWidth="2.5" />
          <path d="M16 11H16.01" stroke="hsl(var(--background))" strokeWidth="2.5" />
          <path 
            d="M8.5 14C8.5 14 9.5 15.5 12 15.5C14.5 15.5 15.5 14 15.5 14" 
            stroke="hsl(var(--background))" 
            strokeWidth="1.5"
          />
        </>
      ) : (
        <>
          <path 
            d="M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.2561C3.51156 14.9828 3 13.5423 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" 
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M8 11H8.01" stroke="currentColor" strokeWidth="2.5" />
          <path d="M12 11H12.01" stroke="currentColor" strokeWidth="2.5" />
          <path d="M16 11H16.01" stroke="currentColor" strokeWidth="2.5" />
        </>
      )}
    </svg>
  );
}
