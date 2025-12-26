import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Map,
  ShoppingCart,
  DollarSign,
  Clock,
  Loader2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface DashboardStats {
  totalUsers: number;
  totalTrips: number;
  totalOrders: number;
  totalRevenue: number;
  pendingConcierge: number;
  activePods: number;
  recentUsers: Array<{
    id: number;
    name: string | null;
    email: string | null;
    createdAt: string;
  }>;
  recentTrips: Array<{
    id: number;
    name: string;
    destination: string;
    status: string;
    createdAt: string;
  }>;
  pendingBookings: Array<{
    id: number;
    itemName: string;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <p className="font-medium">Unable to load dashboard</p>
          <p className="text-sm">You may not have admin permissions</p>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Total Trips",
      value: stats?.totalTrips || 0,
      icon: Map,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      title: "Total Revenue",
      value: `$${((stats?.totalRevenue || 0) / 100).toLocaleString()}`,
      icon: DollarSign,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome back! Here's an overview of your app.</p>
          </div>
          <Button variant="outline" className="border-slate-300" data-testid="button-export">
            <TrendingUp className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className={`border ${stat.borderColor} shadow-sm hover:shadow-md transition-shadow`} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-orange-200 shadow-sm" data-testid="card-pending-concierge">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Pending Concierge</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.pendingConcierge || 0}</p>
                  <p className="text-sm text-orange-600 mt-1">Requests awaiting action</p>
                </div>
                <div className="bg-orange-50 text-orange-600 p-3 rounded-xl">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-200 shadow-sm" data-testid="card-active-pods">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Pods</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.activePods || 0}</p>
                  <p className="text-sm text-teal-600 mt-1">Family groups connected</p>
                </div>
                <div className="bg-teal-50 text-teal-600 p-3 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Users */}
          <Card className="border-slate-200 shadow-sm" data-testid="card-recent-users">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-900">Recent Users</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" data-testid="button-view-all-users">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {stats?.recentUsers?.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{user.name || "Unknown"}</p>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 ml-2 shrink-0">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
                {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                  <p className="text-slate-400 text-center py-8">No recent users</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Trips */}
          <Card className="border-slate-200 shadow-sm" data-testid="card-recent-trips">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-900">Recent Trips</CardTitle>
              <Link href="/admin/trips">
                <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" data-testid="button-view-all-trips">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {stats?.recentTrips?.slice(0, 5).map((trip) => (
                  <div key={trip.id} className="flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{trip.name}</p>
                      <p className="text-sm text-slate-500 truncate">{trip.destination}</p>
                    </div>
                    <Badge 
                      className={
                        trip.status === "confirmed" 
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                      }
                    >
                      {trip.status}
                    </Badge>
                  </div>
                ))}
                {(!stats?.recentTrips || stats.recentTrips.length === 0) && (
                  <p className="text-slate-400 text-center py-8">No recent trips</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Bookings */}
          <Card className="border-slate-200 shadow-sm" data-testid="card-pending-bookings">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-900">Pending Bookings</CardTitle>
              <Link href="/admin/bookings">
                <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" data-testid="button-view-all-bookings">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {stats?.pendingBookings?.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{booking.itemName}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                      {booking.status}
                    </Badge>
                  </div>
                ))}
                {(!stats?.pendingBookings || stats.pendingBookings.length === 0) && (
                  <p className="text-slate-400 text-center py-8">No pending bookings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
