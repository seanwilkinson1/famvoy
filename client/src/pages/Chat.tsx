import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MessageCircle, Users, ChevronRight, Image as ImageIcon, Plus, Search, X, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Chat() {
  const [, setLocation] = useLocation();
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.conversations.getAll(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: api.users.getAll,
    enabled: showNewChat,
  });

  const createDirectMutation = useMutation({
    mutationFn: (userId: number) => api.conversations.getOrCreateDirect(userId),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setShowNewChat(false);
      setSearchQuery("");
      setLocation(`/conversation/${conversation.id}`);
    },
  });

  const filteredUsers = allUsers.filter((user: any) => {
    if (user.id === currentUser?.id) return false;
    if (!searchQuery) return true;
    return user.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 pt-14 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-charcoal font-heading">Messages</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="rounded-full bg-primary p-2 text-white shadow-sm active:scale-95 transition-transform"
            data-testid="button-new-chat"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="p-4">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h3>
            <p className="text-gray-500 mb-6 max-w-xs">
              Start a conversation with another family!
            </p>
            <button 
              onClick={() => setShowNewChat(true)}
              className="px-6 py-3 bg-primary text-white rounded-full font-medium"
              data-testid="button-start-chat"
            >
              Start a Chat
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv: any) => {
              const otherMembers = conv.members?.filter((m: any) => m.userId !== currentUser?.id) || [];
              const displayName = conv.isGroup 
                ? conv.name || otherMembers.map((m: any) => m.user?.name || 'Family').join(', ')
                : otherMembers[0]?.user?.name || 'Chat';
              const displayAvatar = conv.isGroup
                ? null
                : otherMembers[0]?.user?.avatar;

              return (
                <Link key={conv.id} href={`/conversation/${conv.id}`}>
                  <div 
                    className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="relative">
                      {displayAvatar ? (
                        <img 
                          src={displayAvatar} 
                          alt={displayName}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                          {conv.isGroup ? (
                            <Users className="w-7 h-7 text-white" />
                          ) : (
                            <User className="w-7 h-7 text-white" />
                          )}
                        </div>
                      )}
                      {conv.isGroup && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">{conv.members?.length || 0}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-charcoal truncate">{displayName}</h3>
                        {conv.lastMessage && (
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage ? (
                        <div className="flex items-center gap-1 text-sm text-gray-500 truncate">
                          {conv.lastMessage.imageUrl ? (
                            <>
                              <ImageIcon className="w-4 h-4" />
                              <span>Shared a photo</span>
                            </>
                          ) : (
                            <span className="truncate">{conv.lastMessage.content}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No messages yet</p>
                      )}
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-heading text-lg font-bold">New Message</h3>
              <button 
                onClick={() => { setShowNewChat(false); setSearchQuery(""); }}
                className="rounded-full bg-gray-100 p-2"
                data-testid="button-close-new-chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <Search className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search families..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-users"
                />
              </div>
            </div>
            
            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No families found</p>
              ) : filteredUsers.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => createDirectMutation.mutate(user.id)}
                  disabled={createDirectMutation.isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  data-testid={`user-${user.id}`}
                >
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name || 'Family'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-gray-900">{user.name || 'Family'}</p>
                    {user.location && (
                      <p className="text-xs text-gray-500">{user.location}</p>
                    )}
                  </div>
                  <MessageCircle className="w-5 h-5 text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
