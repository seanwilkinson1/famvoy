import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Trash2,
  Star,
  MapPin,
  Image,
} from "lucide-react";

interface Experience {
  id: number;
  title: string;
  image: string;
  duration: string;
  cost: string;
  ages: string;
  category: string;
  locationName: string;
  userId: number;
  user: {
    name: string | null;
    email: string | null;
  };
  createdAt: string;
}

export default function AdminContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("experiences");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: experiencesData, isLoading } = useQuery<{ experiences: Experience[]; total: number; pages: number }>({
    queryKey: ["/api/admin/experiences", { search, page }],
    enabled: activeTab === "experiences",
  });

  const deleteExperienceMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/experiences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experiences"] });
      toast({ title: "Experience deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const featureExperienceMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/experiences/${id}/feature`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experiences"] });
      toast({ title: "Experience featured" });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-content-title">Content Management</h1>
            <p className="text-muted-foreground">Manage experiences and destinations</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="experiences" data-testid="tab-experiences">Experiences</TabsTrigger>
            <TabsTrigger value="destinations" data-testid="tab-destinations">Destinations</TabsTrigger>
          </TabsList>

          <TabsContent value="experiences">
            <Card>
              <CardHeader>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search experiences..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-experiences"
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
                          <TableHead>Experience</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {experiencesData?.experiences?.map((exp) => (
                          <TableRow key={exp.id} data-testid={`row-experience-${exp.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                  {exp.image ? (
                                    <img src={exp.image} alt={exp.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Image className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{exp.title}</p>
                                  <p className="text-sm text-muted-foreground">{exp.duration} • {exp.cost}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{exp.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {exp.locationName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{exp.user?.name || "Unknown"}</p>
                                <p className="text-sm text-muted-foreground">{exp.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{new Date(exp.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => featureExperienceMutation.mutate(exp.id)}>
                                    <Star className="h-4 w-4 mr-2" />
                                    Feature
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => deleteExperienceMutation.mutate(exp.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
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
                        Showing {experiencesData?.experiences?.length || 0} of {experiencesData?.total || 0} experiences
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">Page {page}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (experiencesData?.pages || 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="destinations">
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Destination management coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
