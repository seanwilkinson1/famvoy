import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";

interface PodCardProps {
  pod: {
    id: string;
    name: string;
    members: string[];
    description: string;
  };
}

export function PodCard({ pod }: PodCardProps) {
  return (
    <Link href={`/pod/${pod.id}`}>
      <div className="group relative flex items-center gap-4 rounded-3xl bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99] cursor-pointer">
        {/* Avatars Stack */}
        <div className="flex -space-x-3">
          {pod.members.slice(0, 3).map((avatar, i) => (
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
          <h3 className="font-heading text-base font-bold text-gray-900">{pod.name}</h3>
          <p className="line-clamp-1 text-sm text-gray-500">{pod.description}</p>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-300" />
      </div>
    </Link>
  );
}
