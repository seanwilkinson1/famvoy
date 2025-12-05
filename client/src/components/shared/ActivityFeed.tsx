import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { 
  Heart, 
  MapPin, 
  Users, 
  MessageCircle, 
  Star,
  Compass
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Activity, User } from "@shared/schema";

interface ActivityItemProps {
  activity: Activity & { user: User };
  onClick?: () => void;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "new_experience":
      return <MapPin className="h-4 w-4 text-primary" />;
    case "match":
      return <Heart className="h-4 w-4 text-warm-coral fill-warm-coral" />;
    case "pod_join":
      return <Users className="h-4 w-4 text-purple-500" />;
    case "message":
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case "save_experience":
      return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
    default:
      return <Compass className="h-4 w-4 text-gray-500" />;
  }
}

function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={onClick}
      className="flex items-start gap-3 w-full p-3 text-left hover:bg-gray-50 rounded-xl transition-colors"
      data-testid={`activity-${activity.id}`}
    >
      <div className="relative">
        <img
          src={activity.user.avatar || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"}
          alt={activity.user.name || "User"}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
          {getActivityIcon(activity.type)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-gray-900">{activity.user.name}</span>{" "}
          <span className="text-gray-600">{activity.title}</span>
        </p>
        {activity.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{activity.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>
    </motion.button>
  );
}

interface ActivityFeedProps {
  className?: string;
  limit?: number;
  userId?: number;
  showEmpty?: boolean;
}

export function ActivityFeed({ className, limit = 20, userId, showEmpty = true }: ActivityFeedProps) {
  const [, setLocation] = useLocation();
  
  const { data: activities = [], isLoading } = useQuery({
    queryKey: userId ? ["userActivities", userId] : ["activityFeed"],
    queryFn: () => userId 
      ? api.activities.getByUser(userId, limit)
      : api.activities.getFeed(limit),
  });

  const handleActivityClick = (activity: Activity & { user: User }) => {
    if (activity.targetType === "experience" && activity.targetId) {
      setLocation(`/experience/${activity.targetId}`);
    } else if (activity.targetType === "pod" && activity.targetId) {
      setLocation(`/pod/${activity.targetId}`);
    } else if (activity.targetType === "user" && activity.targetId) {
      setLocation(`/family/${activity.targetId}`);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-gray-200" />
              <div className="h-2 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    if (!showEmpty) return null;
    
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Compass className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No recent activity</p>
        <p className="text-xs text-gray-400 mt-1">
          Connect with families to see their updates here
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <AnimatePresence>
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onClick={() => handleActivityClick(activity)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
