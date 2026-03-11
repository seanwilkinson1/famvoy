import { useState, useCallback } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageCarouselProps {
  images: string[]
  alt?: string
  aspectRatio?: "video" | "square" | "portrait"
  showArrows?: boolean
  className?: string
  onImageClick?: (index: number) => void
}

function ImageCarousel({
  images,
  alt = "Image",
  aspectRatio = "video",
  showArrows = true,
  className,
  onImageClick,
}: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useState(() => {
    if (!emblaApi) return
    emblaApi.on("select", onSelect)
    onSelect()
  })

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
  }

  if (images.length === 0) {
    return (
      <div className={cn("bg-muted rounded-lg", aspectClasses[aspectRatio], className)}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          No images
        </div>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-lg", aspectClasses[aspectRatio], className)}
        onClick={() => onImageClick?.(0)}
      >
        <img
          src={images[0]}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div className={cn("relative group", className)}>
      <div ref={emblaRef} className="overflow-hidden rounded-lg">
        <div className="flex">
          {images.map((src, index) => (
            <div
              key={index}
              className={cn("flex-[0_0_100%] min-w-0", aspectClasses[aspectRatio])}
              onClick={() => onImageClick?.(index)}
            >
              <img
                src={src}
                alt={`${alt} ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              index === selectedIndex
                ? "bg-white w-3"
                : "bg-white/60"
            )}
          />
        ))}
      </div>

      {/* Arrow controls — show on desktop hover */}
      {showArrows && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </>
      )}
    </div>
  )
}

export { ImageCarousel }
