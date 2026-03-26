import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { BoardPickerModal } from "@/components/shared/BoardPickerModal";
import { formatExperience } from "@/lib/types";

export default function BoardDetail() {
  const [, params] = useRoute("/boards/:id");
  const [, setLocation] = useLocation();
  const boardId = parseInt(params?.id || "0");
  const [boardPickerExperienceId, setBoardPickerExperienceId] = useState<number | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: pins = [] } = useQuery({
    queryKey: ["boardPins", boardId],
    queryFn: () => api.boards.getPins(boardId),
    enabled: !!boardId,
  });

  // Get board name from user's boards
  const { data: boards = [] } = useQuery({
    queryKey: ["boards", currentUser?.id],
    queryFn: () => currentUser ? api.boards.getAll(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const board = boards.find((b: any) => b.id === boardId);
  const formatted = pins.map((exp: any) => formatExperience(exp));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation("/profile")} className="rounded-full bg-muted p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading font-bold text-lg text-foreground truncate">
          {board?.name || "Board"}
        </h1>
        <span className="text-sm text-muted-foreground ml-auto">
          {board?.pinCount ?? pins.length} {(board?.pinCount ?? pins.length) === 1 ? "pin" : "pins"}
        </span>
      </div>

      {/* Pinned experiences grid */}
      <div className="px-4 py-4">
        {formatted.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-foreground font-medium">No pins yet</p>
            <p className="text-sm text-muted-foreground mt-1">Save experiences to this board from Explore!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {formatted.map((exp: any) => (
              <ExperienceCard
                key={exp.id}
                experience={exp}
                onSaveToBoard={(id) => setBoardPickerExperienceId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {boardPickerExperienceId !== null && currentUser && (
        <BoardPickerModal
          experienceId={boardPickerExperienceId}
          onClose={() => setBoardPickerExperienceId(null)}
          userId={currentUser.id}
        />
      )}
    </div>
  );
}
