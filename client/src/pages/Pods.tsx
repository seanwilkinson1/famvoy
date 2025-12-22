import { PodCard } from "@/components/shared/PodCard";
import { Plus, Search, Users, Compass, X } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Pod } from "@shared/schema";

const POD_CATEGORIES = [
  "Sports & Activities",
  "Arts & Crafts",
  "Education",
  "Outdoor Adventures",
  "Playdates",
  "Special Needs",
  "Single Parents",
  "Working Parents",
  "Other",
];

type TabType = "your-pods" | "discover";

export default function Pods() {
  const [activeTab, setActiveTab] = useState<TabType>("your-pods");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPodName, setNewPodName] = useState("");
  const [newPodDescription, setNewPodDescription] = useState("");
  const [newPodCategory, setNewPodCategory] = useState("");
  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: userPods = [], isLoading: loadingUserPods } = useQuery({
    queryKey: ["userPods", currentUser?.id],
    queryFn: () => currentUser ? api.users.getPods(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const { data: discoverPods = [], isLoading: loadingDiscoverPods } = useQuery({
    queryKey: ["discoverPods"],
    queryFn: api.pods.discover,
    enabled: activeTab === "discover",
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["podSearch", searchQuery],
    queryFn: () => api.pods.search(searchQuery),
    enabled: searchQuery.length > 1,
  });

  const createPodMutation = useMutation({
    mutationFn: async () => {
      return api.pods.createGroup({
        name: newPodName,
        description: newPodDescription,
        category: newPodCategory || undefined,
      });
    },
    onSuccess: (pod) => {
      queryClient.invalidateQueries({ queryKey: ["userPods"] });
      queryClient.invalidateQueries({ queryKey: ["discoverPods"] });
      setShowCreateModal(false);
      setNewPodName("");
      setNewPodDescription("");
      setNewPodCategory("");
      setLocation(`/pod/${pod.id}`);
    },
  });

  const joinPodMutation = useMutation({
    mutationFn: async (podId: number) => {
      await api.pods.join(podId);
      return podId;
    },
    onSuccess: (podId) => {
      queryClient.invalidateQueries({ queryKey: ["userPods"] });
      queryClient.invalidateQueries({ queryKey: ["discoverPods"] });
      setLocation(`/pod/${podId}`);
    },
  });

  const userPodIds = new Set(userPods.map(p => p.id));
  const displayPods = searchQuery.length > 1 
    ? searchResults 
    : (activeTab === "your-pods" ? userPods : discoverPods.filter(p => !userPodIds.has(p.id)));

  return (
    <div className="min-h-screen bg-background px-6 pt-14 md:pt-8 pb-32 md:pb-8 md:max-w-6xl md:mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-gray-900">Pods</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/20 active:scale-95"
          data-testid="button-create-pod"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-2xl bg-gray-100 p-1">
        {[
          { id: "your-pods" as const, icon: Users, label: "Your Pods" },
          { id: "discover" as const, icon: Compass, label: "Discover" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all",
              activeTab === tab.id
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search (only on discover tab) */}
      {activeTab === "discover" && (
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search pods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl bg-gray-100 py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="input-search-pods"
          />
        </div>
      )}

      {/* Pod List */}
      {(activeTab === "your-pods" ? loadingUserPods : loadingDiscoverPods) ? (
        <div className="text-center py-8 text-gray-400">Loading pods...</div>
      ) : displayPods.length === 0 ? (
        <div className="text-center py-12">
          {activeTab === "your-pods" ? (
            <>
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">You haven't joined any pods yet</p>
              <p className="text-sm text-gray-400 mb-4">Create a pod or discover groups to join</p>
              <button 
                onClick={() => setActiveTab("discover")}
                className="text-primary font-bold text-sm"
                data-testid="button-browse-pods"
              >
                Browse Pods
              </button>
            </>
          ) : (
            <>
              <Compass className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">No pods to discover yet</p>
              <p className="text-sm text-gray-400">Be the first to create a pod!</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
          {displayPods.map((pod) => (
            <div key={pod.id} className="relative">
              <PodCard pod={pod} />
              {activeTab === "discover" && !userPodIds.has(pod.id) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    joinPodMutation.mutate(pod.id);
                  }}
                  disabled={joinPodMutation.isPending}
                  className="absolute right-4 top-4 rounded-full px-4 py-1.5 text-xs font-bold text-white"
                  style={{ backgroundColor: '#14b8a6' }}
                  data-testid={`button-join-pod-${pod.id}`}
                >
                  {joinPodMutation.isPending ? "Joining..." : "Join"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Pod Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold">Create a Pod</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 hover:bg-gray-100"
                data-testid="button-close-create-modal"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pod Name
                </label>
                <input
                  type="text"
                  value={newPodName}
                  onChange={(e) => setNewPodName(e.target.value)}
                  placeholder="e.g., Weekend Soccer Families"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-pod-name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newPodDescription}
                  onChange={(e) => setNewPodDescription(e.target.value)}
                  placeholder="What's this pod about?"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  data-testid="input-pod-description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category (optional)
                </label>
                <select
                  value={newPodCategory}
                  onChange={(e) => setNewPodCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  data-testid="select-pod-category"
                >
                  <option value="">Select a category</option>
                  {POD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => createPodMutation.mutate()}
                disabled={!newPodName || !newPodDescription || createPodMutation.isPending}
                className="w-full rounded-xl py-3 font-bold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: '#14b8a6' }}
                data-testid="button-submit-create-pod"
              >
                {createPodMutation.isPending ? "Creating..." : "Create Pod"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
