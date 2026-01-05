import { Heart, Clock, DollarSign, Users, MapPin, Star } from "lucide-react";
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
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
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
      setIsHeartAnimating(true);
      setTimeout(() => setIsHeartAnimating(false), 500);
      queryClient.invalidateQueries({ queryKey: ["savedExperiences"] });
    },
  });

  return (
    <Link href={`/experience/${experience.id}`}>
      <div
        className={cn(
          "group relative overflow-hidden bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer",
          horizontal ? "w-[280px] flex-shrink-0" : "w-full",
          className
        )}
        data-testid={`card-experience-${experience.id}`}
      >
        {/* Image */}
        <div 
          className={cn(
            "relative w-full overflow-hidden bg-gray-100",
            horizontal ? "h-[160px]" : "aspect-[4/3]"
          )}
        >
          <img
            src={experience.image || 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800'}
            alt={experience.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800';
            }}
          />
          
          {/* Category badge */}
          <div className="absolute left-3 top-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-700 capitalize">
            {experience.category || "Outdoor"}
          </div>

          {/* Save Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveMutation.mutate();
            }}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 backdrop-blur-sm transition-transform hover:scale-110 active:scale-90"
            data-testid={`button-save-${experience.id}`}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-all",
                isSaved ? "fill-red-500 text-red-500" : "text-gray-600",
                isHeartAnimating && "scale-125"
              )}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 text-base leading-snug mb-2 line-clamp-2" data-testid={`text-title-${experience.id}`}>
            {experience.title}
          </h3>

          {/* Meta Row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {experience.duration}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {experience.cost}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {experience.ages}
            </span>
          </div>

          {/* Family Row */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <img
                src={experience.familyAvatar || experience.image}
                alt={experience.family || "Family"}
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="text-xs text-gray-600 truncate max-w-[100px]">
                {experience.family || "Family"}
              </span>
            </div>
            {experience.rating !== undefined && experience.rating > 0 && (
              <div className="flex items-center gap-1" data-testid={`rating-${experience.id}`}>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-gray-700">{experience.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
