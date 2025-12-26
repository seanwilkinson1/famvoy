import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Map,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
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
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Trips",
      value: stats?.totalTrips || 0,
      icon: Map,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Total Revenue",
      value: `$${((stats?.totalRevenue || 0) / 100).toLocaleString()}`,
      icon: DollarSign,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's an overview of your app.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-export">
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-pending-concierge">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Concierge</p>
                  <p className="text-3xl font-bold mt-1">{stats?.pendingConcierge || 0}</p>
                </div>
                <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-pods">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Pods</p>
                  <p className="text-3xl font-bold mt-1">{stats?.activePods || 0}</p>
                </div>
                <div className="bg-teal-100 text-teal-600 p-3 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Users */}
          <Card data-testid="card-recent-users">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Users</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" data-testid="button-view-all-users">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentUsers?.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="secondary">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
                {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No recent users</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Trips */}
          <Card data-testid="card-recent-trips">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Trips</CardTitle>
              <Link href="/admin/trips">
                <Button variant="ghost" size="sm" data-testid="button-view-all-trips">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentTrips?.slice(0, 5).map((trip) => (
                  <div key={trip.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{trip.name}</p>
                      <p className="text-sm text-muted-foreground">{trip.destination}</p>
                    </div>
                    <Badge 
                      variant={trip.status === "confirmed" ? "default" : "secondary"}
                    >
                      {trip.status}
                    </Badge>
                  </div>
                ))}
                {(!stats?.recentTrips || stats.recentTrips.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No recent trips</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Bookings */}
          <Card data-testid="card-pending-bookings">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pending Bookings</CardTitle>
              <Link href="/admin/bookings">
                <Button variant="ghost" size="sm" data-testid="button-view-all-bookings">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.pendingBookings?.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{booking.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-600">
                      {booking.status}
                    </Badge>
                  </div>
                ))}
                {(!stats?.pendingBookings || stats.pendingBookings.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No pending bookings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
