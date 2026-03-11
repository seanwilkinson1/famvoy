import * as React from "react"
import { cn } from "@/lib/utils"

interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  icon?: React.ReactNode
}

const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, active = false, icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
          "border whitespace-nowrap select-none",
          active
            ? "bg-foreground text-background border-foreground"
            : "bg-background text-foreground border-border hover:bg-muted",
          className
        )}
        {...props}
      >
        {icon && <span className="[&_svg]:size-4">{icon}</span>}
        {children}
      </button>
    )
  }
)
FilterChip.displayName = "FilterChip"

export { FilterChip }
