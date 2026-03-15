import { Users, MessageCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { Pod } from "@shared/schema";

interface PodCardProps {
  pod: Pod;
  className?: string;
  horizontal?: boolean;
}

export function PodCard({ pod, className, horizontal = false }: PodCardProps) {
  const defaultImage = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400";

  if (horizontal) {
    return (
      <Link href={`/pod/${pod.id}`}>
        <div
          className={cn(
            "group w-52 flex-shrink-0 overflow-hidden rounded-2xl bg-card cursor-pointer transition-all duration-300 hover:-translate-y-0.5",
            className,
          )}
          data-testid={`card-pod-${pod.id}`}
        >
          {/* Content */}
          <div className="p-3.5 space-y-1">
            <h3 className="font-semibold text-sm text-foreground truncate">{pod.name}</h3>
            {pod.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{pod.description}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              {pod.category && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                  {pod.category}
                </span>
              )}
              {!pod.isDirect && pod.memberCount != null && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {pod.memberCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // List variant
  return (
    <Link href={`/pod/${pod.id}`}>
      <div
        className={cn(
          "group flex items-center gap-4 rounded-2xl bg-card p-4 cursor-pointer transition-all hover:bg-muted/50",
          className,
        )}
        data-testid={`card-pod-${pod.id}`}
      >
        {/* Pod Image */}
        <div className="relative h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
          {pod.image ? (
            <img src={pod.image} alt={pod.name} className="h-full w-full object-cover" />
          ) : pod.isDirect ? (
            <div className="h-full w-full flex items-center justify-center bg-muted">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
          ) : (
            <img src={defaultImage} alt={pod.name} className="h-full w-full object-cover" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{pod.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{pod.description}</p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            {pod.category && (
              <span className="rounded-full border border-border px-2 py-0.5">{pod.category}</span>
            )}
            {!pod.isDirect && pod.memberCount != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {pod.memberCount}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
      </div>
    </Link>
  );
}
