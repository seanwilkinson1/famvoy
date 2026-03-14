import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MessageCircle, Users, ChevronRight, Image as ImageIcon, Plus, Search, X, User, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Chat() {
  const [, setLocation] = useLocation();
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMode, setChatMode] = useState<"direct" | "group">("direct");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState("");
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
      resetNewChat();
      setLocation(`/conversation/${conversation.id}`);
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: () => api.conversations.create(selectedGroupUsers, groupName.trim() || undefined, true),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      resetNewChat();
      setLocation(`/conversation/${conversation.id}`);
    },
  });

  const resetNewChat = () => {
    setShowNewChat(false);
    setSearchQuery("");
    setChatMode("direct");
    setSelectedGroupUsers([]);
    setGroupName("");
  };

  const toggleGroupUser = (userId: number) => {
    setSelectedGroupUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = allUsers.filter((user: any) => {
    if (user.id === currentUser?.id) return false;
    if (!searchQuery) return true;
    return user.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-32 bg-border rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-border rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pb-20 md:pb-8 md:max-w-5xl md:mx-auto md:px-8">
      {/* Header */}
      <div className="bg-white px-4 pt-14 md:pt-8 pb-4 border-b border-border md:border-b-0 sticky top-0 z-10 md:max-w-4xl md:mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground font-heading">Messages</h1>
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
      <div className="p-4 md:max-w-4xl md:mx-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
            <p className="text-muted-foreground mb-6 max-w-xs">
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
              const otherMembers = conv.members?.filter((m: any) => m.id !== currentUser?.id) || [];
              const displayName = conv.isGroup
                ? conv.name || otherMembers.map((m: any) => m.name || 'Family').join(', ')
                : otherMembers[0]?.name || 'Chat';
              const displayAvatar = conv.isGroup
                ? null
                : otherMembers[0]?.avatar;

              return (
                <Link key={conv.id} href={`/conversation/${conv.id}`}>
                  <div 
                    className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
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
                        <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
                        {conv.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
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
                        <p className="text-sm text-muted-foreground">No messages yet</p>
                      )}
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end md:items-center md:justify-center">
          <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-heading text-lg font-bold">New Message</h3>
              <button
                onClick={resetNewChat}
                className="rounded-full bg-muted p-2"
                data-testid="button-close-new-chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="px-4 pt-3 pb-1">
              <div className="flex gap-2 bg-muted rounded-full p-1">
                <button
                  onClick={() => { setChatMode("direct"); setSelectedGroupUsers([]); }}
                  className={cn(
                    "flex-1 text-sm font-medium py-2 rounded-full transition-colors",
                    chatMode === "direct" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Direct Message
                </button>
                <button
                  onClick={() => setChatMode("group")}
                  className={cn(
                    "flex-1 text-sm font-medium py-2 rounded-full transition-colors",
                    chatMode === "group" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  New Group
                </button>
              </div>
            </div>

            {/* Group Name (group mode only) */}
            {chatMode === "group" && (
              <div className="px-4 pt-3">
                <input
                  type="text"
                  placeholder="Group name..."
                  className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  data-testid="input-group-name"
                />
              </div>
            )}

            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search families..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-users"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No families found</p>
              ) : filteredUsers.map((user: any) => {
                const isSelected = selectedGroupUsers.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      if (chatMode === "direct") {
                        createDirectMutation.mutate(user.id);
                      } else {
                        toggleGroupUser(user.id);
                      }
                    }}
                    disabled={chatMode === "direct" && createDirectMutation.isPending}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors disabled:opacity-50",
                      chatMode === "group" && isSelected ? "bg-primary/10 border border-primary/30" : "bg-muted hover:bg-muted"
                    )}
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
                      <p className="font-bold text-sm text-foreground">{user.name || 'Family'}</p>
                      {user.location && (
                        <p className="text-xs text-muted-foreground">{user.location}</p>
                      )}
                    </div>
                    {chatMode === "group" ? (
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-border"
                      )}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    ) : (
                      <MessageCircle className="w-5 h-5 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create Group Button */}
            {chatMode === "group" && selectedGroupUsers.length > 0 && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => createGroupMutation.mutate()}
                  disabled={createGroupMutation.isPending}
                  className="w-full py-3 bg-primary text-white rounded-full font-medium disabled:opacity-50"
                  data-testid="button-create-group"
                >
                  {createGroupMutation.isPending
                    ? "Creating..."
                    : `Create Group (${selectedGroupUsers.length} members)`}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
