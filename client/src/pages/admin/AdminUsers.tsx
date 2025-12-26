import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  MoreHorizontal,
  UserCog,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
} from "lucide-react";

interface User {
  id: number;
  clerkId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  avatar: string | null;
  profileImageUrl: string | null;
  location: string | null;
  isAgent: boolean;
  isAdmin: boolean;
  adminRole: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    isAdmin: false,
    isAgent: false,
    adminRole: "",
  });

  const { data, isLoading, error } = useQuery<{ users: User[]; total: number; pages: number }>({
    queryKey: ["/api/admin/users", { search, page, role: roleFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      if (roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { userId: number; isAdmin: boolean; isAgent: boolean; adminRole: string }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditDialog(false);
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      isAdmin: user.isAdmin,
      isAgent: user.isAgent,
      adminRole: user.adminRole || "",
    });
    setEditDialog(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      ...editForm,
    });
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || user.email || "Unknown";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-users-title">User Management</h1>
            <p className="text-slate-500 mt-1">Manage all users and their permissions</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
            <Users className="h-5 w-5" />
            <span className="font-semibold">{data?.total || 0}</span>
            <span className="text-blue-600">Total Users</span>
          </div>
        </div>

        {/* Filters Bar */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-200 focus:border-teal-500"
                  data-testid="input-search-users"
                />
              </div>
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger className="w-44 h-10 bg-white border-slate-200" data-testid="select-role-filter">
                  <Filter className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="agent">Agents</SelectItem>
                  <SelectItem value="user">Regular Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <Shield className="h-12 w-12 mb-4 text-slate-300" />
                <p className="font-medium">Unable to load users</p>
                <p className="text-sm">You may not have admin permissions</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">User</TableHead>
                      <TableHead className="font-semibold text-slate-700">Email</TableHead>
                      <TableHead className="font-semibold text-slate-700">Location</TableHead>
                      <TableHead className="font-semibold text-slate-700">Role</TableHead>
                      <TableHead className="font-semibold text-slate-700">Joined</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.users?.map((user) => (
                      <TableRow key={user.id} className="hover:bg-slate-50" data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-slate-200">
                              <AvatarImage src={user.profileImageUrl || user.avatar || undefined} />
                              <AvatarFallback className="bg-teal-100 text-teal-700 font-medium">
                                {getUserDisplayName(user)[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-slate-900">{getUserDisplayName(user)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{user.email || "-"}</TableCell>
                        <TableCell className="text-slate-600">{user.location || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            {user.isAdmin && (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-medium">Admin</Badge>
                            )}
                            {user.isAgent && (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-medium">Agent</Badge>
                            )}
                            {!user.isAdmin && !user.isAgent && (
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">User</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900" data-testid={`button-user-menu-${user.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                <UserCog className="h-4 w-4 mr-2" />
                                Edit Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                View Activity
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.users || data.users.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Showing {data?.users?.length || 0} of {data?.total || 0} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8"
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-600 px-2">Page {page} of {data?.pages || 1}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= (data?.pages || 1)}
                      className="h-8"
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <Avatar className="h-14 w-14 border-2 border-white shadow">
                <AvatarImage src={selectedUser?.profileImageUrl || selectedUser?.avatar || undefined} />
                <AvatarFallback className="bg-teal-100 text-teal-700 text-lg font-medium">
                  {selectedUser ? getUserDisplayName(selectedUser)[0]?.toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{selectedUser ? getUserDisplayName(selectedUser) : ""}</p>
                <p className="text-sm text-slate-500">{selectedUser?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <Label className="text-slate-700 font-medium">Admin Access</Label>
                <Select
                  value={editForm.isAdmin ? "yes" : "no"}
                  onValueChange={(v) => setEditForm({ ...editForm, isAdmin: v === "yes" })}
                >
                  <SelectTrigger className="w-24 h-9" data-testid="select-is-admin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <Label className="text-slate-700 font-medium">Agent Access</Label>
                <Select
                  value={editForm.isAgent ? "yes" : "no"}
                  onValueChange={(v) => setEditForm({ ...editForm, isAgent: v === "yes" })}
                >
                  <SelectTrigger className="w-24 h-9" data-testid="select-is-agent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.isAdmin && (
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-red-50">
                  <Label className="text-slate-700 font-medium">Admin Role</Label>
                  <Select
                    value={editForm.adminRole}
                    onValueChange={(v) => setEditForm({ ...editForm, adminRole: v })}
                  >
                    <SelectTrigger className="w-36 h-9" data-testid="select-admin-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="content_admin">Content Admin</SelectItem>
                      <SelectItem value="support_admin">Support Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateUserMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
              {updateUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
