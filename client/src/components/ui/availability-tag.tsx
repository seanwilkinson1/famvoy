import * as React from "react"
import { cn } from "@/lib/utils"

interface AvailabilityTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "active"
}

const AvailabilityTag = React.forwardRef<HTMLSpanElement, AvailabilityTagProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
          variant === "active"
            ? "bg-kindred-green/10 text-kindred-green border-kindred-green/30"
            : "bg-accent/10 text-accent border-accent/30",
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)
AvailabilityTag.displayName = "AvailabilityTag"

export { AvailabilityTag }
