import { Heart, Clock, DollarSign, Users, MapPin, Star, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExperienceWithFamily } from "@/lib/types";

interface ExperienceCardProps {
  experience: ExperienceWithFamily & { distance?: number; rating?: number; ratingCount?: number; checkinCount?: number };
  className?: string;
  horizontal?: boolean;
}

export function ExperienceCard({ experience, className, horizontal = false }: ExperienceCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) return;
      if (isSaved) {
        await api.experiences.unsave(experience.id);
      } else {
        await api.experiences.save(experience.id);
      }
    },
    onSuccess: () => {
      setIsSaved(!isSaved);
      queryClient.invalidateQueries({ queryKey: ["savedExperiences"] });
    },
  });

  return (
    <Link href={`/experience/${experience.id}`}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-3xl bg-card shadow-sm transition-all hover:shadow-md active:scale-[0.98] cursor-pointer",
          horizontal ? "w-[280px] flex-shrink-0" : "w-full",
          className
        )}
        data-testid={`card-experience-${experience.id}`}
      >
        {/* Image */}
        <div 
          className={cn(
            "relative w-full overflow-hidden bg-gray-100 flex-shrink-0",
            horizontal ? "h-[160px]" : "aspect-[4/3]"
          )}
        >
          <img
            src={experience.image || 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800'}
            alt={experience.title}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800';
            }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            saveMutation.mutate();
          }}
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-primary backdrop-blur-sm transition-colors hover:bg-white active:scale-90 z-10"
          data-testid={`button-save-${experience.id}`}
        >
          <Heart
            className={cn("h-5 w-5 transition-colors", isSaved ? "fill-primary text-primary" : "text-gray-600")}
          />
        </button>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 font-heading text-lg font-bold leading-tight text-gray-900" data-testid={`text-title-${experience.id}`}>
            {experience.title}
          </h3>

          {/* Meta Row */}
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500">
            {experience.distance !== undefined && (
              <div className="flex items-center gap-1 text-primary font-semibold">
                <MapPin className="h-3.5 w-3.5" />
                {experience.distance.toFixed(1)} mi
              </div>
            )}
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
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <img
                src={experience.familyAvatar || experience.image}
                alt={experience.family || "Family"}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-gray-100"
              />
              <span className="text-xs font-medium text-gray-600">Shared by {experience.family || "Family"}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
              {experience.rating !== undefined && experience.rating > 0 && (
                <div className="flex items-center gap-1" data-testid={`rating-${experience.id}`}>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{experience.rating.toFixed(1)}</span>
                </div>
              )}
              {experience.checkinCount !== undefined && experience.checkinCount > 0 && (
                <div className="flex items-center gap-1" data-testid={`checkin-count-${experience.id}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>{experience.checkinCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
