import { Heart, Clock, DollarSign, Users, MapPin, Star, CheckCircle2, Sun, TreePine, Waves, UtensilsCrossed, Palette, Mountain } from "lucide-react";
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

const categoryConfig: Record<string, { icon: typeof Sun; className: string }> = {
  outdoor: { icon: Sun, className: "badge-outdoor" },
  indoor: { icon: Palette, className: "badge-indoor" },
  food: { icon: UtensilsCrossed, className: "badge-food" },
  adventure: { icon: Mountain, className: "badge-adventure" },
  nature: { icon: TreePine, className: "badge-outdoor" },
  water: { icon: Waves, className: "badge-adventure" },
};

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

  const category = experience.category?.toLowerCase() || "outdoor";
  const categoryInfo = categoryConfig[category] || categoryConfig.outdoor;
  const CategoryIcon = categoryInfo.icon;

  return (
    <Link href={`/experience/${experience.id}`}>
      <div
        className={cn(
          "group relative overflow-hidden bg-white shadow-sm card-depth cursor-pointer",
          horizontal ? "w-[300px] flex-shrink-0 rounded-[2rem]" : "w-full rounded-[2rem]",
          className
        )}
        style={{
          borderRadius: horizontal ? "2rem 2rem 2.5rem 1.5rem" : "2rem 2.5rem 2rem 2.5rem",
        }}
        data-testid={`card-experience-${experience.id}`}
      >
        {/* Image with parallax effect */}
        <div 
          className={cn(
            "relative w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0 parallax-container",
            horizontal ? "h-[180px]" : "aspect-[4/3]"
          )}
        >
          <img
            src={experience.image || 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800'}
            alt={experience.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800';
            }}
          />
          
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Category badge with frosted glass */}
          <div className={cn(
            "absolute left-4 top-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold glass",
            categoryInfo.className
          )}>
            <CategoryIcon className="h-3.5 w-3.5" />
            <span className="capitalize">{experience.category || "Outdoor"}</span>
          </div>

          {/* Title overlay with frosted glass */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="glass-dark rounded-2xl px-4 py-3">
              <h3 className="font-heading text-lg font-bold text-white leading-tight" data-testid={`text-title-${experience.id}`}>
                {experience.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Save Button with bounce animation */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            saveMutation.mutate();
          }}
          className="absolute right-4 top-4 rounded-full bg-white/90 p-2.5 backdrop-blur-sm transition-all hover:bg-white hover:scale-110 active:scale-90 z-10 shadow-lg"
          data-testid={`button-save-${experience.id}`}
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-all",
              isSaved ? "fill-primary text-primary" : "text-gray-600",
              isHeartAnimating && "heart-bounce"
            )}
          />
        </button>

        {/* Content */}
        <div className="p-5">
          {/* Meta Row with illustrated icons */}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600">
            {experience.distance !== undefined && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                <MapPin className="h-4 w-4" />
                {experience.distance.toFixed(1)} mi
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              {experience.duration}
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-gray-400" />
              {experience.cost}
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-400" />
              {experience.ages}
            </div>
          </div>

          {/* Family Row */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={experience.familyAvatar || experience.image}
                  alt={experience.family || "Family"}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" />
              </div>
              <span className="text-sm font-medium text-gray-600">
                {experience.family || "Family"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
              {experience.rating !== undefined && experience.rating > 0 && (
                <div className="flex items-center gap-1" data-testid={`rating-${experience.id}`}>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-gray-700">{experience.rating.toFixed(1)}</span>
                </div>
              )}
              {experience.checkinCount !== undefined && experience.checkinCount > 0 && (
                <div className="flex items-center gap-1" data-testid={`checkin-count-${experience.id}`}>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
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
