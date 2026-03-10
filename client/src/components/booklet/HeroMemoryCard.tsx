interface HeroMemoryCardProps {
  emoji?: string | null;
  caption?: string | null;
  photos?: string[] | null;
  tag?: string | null;
}

export function HeroMemoryCard({ emoji, caption, photos, tag }: HeroMemoryCardProps) {
  const heroPhoto = photos?.[0];

  return (
    <div className="relative rounded-xl overflow-hidden bg-stone-100">
      {heroPhoto ? (
        <div className="relative aspect-[4/3]">
          <img
            src={heroPhoto}
            alt={caption || "Memory"}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {emoji && <span className="text-2xl mb-1 block">{emoji}</span>}
            {caption && (
              <p className="text-white text-lg font-serif leading-snug">
                {caption}
              </p>
            )}
            {tag && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-white/20 text-white rounded-full backdrop-blur-sm">
                {tag}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 min-h-[120px] flex flex-col justify-center">
          {emoji && <span className="text-3xl mb-2">{emoji}</span>}
          {caption && (
            <p className="text-stone-800 text-lg font-serif italic leading-snug">
              &ldquo;{caption}&rdquo;
            </p>
          )}
          {tag && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-stone-200 text-stone-600 rounded-full self-start">
              {tag}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
