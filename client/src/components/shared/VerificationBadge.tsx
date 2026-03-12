import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function VerificationBadge({ className, size = "sm" }: VerificationBadgeProps) {
  return (
    <BadgeCheck
      className={cn(
        "text-emerald-500 flex-shrink-0",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        className,
      )}
    />
  );
}
