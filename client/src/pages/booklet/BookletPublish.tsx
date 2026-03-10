import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, Users, Lock, Loader2, Check, Link2, Mail, Send } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", description: "Anyone with the link can view", icon: Globe },
  { value: "friends", label: "Friends Only", description: "Only your connections can view", icon: Users },
  { value: "private", label: "Private", description: "Only you can view", icon: Lock },
] as const;

export default function BookletPublish() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const tripId = parseInt(id!);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId, "booklet"],
    queryFn: () => api.booklet.get(tripId),
  });

  const [selectedVisibility, setSelectedVisibility] = useState<string>("public");
  const [isPublished, setIsPublished] = useState(false);

  const publishMutation = useMutation({
    mutationFn: () => api.booklet.publish(tripId, selectedVisibility),
    onSuccess: () => {
      setIsPublished(true);
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "booklet"] });
      toast({ title: "Booklet published!", description: "Your trip booklet is now live." });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF7F2]">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!data) return null;

  const { booklet, chapters, memories } = data;
  const alreadyPublished = !!booklet.publishedAt;

  if (isPublished || alreadyPublished) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <div className="sticky top-0 z-10 bg-[#FAF7F2]/80 backdrop-blur-sm border-b border-stone-200/50">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(`/trips/${tripId}/booklet`)} className="p-1">
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <span className="text-sm font-medium text-stone-600">Published</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto px-4 pt-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mb-2">
            Your booklet is live!
          </h1>
          <p className="text-stone-500 mb-8">
            Share your trip memories with others
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + `/trips/${tripId}/booklet`);
                toast({ title: "Link copied!" });
              }}
              className="w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-colors"
            >
              <Link2 className="w-5 h-5 text-stone-400" />
              <span className="text-sm font-medium text-stone-700">Copy Link</span>
            </button>

            <button className="w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-colors">
              <Mail className="w-5 h-5 text-stone-400" />
              <span className="text-sm font-medium text-stone-700">Email</span>
            </button>

            <button className="w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-colors">
              <Send className="w-5 h-5 text-stone-400" />
              <span className="text-sm font-medium text-stone-700">Send to Pod</span>
            </button>
          </div>

          <Button
            variant="ghost"
            className="mt-8"
            onClick={() => navigate(`/trips/${tripId}/booklet`)}
          >
            Back to Booklet
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF7F2]/80 backdrop-blur-sm border-b border-stone-200/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(`/trips/${tripId}/booklet`)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <span className="text-sm font-medium text-stone-600">Publish Booklet</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Preview card */}
        <div className="mt-6 p-5 bg-white rounded-xl border border-stone-200 text-center">
          {booklet.coverEmoji && <span className="text-3xl mb-2 block">{booklet.coverEmoji}</span>}
          <h2 className="font-serif text-xl font-bold text-stone-900">{booklet.title}</h2>
          {booklet.subtitle && <p className="text-sm text-stone-500 mt-1">{booklet.subtitle}</p>}
          <div className="flex justify-center gap-4 mt-3 text-xs text-stone-400">
            <span>{chapters.length} chapters</span>
            <span>{memories.length} memories</span>
          </div>
        </div>

        {/* Visibility selector */}
        <div className="mt-8">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Who can see this?
          </h3>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSelectedVisibility(value)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors text-left ${
                  selectedVisibility === value
                    ? "bg-stone-800 border-stone-800 text-white"
                    : "bg-white border-stone-200 hover:border-stone-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${selectedVisibility === value ? "text-white" : "text-stone-400"}`} />
                <div>
                  <p className={`text-sm font-medium ${selectedVisibility === value ? "text-white" : "text-stone-700"}`}>
                    {label}
                  </p>
                  <p className={`text-xs ${selectedVisibility === value ? "text-stone-300" : "text-stone-400"}`}>
                    {description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Publish button */}
        <div className="mt-8">
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            className="w-full bg-stone-800 text-white hover:bg-stone-700 h-12 text-base"
          >
            {publishMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            Publish Booklet
          </Button>
        </div>
      </div>
    </div>
  );
}
