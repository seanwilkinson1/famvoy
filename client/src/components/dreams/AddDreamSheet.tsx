import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";

interface AddDreamSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    destinationName: string;
    notes?: string;
    tags?: string[];
    coverImageUrl?: string;
  }) => void;
  editingDream?: {
    id: number;
    destinationName: string;
    notes?: string | null;
    tags?: string[] | null;
    coverImageUrl?: string | null;
  } | null;
}

const SUGGESTED_TAGS = ["beach", "city", "adventure", "nature", "kid-friendly", "budget", "luxury", "culture", "food", "relaxation"];

export function AddDreamSheet({ open, onClose, onSubmit, editingDream }: AddDreamSheetProps) {
  const [destinationName, setDestinationName] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  useEffect(() => {
    if (editingDream) {
      setDestinationName(editingDream.destinationName);
      setNotes(editingDream.notes || "");
      setTags(editingDream.tags || []);
    } else {
      setDestinationName("");
      setNotes("");
      setTags([]);
    }
  }, [editingDream, open]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setCustomTag("");
    }
  };

  const handleSubmit = () => {
    if (!destinationName.trim()) return;
    onSubmit({
      destinationName: destinationName.trim(),
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">
            {editingDream ? "Edit Dream" : "Add to Dream Board"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-4">
          <div>
            <label className="text-sm font-medium text-charcoal">Destination</label>
            <Input
              placeholder="Where do you dream of going?"
              value={destinationName}
              onChange={(e) => setDestinationName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-charcoal">Notes</label>
            <Textarea
              placeholder="Why does this place excite you?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-charcoal mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    tags.includes(tag)
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-muted-foreground border-gray-200 hover:border-primary/50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {/* Custom tag */}
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Custom tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
                className="text-sm"
              />
              <Button variant="outline" size="sm" onClick={addCustomTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {/* Selected tags that aren't in SUGGESTED */}
            {tags.filter((t) => !SUGGESTED_TAGS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags
                  .filter((t) => !SUGGESTED_TAGS.includes(t))
                  .map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-primary text-white px-2 py-1 rounded-full flex items-center gap-1"
                    >
                      {tag}
                      <button onClick={() => toggleTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!destinationName.trim()}
            className="w-full"
          >
            {editingDream ? "Save Changes" : "Add to Dream Board"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
