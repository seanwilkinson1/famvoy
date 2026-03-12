import { MessageCircle, Bell } from "lucide-react";
import { Link } from "wouter";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
      <div className="flex items-center justify-between px-5 py-4">
        <Link href="/">
          <span
            className="text-2xl font-heading font-semibold text-foreground tracking-tight cursor-pointer"
            data-testid="link-logo"
          >
            FamVoy
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/chat">
            <button
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              data-testid="button-chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </Link>

          <button
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all relative"
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
