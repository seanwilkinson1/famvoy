import { mapBg, experiences } from "@/lib/data";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { Search, Navigation } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Explore() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100">
      {/* Map Background (Simulated) */}
      <div className="absolute inset-0 h-full w-full">
        <img src={mapBg} alt="Map" className="h-full w-full object-cover opacity-80" />
        
        {/* Simulated Pins */}
        <div className="absolute left-1/4 top-1/3 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-white/50 animate-pulse" />
        <div className="absolute right-1/3 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary ring-4 ring-white/50" />
      </div>

      {/* Map Overlays */}
      <div className="absolute right-4 top-14 flex flex-col gap-3">
        <button className="rounded-full bg-white p-3 shadow-lg shadow-black/5 active:scale-90 transition-transform">
          <Search className="h-6 w-6 text-gray-700" />
        </button>
        <button className="rounded-full bg-white p-3 shadow-lg shadow-black/5 active:scale-90 transition-transform">
          <Navigation className="h-6 w-6 text-primary fill-primary" />
        </button>
      </div>

      {/* Bottom Sheet */}
      <motion.div
        drag="y"
        dragConstraints={{ top: -500, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y < -100) setIsExpanded(true);
          if (info.offset.y > 100) setIsExpanded(false);
        }}
        animate={{ height: isExpanded ? "75%" : "180px" }}
        className="absolute bottom-0 left-0 right-0 z-30 rounded-t-[32px] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="h-1.5 w-12 rounded-full bg-gray-200" />
        </div>

        {/* Content */}
        <div className="px-6 pt-2 h-full overflow-hidden flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-gray-900">
              {experiences.length} experiences nearby
            </h3>
            <button className="text-xs font-medium text-primary uppercase tracking-wide">Filter</button>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
             {["Any age", "Free", "< 2h"].map((f) => (
               <span key={f} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap">{f}</span>
             ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto pb-32 space-y-4 no-scrollbar">
            {experiences.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} className="shadow-none border border-gray-100" />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
