interface Memory {
  id: number;
  emoji?: string | null;
  caption?: string | null;
  photos?: string[] | null;
  tag?: string | null;
  isHighlight: boolean;
}

interface MemoryGridProps {
  memories: Memory[];
}

export function MemoryGrid({ memories }: MemoryGridProps) {
  if (memories.length === 0) {
    return (
      <p className="text-sm text-stone-400 italic py-4">No memories logged for this day</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="rounded-lg overflow-hidden bg-white border border-stone-100 shadow-sm"
        >
          {memory.photos?.[0] ? (
            <div className="aspect-square relative">
              <img
                src={memory.photos[0]}
                alt={memory.caption || "Memory"}
                className="w-full h-full object-cover"
              />
              {memory.emoji && (
                <span className="absolute top-2 left-2 text-lg drop-shadow-md">
                  {memory.emoji}
                </span>
              )}
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center bg-stone-50 p-3">
              <span className="text-4xl">{memory.emoji || "📸"}</span>
            </div>
          )}
          {memory.caption && (
            <div className="p-2">
              <p className="text-xs text-stone-600 line-clamp-2">{memory.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
