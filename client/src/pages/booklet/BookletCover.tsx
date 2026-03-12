import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { StatsRow } from "@/components/booklet/StatsRow";
import { AIReflectionBlock } from "@/components/booklet/AIReflectionBlock";

export default function BookletCover() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const tripId = parseInt(id!);

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId, "booklet"],
    queryFn: () => api.booklet.get(tripId),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, any>) => api.booklet.update(tripId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "booklet"] });
    },
  });

  const handleGenerateReflection = useCallback(async () => {
    setIsGenerating(true);
    setStreamedText("");

    try {
      const response = await api.booklet.generateReflection(tripId);
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "chunk") {
                accumulated += event.content;
                setStreamedText(accumulated);
              } else if (event.type === "complete") {
                setStreamedText(event.reflection);
              }
            } catch {
              // ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      setIsGenerating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "booklet"] });
    }
  }, [tripId, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF7F2]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF7F2]">
        <p className="text-muted-foreground">Booklet not found</p>
      </div>
    );
  }

  const { booklet, chapters, memories } = data;
  const stats = (booklet.stats as any) || { totalStops: 0, totalMemories: 0, totalPhotos: 0 };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF7F2]/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(`/trip/${tripId}`)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">Trip Booklet</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-4 pb-24"
      >
        {/* Cover hero */}
        <div className="text-center pt-8 pb-6">
          {booklet.coverEmoji && (
            <span className="text-5xl mb-3 block">{booklet.coverEmoji}</span>
          )}
          <h1 className="text-3xl font-heading font-medium text-foreground">
            {booklet.title}
          </h1>
          {booklet.subtitle && (
            <p className="text-muted-foreground mt-1">{booklet.subtitle}</p>
          )}
        </div>

        {/* Stats */}
        <StatsRow
          totalStops={stats.totalStops || 0}
          totalMemories={stats.totalMemories || 0}
          totalPhotos={stats.totalPhotos || 0}
          daysCount={chapters.length}
        />

        {/* AI Reflection */}
        <div className="mt-6">
          <AIReflectionBlock
            reflection={booklet.aiReflection}
            onGenerate={handleGenerateReflection}
            onSave={(text) => updateMutation.mutate({ aiReflection: text })}
            isGenerating={isGenerating}
            streamedText={streamedText}
          />
        </div>

        {/* Chapter List */}
        <div className="mt-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Chapters
          </h2>
          <div className="space-y-2">
            {chapters.map((chapter: any) => {
              const dayMemories = memories.filter((m: any) => m.dayNumber === chapter.dayNumber);
              return (
                <Link
                  key={chapter.id}
                  href={`/trips/${tripId}/booklet/chapters?day=${chapter.dayNumber}`}
                >
                  <div className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border hover:border-border transition-colors cursor-pointer">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-serif font-bold text-sm"
                      style={{ backgroundColor: chapter.accentColor }}
                    >
                      {chapter.dayNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{chapter.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {dayMemories.length} {dayMemories.length === 1 ? "memory" : "memories"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex gap-3">
          <Link href={`/trips/${tripId}/booklet/map`} className="flex-1">
            <div className="p-3 bg-card rounded-2xl border border-border text-center hover:border-border transition-colors cursor-pointer">
              <span className="text-sm font-medium text-foreground">View Map</span>
            </div>
          </Link>
          <Link href={`/trips/${tripId}/booklet/publish`} className="flex-1">
            <div className="p-3 bg-foreground rounded-2xl text-center hover:bg-foreground/90 transition-colors cursor-pointer">
              <span className="text-sm font-medium text-white">
                {booklet.publishedAt ? "Published" : "Publish"}
              </span>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
