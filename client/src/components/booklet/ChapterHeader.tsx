import { format } from "date-fns";

interface ChapterHeaderProps {
  dayNumber: number;
  title: string;
  location: string;
  date: string;
  accentColor: string;
}

export function ChapterHeader({ dayNumber, title, location, date, accentColor }: ChapterHeaderProps) {
  const formattedDate = (() => {
    try {
      return format(new Date(date + "T00:00:00"), "MMMM d, yyyy");
    } catch {
      return date;
    }
  })();

  return (
    <div className="relative py-6">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="pl-5">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: accentColor }}
        >
          Day {dayNumber}
        </span>
        <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
          {title}
        </h2>
        <div className="flex items-center gap-2 mt-1 text-sm text-stone-500">
          <span>{location}</span>
          <span>&middot;</span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}
