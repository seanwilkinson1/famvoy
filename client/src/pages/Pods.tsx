import { PodCard } from "@/components/shared/PodCard";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Pods() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: pods = [], isLoading } = useQuery({
    queryKey: ["userPods", currentUser?.id],
    queryFn: () => currentUser ? api.users.getPods(currentUser.id) : [],
    enabled: !!currentUser,
  });

  return (
    <div className="min-h-screen bg-background px-6 pt-14 pb-32">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-gray-900">Your Pods</h1>
        <button 
          className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/20 active:scale-95"
          data-testid="button-create-pod"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading pods...</div>
      ) : pods.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">You haven't joined any pods yet</p>
          <button className="text-primary font-bold text-sm" data-testid="button-browse-pods">Browse Pods</button>
        </div>
      ) : (
        <div className="space-y-4">
          {pods.map((pod) => (
            <PodCard key={pod.id} pod={pod} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl bg-secondary/30 p-6 text-center">
        <h3 className="font-heading text-lg font-bold text-secondary-foreground">Find more families?</h3>
        <p className="mt-2 text-sm text-gray-600">
          Connect with families near you who share your interests.
        </p>
        <button className="mt-4 w-full rounded-xl bg-white py-3 font-bold text-primary shadow-sm active:scale-95" data-testid="button-browse-nearby">
          Browse Nearby Pods
        </button>
      </div>
    </div>
  );
}
