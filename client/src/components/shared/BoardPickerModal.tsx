import { useState } from "react";
import { X, Plus, LayoutGrid, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface BoardPickerModalProps {
  experienceId: number | null;
  onClose: () => void;
  userId: number;
}

export function BoardPickerModal({ experienceId, onClose, userId }: BoardPickerModalProps) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: boards = [] } = useQuery({
    queryKey: ["boards", userId],
    queryFn: () => api.boards.getAll(userId),
    enabled: !!userId && experienceId !== null,
  });

  const invalidateAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ["boards"] });
    queryClient.invalidateQueries({ queryKey: ["savedExperiences"] });
    onClose();
  };

  const pinMutation = useMutation({
    mutationFn: async (boardId: number) => {
      if (!experienceId) return;
      await api.boards.addPin(boardId, experienceId);
    },
    onSuccess: invalidateAndClose,
    onError: (err) => {
      console.error("Pin failed:", err);
      setError("Failed to pin experience");
    },
  });

  const handleCreateAndPin = async () => {
    const name = newName.trim();
    if (!name || !experienceId) return;

    setError(null);
    try {
      const board = await api.boards.create(name);
      if (!board?.id) {
        setError("Board creation failed");
        return;
      }
      await api.boards.addPin(board.id, experienceId);
      setNewName("");
      setCreating(false);
      invalidateAndClose();
    } catch (err: any) {
      console.error("Board create+pin failed:", err);
      setError(err.message || "Failed to create board");
    }
  };

  if (experienceId === null) return null;

  const isPending = pinMutation.isPending;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end md:items-center md:justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background rounded-t-2xl md:rounded-2xl w-full md:max-w-sm max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading font-bold text-foreground">Save to board</h3>
          <button onClick={onClose} className="rounded-full bg-muted p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Board list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{error}</div>
          )}

          {boards.length === 0 && !creating && (
            <div className="py-8 text-center">
              <LayoutGrid className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No boards yet</p>
            </div>
          )}

          {boards.map((board: any) => (
            <button
              key={board.id}
              onClick={() => pinMutation.mutate(board.id)}
              disabled={isPending}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted transition-colors text-left"
            >
              {/* Mini preview */}
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden grid grid-cols-2 grid-rows-2 shrink-0">
                {board.previewImages.slice(0, 4).map((img: string, i: number) => (
                  <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                ))}
                {board.previewImages.length === 0 && (
                  <div className="col-span-2 row-span-2 flex items-center justify-center">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{board.name}</p>
                <p className="text-xs text-muted-foreground">{board.pinCount} {board.pinCount === 1 ? "pin" : "pins"}</p>
              </div>
            </button>
          ))}

          {/* Inline create */}
          {creating && (
            <div className="flex items-center gap-2 p-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setCreating(false);
                    setNewName("");
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateAndPin();
                  }
                }}
                placeholder="Board name..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleCreateAndPin}
                disabled={!newName.trim()}
                className="rounded-lg bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* New board button */}
        {!creating && (
          <div className="p-4 border-t border-border">
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 w-full justify-center rounded-xl bg-muted py-3 text-sm font-medium text-foreground hover:bg-border transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Board
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
