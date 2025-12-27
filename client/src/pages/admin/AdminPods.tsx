import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Users,
  MessageSquare,
  Lock,
  Unlock,
  Image,
} from "lucide-react";

interface Pod {
  id: number;
  name: string;
  description: string;
  image: string | null;
  category: string | null;
  isDirect: boolean;
  isPublic: boolean;
  memberCount: number;
  messageCount: number;
  creator: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
  createdAt: string;
}

export default function AdminPods() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const { data, isLoading } = useQuery<{ pods: Pod[]; total: number; pages: number }>({
    queryKey: ["/api/admin/pods", { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/pods?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pods");
      return res.json();
    },
  });

  const togglePublicMutation = useMutation({
    mutationFn: (data: { id: number; isPublic: boolean }) =>
      apiRequest("PATCH", `/api/admin/pods/${data.id}`, { isPublic: data.isPublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pods"] });
      toast({ title: "Pod updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update pod", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-pods-title">Pod Management</h1>
            <p className="text-muted-foreground">Moderate and manage community pods</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pods..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-search-pods"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pod</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.pods?.map((pod) => (
                      <TableRow key={pod.id} data-testid={`row-pod-${pod.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {pod.image ? (
                                <img src={pod.image} alt={pod.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Users className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{pod.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">{pod.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{pod.category || "General"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {pod.memberCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            {pod.messageCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pod.creator ? (
                            <div>
                              <p>{pod.creator.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{pod.creator.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {pod.isDirect ? (
                            <Badge variant="secondary">DM</Badge>
                          ) : pod.isPublic ? (
                            <Badge className="bg-green-100 text-green-700">Public</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700">Private</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Messages
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => togglePublicMutation.mutate({ id: pod.id, isPublic: !pod.isPublic })}
                              >
                                {pod.isPublic ? (
                                  <>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Make Private
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="h-4 w-4 mr-2" />
                                    Make Public
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {data?.pods?.length || 0} of {data?.total || 0} pods
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">Page {page}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (data?.pages || 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
