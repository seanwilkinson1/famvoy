import { MapPin, MoreVertical, Trash2, Plane, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DreamCardProps {
  dream: {
    id: number;
    destinationName: string;
    coverImageUrl?: string | null;
    notes?: string | null;
    tags?: string[] | null;
  };
  onDelete: (id: number) => void;
  onEdit: (dream: any) => void;
  onPlanTrip: (dream: any) => void;
}

export function DreamCard({ dream, onDelete, onEdit, onPlanTrip }: DreamCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden group">
      {/* Cover image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5 relative">
        {dream.coverImageUrl ? (
          <img
            src={dream.coverImageUrl}
            alt={dream.destinationName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary/30" />
          </div>
        )}

        {/* Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
              <MoreVertical className="h-4 w-4 text-charcoal" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(dream)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPlanTrip(dream)}>
                <Plane className="h-4 w-4 mr-2" /> Plan This Trip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(dream.id)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-display font-bold text-charcoal text-sm truncate">
          {dream.destinationName}
        </h3>
        {dream.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dream.notes}</p>
        )}
        {dream.tags && dream.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {dream.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
