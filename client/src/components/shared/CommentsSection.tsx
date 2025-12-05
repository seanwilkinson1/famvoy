import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Star, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Comment, User } from "@shared/schema";

interface CommentsSectionProps {
  experienceId: number;
  currentUserId?: number;
}

function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = "md" 
}: { 
  rating: number; 
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          data-testid={`star-${star}`}
        >
          <Star 
            className={cn(
              sizeClass,
              displayRating >= star 
                ? "fill-yellow-400 text-yellow-400" 
                : "fill-gray-200 text-gray-200"
            )} 
          />
        </button>
      ))}
    </div>
  );
}

function CommentCard({ 
  comment, 
  currentUserId,
  onDelete 
}: { 
  comment: Comment & { user: User };
  currentUserId?: number;
  onDelete: () => void;
}) {
  const isOwn = currentUserId === comment.userId;
  
  return (
    <div className="flex gap-3 py-4 border-b border-gray-100 last:border-0" data-testid={`comment-${comment.id}`}>
      <img
        src={comment.user.avatar || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"}
        alt={comment.user.name || "User"}
        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-gray-900">
              {comment.user.name || "Anonymous"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {comment.rating && <StarRating rating={comment.rating} readonly size="sm" />}
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          {isOwn && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
              data-testid="button-delete-comment"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

export function CommentsSection({ experienceId, currentUserId }: CommentsSectionProps) {
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const queryClient = useQueryClient();
  
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", experienceId],
    queryFn: () => api.comments.getByExperience(experienceId),
  });
  
  const { data: ratingData } = useQuery({
    queryKey: ["rating", experienceId],
    queryFn: () => api.comments.getRating(experienceId),
  });
  
  const createMutation = useMutation({
    mutationFn: (data: { content: string; rating?: number }) => 
      api.comments.create(experienceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", experienceId] });
      queryClient.invalidateQueries({ queryKey: ["rating", experienceId] });
      setContent("");
      setRating(0);
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => api.comments.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", experienceId] });
      queryClient.invalidateQueries({ queryKey: ["rating", experienceId] });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createMutation.mutate({ 
      content: content.trim(), 
      rating: rating > 0 ? rating : undefined 
    });
  };
  
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-bold text-gray-900">
          Reviews & Comments
        </h2>
        {ratingData && ratingData.count > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(ratingData.average)} readonly size="sm" />
            <span className="text-sm font-medium text-gray-600">
              {ratingData.average.toFixed(1)} ({ratingData.count})
            </span>
          </div>
        )}
      </div>
      
      {currentUserId && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-600">Your rating:</span>
            <StarRating rating={rating} onRatingChange={setRating} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience..."
              className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 border border-gray-200"
              data-testid="input-comment"
            />
            <button
              type="submit"
              disabled={!content.trim() || createMutation.isPending}
              className="bg-primary text-white rounded-xl px-4 py-2.5 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              data-testid="button-submit-comment"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
      
      {isLoading ? (
        <div className="py-8 text-center text-gray-400">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-400 mb-1">No reviews yet</p>
          <p className="text-sm text-gray-300">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onDelete={() => deleteMutation.mutate(comment.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
