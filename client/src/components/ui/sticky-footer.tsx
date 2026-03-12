import * as React from "react"
import { cn } from "@/lib/utils"

interface StickyFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  summary?: React.ReactNode
  action: React.ReactNode
}

function StickyFooter({ summary, action, className, ...props }: StickyFooterProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border",
        "px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
        "md:sticky md:bottom-auto md:pb-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
        {summary && (
          <div className="flex-1 min-w-0 text-sm text-muted-foreground truncate">
            {summary}
          </div>
        )}
        <div className={cn("flex-shrink-0", !summary && "w-full")}>
          {action}
        </div>
      </div>
    </div>
  )
}

export { StickyFooter }
