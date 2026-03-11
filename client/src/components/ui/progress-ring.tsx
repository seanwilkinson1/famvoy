import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressRingProps {
  current: number
  total: number
  size?: number
  strokeWidth?: number
  className?: string
}

function ProgressRing({
  current,
  total,
  size = 40,
  strokeWidth = 2.5,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? current / total : 0
  const offset = circumference * (1 - progress)

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-medium text-foreground">
        {current}/{total}
      </span>
    </div>
  )
}

export { ProgressRing }
