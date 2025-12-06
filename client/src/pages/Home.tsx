import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { ActivityFeed } from "@/components/shared/ActivityFeed";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";

const filters = ["Nearby", "Free", "1–2 hrs", "Indoor", "Outdoor", "Toddler-friendly"];

export default function Home() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ["experiences"],
    queryFn: api.experiences.getAll,
  });

  const formattedExperiences = experiences.map(exp => formatExperience(exp as any));

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 px-6 pt-14 pb-4 backdrop-blur-md">
        <p className="text-sm font-medium text-gray-500">Good morning,</p>
        <h1 className="font-heading text-2xl font-bold text-gray-900">
          {currentUser?.name || "Loading..."} 👋
        </h1>
        
        {/* Filters */}
        <ScrollArea className="mt-6 w-full whitespace-nowrap">
          <div className="flex w-max space-x-3 pb-4">
            {filters.map((filter, i) => (
              <button
                key={filter}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95",
                  i === 0
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                )}
                data-testid={`filter-${filter.toLowerCase().replace(/\s/g, '-')}`}
              >
                {filter}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <div className="space-y-8 px-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading experiences...</div>
        ) : (
          <>
            {/* Suggestions */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-gray-900">Suggestions for Today</h2>
                <button className="text-sm font-medium text-primary" data-testid="button-see-all">See all</button>
              </div>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4 pb-4">
                  {formattedExperiences.slice(0, 3).map((exp) => (
                    <ExperienceCard key={exp.id} experience={exp} horizontal />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
              </ScrollArea>
            </section>

            {/* Popular */}
            <section>
              <h2 className="mb-4 font-heading text-lg font-bold text-gray-900">
                Popular with Families Like Yours
              </h2>
              <div className="grid gap-6">
                {formattedExperiences.map((exp) => (
                  <ExperienceCard key={`pop-${exp.id}`} experience={exp} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
