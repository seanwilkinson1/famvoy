import { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPin, Users, Heart, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface FamilySwipeCardProps {
  family: User & { distance?: number };
  onSwipe: (liked: boolean) => void;
  isTop?: boolean;
}

export function FamilySwipeCard({ family, onSwipe, isTop = false }: FamilySwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe(true);
    } else if (info.offset.x < -100) {
      onSwipe(false);
    }
  };

  return (
    <motion.div
      className={cn(
        "absolute inset-0 cursor-grab active:cursor-grabbing",
        !isTop && "pointer-events-none"
      )}
      style={{ x, rotate, opacity }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={family.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'}
            alt={family.name || 'Family'}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Like/Nope Indicators */}
        <motion.div
          className="absolute left-6 top-6 rounded-lg border-4 border-green-500 px-4 py-2 rotate-[-15deg]"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-2xl font-black text-green-500">LIKE</span>
        </motion.div>
        
        <motion.div
          className="absolute right-6 top-6 rounded-lg border-4 border-red-500 px-4 py-2 rotate-[15deg]"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-2xl font-black text-red-500">NOPE</span>
        </motion.div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h2 className="font-heading text-3xl font-bold mb-2">{family.name || 'Family'}</h2>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1 text-sm text-white/80">
              <MapPin className="h-4 w-4" />
              {family.distance !== undefined 
                ? `${family.distance.toFixed(1)} mi away`
                : (family.location || 'Location not set')}
            </div>
            <div className="flex items-center gap-1 text-sm text-white/80">
              <Users className="h-4 w-4" />
              {family.kids || 'Kids info not set'}
            </div>
          </div>
          
          {family.bio && (
            <p className="text-sm text-white/70 mb-4 line-clamp-2">{family.bio}</p>
          )}

          {/* Interests */}
          <div className="flex flex-wrap gap-2">
            {(family.interests || []).slice(0, 4).map((interest) => (
              <span
                key={interest}
                className="rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface SwipeButtonsProps {
  onSwipe: (liked: boolean) => void;
  disabled?: boolean;
}

export function SwipeButtons({ onSwipe, disabled }: SwipeButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-6">
      <button
        onClick={() => onSwipe(false)}
        disabled={disabled}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg shadow-red-500/20 border-2 border-red-100 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
        data-testid="button-swipe-left"
      >
        <X className="h-8 w-8 text-red-500" />
      </button>
      
      <button
        onClick={() => onSwipe(true)}
        disabled={disabled}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal-400 shadow-lg shadow-primary/30 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
        data-testid="button-swipe-right"
      >
        <Heart className="h-10 w-10 text-white fill-white" />
      </button>
    </div>
  );
}
