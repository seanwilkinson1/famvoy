import { Heart, Clock, CurrencyDollar, Users, MapPin, Star, CheckCircle } from "@phosphor-icons/react";
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
  index?: number;
}

export function ExperienceCard({ experience, className, horizontal = false, index = 0 }: ExperienceCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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

  // Handle image URL - ensure it starts with proper protocol or path
  const imageUrl = experience.image?.startsWith('/objects') 
    ? experience.image 
    : experience.image || 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800';

  return (
    <Link href={`/experience/${experience.id}`}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative overflow-hidden rounded-2xl bg-card cursor-pointer transition-all duration-300",
          isHovered ? "shadow-lg -translate-y-1" : "shadow-md",
          horizontal ? "w-[280px] flex-shrink-0" : "w-full",
          className
        )}
        data-testid={`card-experience-${experience.id}`}
      >
        {/* Image Container */}
        <div 
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            horizontal ? "h-40" : "aspect-[4/3]"
          )}
        >
          <img
            src={imageUrl}
            alt={experience.title}
            className={cn(
              "h-full w-full object-cover transition-transform duration-500",
              isHovered && "scale-105"
            )}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800';
            }}
          />
          
          {/* Gradient Overlay on hover */}
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />
          
          {/* Category Badge */}
          {experience.category && (
            <div className="absolute left-3 top-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-foreground shadow-sm">
              {experience.category}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveMutation.mutate();
            }}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 backdrop-blur-sm transition-all hover:bg-white hover:scale-110 active:scale-90 z-10 shadow-sm"
            data-testid={`button-save-${experience.id}`}
          >
            <Heart
              weight={isSaved ? "fill" : "regular"}
              className={cn("h-5 w-5 transition-colors", isSaved ? "text-secondary" : "text-foreground/60")}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 font-semibold text-base leading-tight text-foreground line-clamp-1" data-testid={`text-title-${experience.id}`}>
            {experience.title}
          </h3>

          {/* Meta Row */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {experience.distance !== undefined && (
              <div className="flex items-center gap-1 text-primary font-medium">
                <MapPin weight="fill" className="h-3.5 w-3.5" />
                {experience.distance.toFixed(1)} mi
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock weight="bold" className="h-3.5 w-3.5" />
              {experience.duration}
            </div>
            <div className="flex items-center gap-1">
              <CurrencyDollar weight="bold" className="h-3.5 w-3.5" />
              {experience.cost}
            </div>
            <div className="flex items-center gap-1">
              <Users weight="bold" className="h-3.5 w-3.5" />
              {experience.ages}
            </div>
          </div>

          {/* Family Row */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <img
                src={experience.familyAvatar || 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=100'}
                alt={experience.family || "Family"}
                className="h-7 w-7 rounded-full object-cover ring-2 ring-background"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=100';
                }}
              />
              <span className="text-sm text-muted-foreground font-medium truncate max-w-[100px]">
                {experience.family || "Family"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {experience.rating !== undefined && experience.rating > 0 && (
                <div className="flex items-center gap-1" data-testid={`rating-${experience.id}`}>
                  <Star weight="fill" className="h-4 w-4 text-amber-400" />
                  <span className="font-semibold text-foreground">{experience.rating.toFixed(1)}</span>
                </div>
              )}
              {experience.checkinCount !== undefined && experience.checkinCount > 0 && (
                <div className="flex items-center gap-1" data-testid={`checkin-count-${experience.id}`}>
                  <CheckCircle weight="fill" className="h-4 w-4 text-primary" />
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
