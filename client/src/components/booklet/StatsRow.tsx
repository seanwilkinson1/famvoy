import { MapPin, Camera, BookOpen, Star } from "lucide-react";

interface StatsRowProps {
  totalStops: number;
  totalMemories: number;
  totalPhotos: number;
  daysCount: number;
}

export function StatsRow({ totalStops, totalMemories, totalPhotos, daysCount }: StatsRowProps) {
  const stats = [
    { icon: BookOpen, label: "Days", value: daysCount },
    { icon: MapPin, label: "Stops", value: totalStops },
    { icon: Star, label: "Memories", value: totalMemories },
    { icon: Camera, label: "Photos", value: totalPhotos },
  ];

  return (
    <div className="flex justify-around py-4 border-y border-stone-200">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <Icon className="w-4 h-4 text-stone-400" />
          <span className="text-lg font-semibold text-stone-800">{value}</span>
          <span className="text-xs text-stone-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
