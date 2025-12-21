import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MessageCircle, Users, ChevronRight, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";

export default function Chat() {
  const { data: pods = [], isLoading } = useQuery({
    queryKey: ["pods"],
    queryFn: () => api.pods.getAll(),
  });

  const { data: podsWithMessages = [] } = useQuery({
    queryKey: ["podsWithMessages", pods.map((p: any) => p.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        pods.map(async (pod: any) => {
          try {
            const messages = await api.pods.getMessages(pod.id);
            const lastMessage = messages[messages.length - 1];
            return { ...pod, lastMessage };
          } catch {
            return { ...pod, lastMessage: undefined };
          }
        })
      );
      return results.sort((a: any, b: any) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      });
    },
    enabled: pods.length > 0,
  });

  const displayPods: any[] = podsWithMessages.length > 0 ? podsWithMessages : pods;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-charcoal">Messages</h1>

      {displayPods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No conversations yet</h3>
          <p className="text-gray-500 mb-6 max-w-xs">
            Join or create a pod to start chatting with other families!
          </p>
          <Link href="/pods">
            <button className="px-6 py-3 bg-warm-teal text-white rounded-full font-medium" data-testid="button-go-to-pods">
              Find Pods
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {displayPods.map((pod) => (
            <Link key={pod.id} href={`/pod/${pod.id}?tab=chat`}>
              <div 
                className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                data-testid={`chat-pod-${pod.id}`}
              >
                <div className="relative">
                  <img 
                    src={pod.image || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=100"} 
                    alt={pod.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-warm-teal rounded-full flex items-center justify-center">
                    <Users className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-charcoal truncate">{pod.name}</h3>
                    {'lastMessage' in pod && pod.lastMessage && (
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(pod.lastMessage.createdAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  {'lastMessage' in pod && pod.lastMessage ? (
                    <div className="flex items-center gap-1 text-sm text-gray-500 truncate">
                      {pod.lastMessage.messageType === "image" ? (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          <span>Shared a photo</span>
                        </>
                      ) : pod.lastMessage.messageType === "experience" ? (
                        <span>Shared an experience</span>
                      ) : (
                        <span className="truncate">{pod.lastMessage.content}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No messages yet</p>
                  )}
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
