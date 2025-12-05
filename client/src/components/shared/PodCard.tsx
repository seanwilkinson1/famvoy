import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Pod } from "@shared/schema";

interface PodCardProps {
  pod: Pod;
}

export function PodCard({ pod }: PodCardProps) {
  const memberAvatars = [
    "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400",
    "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400",
    "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400",
  ];

  return (
    <Link href={`/pod/${pod.id}`}>
      <div 
        className="group relative flex items-center gap-4 rounded-3xl bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
        data-testid={`card-pod-${pod.id}`}
      >
        {/* Avatars Stack */}
        <div className="flex -space-x-3">
          {memberAvatars.slice(0, 3).map((avatar, i) => (
            <img
              key={i}
              src={avatar}
              alt="Member"
              className="h-12 w-12 rounded-full border-2 border-white object-cover ring-1 ring-gray-100"
            />
          ))}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-heading text-base font-bold text-gray-900" data-testid={`text-pod-name-${pod.id}`}>{pod.name}</h3>
          <p className="line-clamp-1 text-sm text-gray-500">{pod.description}</p>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-300" />
      </div>
    </Link>
  );
}
