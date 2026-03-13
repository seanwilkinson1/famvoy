import { Heart, Clock, DollarSign, Users, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ImageCarousel } from "@/components/ui/image-carousel";
import type { ExperienceWithFamily } from "@/lib/types";

interface ExperienceCardProps {
  experience: ExperienceWithFamily & { distance?: number; rating?: number; ratingCount?: number; checkinCount?: number };
  className?: string;
  horizontal?: boolean;
  index?: number;
}

export function ExperienceCard({ experience, className, horizontal = false }: ExperienceCardProps) {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: savedExperiences = [] } = useQuery({
    queryKey: ["savedExperiences", currentUser?.id],
    queryFn: () => currentUser ? api.users.getSavedExperiences(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const isSaved = savedExperiences.some((e: any) => e.id === experience.id);

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
      queryClient.invalidateQueries({ queryKey: ["savedExperiences"] });
    },
  });

  const imageUrl = experience.image?.startsWith('/objects')
    ? experience.image
    : experience.image || '';
  const images = imageUrl ? [imageUrl] : [];

  return (
    <Link href={`/experience/${experience.id}`}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl bg-card cursor-pointer transition-all duration-300 hover:-translate-y-0.5",
          horizontal ? "w-[280px] flex-shrink-0" : "w-full",
          className
        )}
        data-testid={`card-experience-${experience.id}`}
      >
        {/* 1. Image carousel with dot indicators */}
        <div className="relative">
          <ImageCarousel
            images={images}
            alt={experience.title}
            aspectRatio={horizontal ? "h-40" : "aspect-[4/3]"}
          />

          {/* Heart/save overlay (top-right) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveMutation.mutate();
            }}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 backdrop-blur-sm transition-all hover:bg-white hover:scale-110 active:scale-90 z-10"
            data-testid={`button-save-${experience.id}`}
          >
            <Heart
              fill={isSaved ? "currentColor" : "none"}
              className={cn("h-5 w-5 transition-colors", isSaved ? "text-foreground" : "text-foreground/50")}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-1.5">
          {/* 3. Location text (bold, small, uppercase tracking) */}
          {experience.family && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {experience.family}
            </p>
          )}

          {/* 4. Title (larger, sans-serif semibold) */}
          <h3
            className="font-semibold text-[15px] leading-snug text-foreground line-clamp-2"
            data-testid={`text-title-${experience.id}`}
          >
            {experience.title}
          </h3>

          {/* 5. Metadata row (icons + text) */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            {experience.distance !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {experience.distance.toFixed(1)} mi
              </span>
            )}
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

        </div>
      </div>
    </Link>
  );
}
