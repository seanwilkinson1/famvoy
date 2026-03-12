import { useState, useRef } from "react";
import { Sparkles, Loader2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIReflectionBlockProps {
  reflection?: string | null;
  onGenerate: () => void;
  onSave: (text: string) => void;
  isGenerating: boolean;
  streamedText?: string;
}

export function AIReflectionBlock({
  reflection,
  onGenerate,
  onSave,
  isGenerating,
  streamedText,
}: AIReflectionBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayText = isGenerating ? streamedText : reflection;

  const startEditing = () => {
    setEditText(reflection || "");
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    onSave(editText);
    setIsEditing(false);
  };

  if (!displayText && !isGenerating) {
    return (
      <div className="bg-muted rounded-2xl p-6 text-center">
        <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="font-heading text-lg text-foreground mb-1">AI Reflection</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a personalized reflection based on your trip memories
        </p>
        <Button onClick={onGenerate} className="bg-foreground text-background hover:bg-foreground/90 rounded-full">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Reflection
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Reflection</span>
        </div>
        {!isGenerating && !isEditing && (
          <div className="flex gap-1">
            <button onClick={startEditing} className="p-1.5 text-muted-foreground hover:text-foreground">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onGenerate} className="p-1.5 text-muted-foreground hover:text-foreground">
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[150px] bg-card border border-border rounded-xl p-3 text-foreground text-sm font-heading leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={saveEdit}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="font-heading text-foreground leading-relaxed whitespace-pre-wrap">
          {displayText}
          {isGenerating && (
            <span className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-pulse" />
          )}
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Generating reflection...</span>
        </div>
      )}
    </div>
  );
}
