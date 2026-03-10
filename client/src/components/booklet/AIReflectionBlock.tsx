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
      <div className="bg-stone-50 rounded-xl p-6 text-center">
        <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="font-serif text-lg text-stone-800 mb-1">AI Reflection</h3>
        <p className="text-sm text-stone-500 mb-4">
          Generate a personalized reflection based on your trip memories
        </p>
        <Button onClick={onGenerate} className="bg-stone-800 text-white hover:bg-stone-700">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Reflection
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] rounded-xl p-6 border border-stone-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">AI Reflection</span>
        </div>
        {!isGenerating && !isEditing && (
          <div className="flex gap-1">
            <button onClick={startEditing} className="p-1.5 text-stone-400 hover:text-stone-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onGenerate} className="p-1.5 text-stone-400 hover:text-stone-600">
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
            className="w-full min-h-[150px] bg-white border border-stone-200 rounded-lg p-3 text-stone-700 text-sm font-serif leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-300"
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
        <div className="font-serif text-stone-700 leading-relaxed whitespace-pre-wrap">
          {displayText}
          {isGenerating && (
            <span className="inline-block w-0.5 h-4 bg-stone-800 ml-0.5 animate-pulse" />
          )}
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-2 mt-3 text-xs text-stone-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Generating reflection...</span>
        </div>
      )}
    </div>
  );
}
