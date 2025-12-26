import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  FileText,
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

  const { data: experiencesData, isLoading, error } = useQuery<{ experiences: Experience[]; total: number; pages: number }>({
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
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-content-title">Content Management</h1>
            <p className="text-slate-500 mt-1">Manage experiences and destinations</p>
          </div>
          <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg">
            <FileText className="h-5 w-5" />
            <span className="font-semibold">{experiencesData?.total || 0}</span>
            <span className="text-purple-600">Experiences</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="experiences" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-experiences">Experiences</TabsTrigger>
            <TabsTrigger value="destinations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-destinations">Destinations</TabsTrigger>
          </TabsList>

          <TabsContent value="experiences" className="space-y-4">
            {/* Filters Bar */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search experiences..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-10 bg-white border-slate-200 focus:border-teal-500"
                    data-testid="input-search-experiences"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Experiences Table */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <FileText className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="font-medium">Unable to load content</p>
                    <p className="text-sm">You may not have admin permissions</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-semibold text-slate-700">Experience</TableHead>
                          <TableHead className="font-semibold text-slate-700">Category</TableHead>
                          <TableHead className="font-semibold text-slate-700">Location</TableHead>
                          <TableHead className="font-semibold text-slate-700">Created By</TableHead>
                          <TableHead className="font-semibold text-slate-700">Date</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {experiencesData?.experiences?.map((exp) => (
                          <TableRow key={exp.id} className="hover:bg-slate-50" data-testid={`row-experience-${exp.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                  {exp.image ? (
                                    <img src={exp.image} alt={exp.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Image className="h-5 w-5 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{exp.title}</p>
                                  <p className="text-sm text-slate-500">{exp.duration} • {exp.cost}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600">{exp.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {exp.locationName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-slate-900">{exp.user?.name || "Unknown"}</p>
                                <p className="text-sm text-slate-500">{exp.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600">{new Date(exp.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => featureExperienceMutation.mutate(exp.id)}>
                                    <Star className="h-4 w-4 mr-2" />
                                    Feature
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
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
                        {(!experiencesData?.experiences || experiencesData.experiences.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                              No experiences found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                      <p className="text-sm text-slate-500">
                        Showing {experiencesData?.experiences?.length || 0} of {experiencesData?.total || 0} experiences
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600 px-2">Page {page}</span>
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => p + 1)} disabled={page >= (experiencesData?.pages || 1)}>
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
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="py-16">
                <div className="text-center text-slate-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium text-slate-700">Destination management coming soon</p>
                  <p className="text-sm mt-1">This feature is under development</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
