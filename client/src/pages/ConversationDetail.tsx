import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Send, Users, User, ImageIcon, X, Loader2, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "🔥", "👏"];

export default function ConversationDetail() {
  const [match, params] = useRoute("/conversation/:id");
  const [, setLocation] = useLocation();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const conversationId = params?.id ? parseInt(params.id) : 0;

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action menu state (long-press)
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // Delete confirmation state
  const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => api.conversations.getById(conversationId),
    enabled: conversationId > 0,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["conversationMessages", conversationId],
    queryFn: () => api.conversations.getMessages(conversationId),
    enabled: conversationId > 0,
    refetchInterval: 3000,
  });

  const { data: reactions = [] } = useQuery({
    queryKey: ["conversationReactions", conversationId],
    queryFn: () => api.conversations.getReactions(conversationId),
    enabled: conversationId > 0,
    refetchInterval: 3000,
  });

  // Group reactions by messageId
  const reactionsByMessage = useMemo(() => {
    const map: Record<number, Array<{ emoji: string; count: number; hasReacted: boolean }>> = {};
    for (const r of reactions) {
      if (!map[r.messageId]) map[r.messageId] = [];
    }
    // Group by (messageId, emoji)
    const grouped: Record<string, { count: number; userIds: number[] }> = {};
    for (const r of reactions) {
      const key = `${r.messageId}:${r.emoji}`;
      if (!grouped[key]) grouped[key] = { count: 0, userIds: [] };
      grouped[key].count++;
      grouped[key].userIds.push(r.userId);
    }
    for (const [key, val] of Object.entries(grouped)) {
      const [msgId, emoji] = key.split(":");
      const numMsgId = parseInt(msgId);
      if (!map[numMsgId]) map[numMsgId] = [];
      map[numMsgId].push({
        emoji,
        count: val.count,
        hasReacted: val.userIds.includes(currentUser?.id || 0),
      });
    }
    return map;
  }, [reactions, currentUser?.id]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | undefined;
      if (selectedImage) {
        setIsUploading(true);
        try {
          imageUrl = await api.upload.image(selectedImage, (p) => setUploadProgress(p));
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
      const content = messageInput.trim() || "";
      return api.conversations.sendMessage(conversationId, content, imageUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversationMessages", conversationId] });
      setMessageInput("");
      setSelectedImage(null);
      setImagePreview(null);
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, content }: { messageId: number; content: string }) =>
      api.conversations.editMessage(conversationId, messageId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversationMessages", conversationId] });
      setEditingMessageId(null);
      setEditContent("");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: number) => api.conversations.deleteMessage(conversationId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversationMessages", conversationId] });
      setDeleteMessageId(null);
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      api.conversations.addReaction(conversationId, messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversationReactions", conversationId] });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      api.conversations.removeReaction(conversationId, messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversationReactions", conversationId] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close action menu on tap outside
  useEffect(() => {
    if (activeMessageId !== null) {
      const handler = () => setActiveMessageId(null);
      window.addEventListener("click", handler);
      return () => window.removeEventListener("click", handler);
    }
  }, [activeMessageId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSend = !sendMessageMutation.isPending && !isUploading && (messageInput.trim() || selectedImage);

  const handleSend = () => {
    if (!canSend) return;
    sendMessageMutation.mutate();
  };

  const handleLongPressStart = useCallback((msgId: number, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      setActiveMessageId(msgId);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleReactionToggle = (messageId: number, emoji: string) => {
    const msgReactions = reactionsByMessage[messageId] || [];
    const existing = msgReactions.find(r => r.emoji === emoji);
    if (existing?.hasReacted) {
      removeReactionMutation.mutate({ messageId, emoji });
    } else {
      addReactionMutation.mutate({ messageId, emoji });
    }
    setActiveMessageId(null);
  };

  if (!match || !conversation) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const otherMembers = conversation.members?.filter((m: any) => m.id !== currentUser?.id) || [];
  const displayName = conversation.isGroup
    ? conversation.name || otherMembers.map((m: any) => m.name || 'Family').join(', ')
    : otherMembers[0]?.name || 'Chat';
  const displayAvatar = conversation.isGroup
    ? null
    : otherMembers[0]?.avatar;

  return (
    <div className="flex flex-1 flex-col bg-muted overflow-hidden md:max-w-4xl md:mx-auto md:px-8">
      {/* Header */}
      <div className="border-b border-border bg-white px-4 py-4 shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/chat")}
            className="rounded-full bg-muted p-2 active:scale-90 transition-transform"
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>

          <div className="flex items-center gap-3 flex-1">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                {conversation.isGroup ? (
                  <Users className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
            )}
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground">{displayName}</h1>
              {conversation.isGroup && (
                <p className="text-xs text-muted-foreground">{conversation.members?.length || 0} members</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No messages yet. Say hi!</p>
          </div>
        ) : messages.map((msg: any) => {
          const isMe = msg.userId === currentUser?.id;
          const msgReactions = reactionsByMessage[msg.id] || [];
          const isEditing = editingMessageId === msg.id;

          return (
            <div key={msg.id} className="relative">
              <div className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                {!isMe ? (
                  <img
                    src={msg.user?.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'}
                    className="h-8 w-8 rounded-full object-cover"
                    alt={msg.user?.name || 'Family'}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">You</div>
                )}
                <div
                  className={cn(
                    "rounded-2xl shadow-sm max-w-[75%] overflow-hidden p-3",
                    isMe ? "rounded-tr-none bg-primary" : "rounded-tl-none bg-white"
                  )}
                  onTouchStart={(e) => handleLongPressStart(msg.id, e)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                  onContextMenu={(e) => { e.preventDefault(); setActiveMessageId(msg.id); }}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="Shared image"
                      className="w-full max-h-64 object-cover mb-2 rounded-lg cursor-pointer"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  )}
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-2 py-1 text-sm rounded border border-border bg-white text-gray-800 outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editContent.trim()) {
                            editMessageMutation.mutate({ messageId: msg.id, content: editContent.trim() });
                          }
                          if (e.key === "Escape") {
                            setEditingMessageId(null);
                            setEditContent("");
                          }
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setEditingMessageId(null); setEditContent(""); }}
                          className="text-xs px-2 py-1 rounded bg-white/20 text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => editContent.trim() && editMessageMutation.mutate({ messageId: msg.id, content: editContent.trim() })}
                          disabled={!editContent.trim() || editMessageMutation.isPending}
                          className="text-xs px-2 py-1 rounded bg-white text-primary font-medium disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {msg.content && (
                        <p className={cn("text-sm", isMe ? "text-white" : "text-gray-800")}>{msg.content}</p>
                      )}
                      <span className={cn("mt-1 block text-[10px]", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.editedAt && <span className="ml-1">(edited)</span>}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Reaction pills */}
              {msgReactions.length > 0 && (
                <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end mr-11" : "ml-11")}>
                  {msgReactions.map(({ emoji, count, hasReacted }) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactionToggle(msg.id, emoji)}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                        hasReacted
                          ? "bg-primary/10 border-primary/30"
                          : "bg-white border-border hover:border-primary/30"
                      )}
                    >
                      {emoji}{count > 1 && <span className="ml-0.5">{count}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Action menu (long-press) */}
              {activeMessageId === msg.id && (
                <div
                  className={cn(
                    "absolute z-20 bg-white rounded-2xl shadow-lg border border-border p-2",
                    isMe ? "right-11 -top-2" : "left-11 -top-2"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Emoji row */}
                  <div className="flex gap-1 mb-1 pb-1 border-b border-border">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReactionToggle(msg.id, emoji)}
                        className="text-lg p-1 rounded hover:bg-muted active:scale-110 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {/* Edit / Delete (own messages only) */}
                  {isMe && (
                    <div className="flex flex-col">
                      <button
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditContent(msg.content || "");
                          setActiveMessageId(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteMessageId(msg.id);
                          setActiveMessageId(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="border-t border-border bg-white px-4 py-2 flex-shrink-0">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 rounded-lg object-cover" />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
                {uploadProgress > 0 && (
                  <span className="text-xs text-white ml-1">{uploadProgress}%</span>
                )}
              </div>
            )}
            {!isUploading && (
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 bg-foreground text-white rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-white p-4 flex-shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelect}
          className="hidden"
        />
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isUploading}
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            type="text"
            placeholder="Message..."
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSend && handleSend()}
            data-testid="input-message"
          />
          <button
            className="rounded-full bg-primary p-2 text-white shadow-sm active:scale-90 transition-transform disabled:opacity-50"
            onClick={handleSend}
            disabled={!canSend}
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteMessageId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteMessageId(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-2">Delete Message</h3>
            <p className="text-sm text-muted-foreground mb-4">Are you sure you want to delete this message? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteMessageId(null)}
                className="px-4 py-2 text-sm rounded-full border border-border text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMessageMutation.mutate(deleteMessageId)}
                disabled={deleteMessageMutation.isPending}
                className="px-4 py-2 text-sm rounded-full bg-red-600 text-white disabled:opacity-50"
              >
                {deleteMessageMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
