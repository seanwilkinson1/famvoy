import { Heart, Clock, DollarSign, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Experience } from "@/lib/data";
import { Link } from "wouter";

interface ExperienceCardProps {
  experience: Experience;
  className?: string;
  horizontal?: boolean;
}

export function ExperienceCard({ experience, className, horizontal = false }: ExperienceCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <Link href={`/experience/${experience.id}`}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-3xl bg-card shadow-sm transition-all hover:shadow-md active:scale-[0.98] cursor-pointer",
          horizontal ? "w-[280px] flex-shrink-0" : "w-full",
          className
        )}
      >
        {/* Image */}
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={experience.image}
            alt={experience.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsSaved(!isSaved);
          }}
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-primary backdrop-blur-sm transition-colors hover:bg-white active:scale-90 z-10"
        >
          <Heart
            className={cn("h-5 w-5 transition-colors", isSaved ? "fill-primary text-primary" : "text-gray-600")}
          />
        </button>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 font-heading text-lg font-bold leading-tight text-gray-900">
            {experience.title}
          </h3>

          {/* Meta Row */}
          <div className="mb-3 flex items-center gap-3 text-xs font-medium text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {experience.duration}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {experience.cost}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {experience.ages}
            </div>
          </div>

          {/* Family Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <img
              src={experience.familyAvatar}
              alt={experience.family}
              className="h-6 w-6 rounded-full object-cover ring-1 ring-gray-100"
            />
            <span className="text-xs font-medium text-gray-600">Shared by {experience.family}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
