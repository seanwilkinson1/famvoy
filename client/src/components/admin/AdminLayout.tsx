import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Map,
  ShoppingCart,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClerkAuth } from "@/hooks/useAuth";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/trips", icon: Map, label: "Trips" },
  { href: "/admin/bookings", icon: ShoppingCart, label: "Bookings" },
  { href: "/admin/content", icon: FileText, label: "Content" },
  { href: "/admin/pods", icon: MessageSquare, label: "Pods" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useClerkAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - uses sticky positioning instead of fixed */}
      <aside
        className={cn(
          "bg-slate-900 text-white flex flex-col transition-all duration-300 sticky top-0 h-screen shrink-0 z-40",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          {!collapsed && (
            <span className="text-xl font-bold text-white">FamVoy Admin</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-white hover:bg-slate-800"
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href || 
                (item.href !== "/admin" && location.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <a
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-700">
          <Link href="/">
            <a className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Back to App</span>}
            </a>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9"
                data-testid="input-admin-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2" data-testid="button-admin-menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || user?.avatar || undefined} />
                    <AvatarFallback>
                      {user?.firstName?.[0] || user?.name?.[0] || "A"}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <span className="text-sm font-medium">
                      {user?.firstName || user?.name || "Admin"}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/">Back to App</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
