import { useParams, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ChapterHeader } from "@/components/booklet/ChapterHeader";
import { HeroMemoryCard } from "@/components/booklet/HeroMemoryCard";
import { MemoryGrid } from "@/components/booklet/MemoryGrid";

export default function BookletChapters() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const tripId = parseInt(id!);

  const params = new URLSearchParams(searchStr);
  const initialDay = parseInt(params.get("day") || "1");
  const [activeDay, setActiveDay] = useState(initialDay);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId, "booklet"],
    queryFn: () => api.booklet.get(tripId),
  });

  // Reset activeDay when chapters load
  useEffect(() => {
    if (data?.chapters?.length && !data.chapters.find((c: any) => c.dayNumber === activeDay)) {
      setActiveDay(data.chapters[0].dayNumber);
    }
  }, [data?.chapters, activeDay]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF7F2]">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!data) return null;

  const { chapters, memories } = data;
  const currentChapter = chapters.find((c: any) => c.dayNumber === activeDay);
  const dayMemories = memories.filter((m: any) => m.dayNumber === activeDay);
  const heroMemory = dayMemories.find((m: any) => m.isHighlight) || dayMemories[0];
  const otherMemories = dayMemories.filter((m: any) => m.id !== heroMemory?.id);

  const currentIndex = chapters.findIndex((c: any) => c.dayNumber === activeDay);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF7F2]/80 backdrop-blur-sm border-b border-stone-200/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(`/trips/${tripId}/booklet`)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <span className="text-sm font-medium text-stone-600">Chapters</span>
        </div>
      </div>

      {/* Day tab strip */}
      <div className="border-b border-stone-200/50 bg-[#FAF7F2]">
        <div className="max-w-lg mx-auto px-4 flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          {chapters.map((chapter: any) => (
            <button
              key={chapter.id}
              onClick={() => setActiveDay(chapter.dayNumber)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                chapter.dayNumber === activeDay
                  ? "text-white"
                  : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"
              }`}
              style={chapter.dayNumber === activeDay ? { backgroundColor: chapter.accentColor } : {}}
            >
              Day {chapter.dayNumber}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentChapter && (
              <>
                <ChapterHeader
                  dayNumber={currentChapter.dayNumber}
                  title={currentChapter.title}
                  location={currentChapter.location}
                  date={currentChapter.date}
                  accentColor={currentChapter.accentColor}
                />

                {/* Pull quote */}
                {currentChapter.quote && (
                  <div className="my-4 py-3 border-l-2 border-stone-300 pl-4">
                    <p className="font-serif italic text-stone-600">
                      &ldquo;{currentChapter.quote}&rdquo;
                    </p>
                  </div>
                )}

                {/* Hero memory */}
                {heroMemory && (
                  <div className="mt-4">
                    <HeroMemoryCard
                      emoji={heroMemory.emoji}
                      caption={heroMemory.caption}
                      photos={heroMemory.photos}
                      tag={heroMemory.tag}
                    />
                  </div>
                )}

                {/* Memory grid */}
                <div className="mt-6">
                  <MemoryGrid memories={otherMemories} />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Prev/Next navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-stone-200">
          {prevChapter ? (
            <button
              onClick={() => setActiveDay(prevChapter.dayNumber)}
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Day {prevChapter.dayNumber}</span>
            </button>
          ) : (
            <div />
          )}
          {nextChapter ? (
            <button
              onClick={() => setActiveDay(nextChapter.dayNumber)}
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
            >
              <span>Day {nextChapter.dayNumber}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
