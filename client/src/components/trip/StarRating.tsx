import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function StarRating({ rating, onRate, size = "md", readonly = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly || !onRate}
          onClick={() => onRate?.(star)}
          className={cn(
            "transition-colors",
            !readonly && onRate && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default",
          )}
        >
          <Star
            className={cn(
              sizes[size],
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}
