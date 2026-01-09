import { Heart, Clock, CurrencyDollar, Users, MapPin, Star, CheckCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExperienceWithFamily } from "@/lib/types";
import { motion } from "framer-motion";

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

  return (
    <Link href={`/experience/${experience.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.4, 
          delay: index * 0.05,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        whileHover={{ y: -4 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={cn(
          "group relative overflow-hidden rounded-3xl bg-card transition-premium cursor-pointer",
          isHovered ? "card-shadow-hover" : "card-shadow",
          horizontal ? "w-[300px] flex-shrink-0" : "w-full",
          className
        )}
        data-testid={`card-experience-${experience.id}`}
      >
        {/* Image Container */}
        <div 
          className={cn(
            "relative w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex-shrink-0",
            horizontal ? "h-[180px]" : "aspect-[4/3]"
          )}
        >
          <motion.img
            src={experience.image || 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800'}
            alt={experience.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800';
            }}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Category Badge */}
          {experience.category && (
            <div className="absolute left-3 top-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-xs font-semibold text-foreground shadow-sm">
              {experience.category}
            </div>
          )}
        </div>

        {/* Save Button */}
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            saveMutation.mutate();
          }}
          whileTap={{ scale: 0.85 }}
          className="absolute right-3 top-3 rounded-full bg-white/95 p-2.5 backdrop-blur-sm transition-all hover:bg-white z-10 card-shadow"
          data-testid={`button-save-${experience.id}`}
        >
          <Heart
            weight={isSaved ? "fill" : "regular"}
            className={cn("h-5 w-5 transition-colors", isSaved ? "text-secondary" : "text-foreground/60")}
          />
        </motion.button>

        {/* Content */}
        <div className="p-5">
          <h3 className="mb-2 font-heading text-lg font-medium leading-tight text-foreground tracking-tight" data-testid={`text-title-${experience.id}`}>
            {experience.title}
          </h3>

          {/* Meta Row */}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            {experience.distance !== undefined && (
              <div className="flex items-center gap-1.5 text-primary font-semibold">
                <MapPin weight="fill" className="h-4 w-4" />
                {experience.distance.toFixed(1)} mi
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock weight="bold" className="h-4 w-4" />
              {experience.duration}
            </div>
            <div className="flex items-center gap-1.5">
              <CurrencyDollar weight="bold" className="h-4 w-4" />
              {experience.cost}
            </div>
            <div className="flex items-center gap-1.5">
              <Users weight="bold" className="h-4 w-4" />
              {experience.ages}
            </div>
          </div>

          {/* Family Row with overlapping avatar */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={experience.familyAvatar || experience.image}
                  alt={experience.family || "Family"}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-card shadow-sm"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-card" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{experience.family || "Family"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              {experience.rating !== undefined && experience.rating > 0 && (
                <div className="flex items-center gap-1" data-testid={`rating-${experience.id}`}>
                  <Star weight="fill" className="h-4 w-4 text-amber-400" />
                  <span className="text-foreground font-semibold">{experience.rating.toFixed(1)}</span>
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
      </motion.div>
    </Link>
  );
}
