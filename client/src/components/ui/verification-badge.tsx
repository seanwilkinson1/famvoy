import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface VerificationBadgeProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

function VerificationBadge({ size = "sm", className }: VerificationBadgeProps) {
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <CheckCircle
      className={cn(
        "text-kindred-green fill-kindred-green/20 flex-shrink-0",
        sizeClasses[size],
        className
      )}
    />
  )
}

export { VerificationBadge }
