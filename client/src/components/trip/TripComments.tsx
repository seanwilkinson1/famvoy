import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TripCommentsProps {
  tripId: number;
  currentUserId: number;
}

export function TripComments({ tripId, currentUserId }: TripCommentsProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["/api/trips", tripId, "comments"],
    queryFn: () => api.tripCommentsApi.list(tripId),
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => api.tripCommentsApi.create(tripId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "comments"] });
      setNewComment("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => api.tripCommentsApi.remove(tripId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "comments"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createMutation.mutate(newComment.trim());
  };

  return (
    <div className="space-y-3">
      <h4 className="font-display font-bold text-charcoal text-sm flex items-center gap-1.5">
        <MessageCircle className="h-4 w-4" />
        Comments ({comments.length})
      </h4>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {comment.user?.profileImageUrl ? (
                  <img
                    src={comment.user.profileImageUrl}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-primary">
                    {comment.user?.firstName?.[0] || "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-charcoal">
                    {comment.user?.firstName || "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-charcoal">{comment.content}</p>
              </div>
              {comment.userId === currentUserId && (
                <button
                  onClick={() => deleteMutation.mutate(comment.id)}
                  className="text-muted-foreground hover:text-red-500 p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newComment.trim() || createMutation.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
