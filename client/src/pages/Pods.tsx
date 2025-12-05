import { pods } from "@/lib/data";
import { PodCard } from "@/components/shared/PodCard";
import { Plus } from "lucide-react";

export default function Pods() {
  return (
    <div className="min-h-screen bg-background px-6 pt-14 pb-32">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-gray-900">Your Pods</h1>
        <button className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/20 active:scale-95">
          <Plus className="h-4 w-4" />
          Create
        </button>
      </div>

      <div className="space-y-4">
        {pods.map((pod) => (
          <PodCard key={pod.id} pod={pod} />
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-secondary/30 p-6 text-center">
        <h3 className="font-heading text-lg font-bold text-secondary-foreground">Find more families?</h3>
        <p className="mt-2 text-sm text-gray-600">
          Connect with families near you who share your interests.
        </p>
        <button className="mt-4 w-full rounded-xl bg-white py-3 font-bold text-primary shadow-sm active:scale-95">
          Browse Nearby Pods
        </button>
      </div>
    </div>
  );
}
