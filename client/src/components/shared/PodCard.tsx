import { ChevronRight, Users, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import type { Pod } from "@shared/schema";

interface PodCardProps {
  pod: Pod;
}

export function PodCard({ pod }: PodCardProps) {
  const defaultImage = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400";
  
  return (
    <Link href={`/pod/${pod.id}`}>
      <div 
        className="group relative flex items-center gap-4 rounded-3xl bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
        data-testid={`card-pod-${pod.id}`}
      >
        {/* Pod Image or Icon */}
        <div className="relative h-14 w-14 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100">
          {pod.image ? (
            <img
              src={pod.image}
              alt={pod.name}
              className="h-full w-full object-cover"
            />
          ) : pod.isDirect ? (
            <div className="h-full w-full flex items-center justify-center bg-primary/10">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
          ) : (
            <img
              src={defaultImage}
              alt={pod.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-bold text-gray-900 truncate" data-testid={`text-pod-name-${pod.id}`}>
            {pod.name}
          </h3>
          <p className="line-clamp-1 text-sm text-gray-500">{pod.description}</p>
          
          {/* Meta info */}
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            {pod.category && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5">{pod.category}</span>
            )}
            {!pod.isDirect && pod.memberCount !== null && pod.memberCount !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {pod.memberCount} {pod.memberCount === 1 ? 'member' : 'members'}
              </div>
            )}
            {pod.isDirect && (
              <span className="text-primary font-medium">Direct Message</span>
            )}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
      </div>
    </Link>
  );
}
