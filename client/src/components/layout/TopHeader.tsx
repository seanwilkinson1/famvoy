import { Search, Bell, Heart } from "lucide-react";
import { Link } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function TopHeader() {
  const { user } = useUser();
  const initials = user?.firstName?.[0] || user?.username?.[0] || "U";
  const profileImage = user?.imageUrl;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-warm-teal to-warm-teal/80 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-outfit font-bold text-charcoal">FamVoy</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/explore">
            <button 
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
              data-testid="button-search"
            >
              <Search className="w-5 h-5" />
            </button>
          </Link>
          
          <button 
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors relative"
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          
          <Link href="/profile">
            <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-gray-100" data-testid="link-profile-avatar">
              <AvatarImage src={profileImage} alt="Profile" />
              <AvatarFallback className="bg-warm-teal text-white text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
