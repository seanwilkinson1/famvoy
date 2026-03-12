import useEmblaCarousel from "embla-carousel-react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  className?: string;
  aspectRatio?: string;
  fallback?: string;
}

const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800";

export function ImageCarousel({
  images,
  alt = "",
  className,
  aspectRatio = "aspect-[4/3]",
  fallback = DEFAULT_FALLBACK,
}: ImageCarouselProps) {
  const validImages = images.filter(Boolean);
  const displayImages = validImages.length > 0 ? validImages : [fallback];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Single image — no carousel needed
  if (displayImages.length === 1) {
    return (
      <div className={cn("relative w-full overflow-hidden bg-muted", aspectRatio, className)}>
        <img
          src={displayImages[0]}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallback;
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden bg-muted", aspectRatio, className)}>
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {displayImages.map((src, index) => (
            <div key={index} className="min-w-0 flex-[0_0_100%] h-full">
              <img
                src={src}
                alt={`${alt} ${index + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallback;
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {displayImages.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              emblaApi?.scrollTo(index);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all",
              selectedIndex === index
                ? "w-4 bg-white"
                : "w-1.5 bg-white/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
