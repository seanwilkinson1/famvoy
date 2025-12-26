import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Send, Users, User } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ConversationDetail() {
  const [match, params] = useRoute("/conversation/:id");
  const [, setLocation] = useLocation();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const conversationId = params?.id ? parseInt(params.id) : 0;

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

  const sendMessageMutation = useMutation({
    mutationFn: () => api.conversations.sendMessage(conversationId, messageInput.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversationMessages", conversationId] });
      setMessageInput("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!match || !conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const otherMembers = conversation.members?.filter((m: any) => m.userId !== currentUser?.id) || [];
  const displayName = conversation.isGroup 
    ? conversation.name || otherMembers.map((m: any) => m.user?.name || 'Family').join(', ')
    : otherMembers[0]?.user?.name || 'Chat';
  const displayAvatar = conversation.isGroup
    ? null
    : otherMembers[0]?.user?.avatar;

  return (
    <div className="flex flex-1 flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-4 py-4 shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation("/chat")} 
            className="rounded-full bg-gray-100 p-2 active:scale-90 transition-transform"
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
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
              <h1 className="font-heading text-lg font-bold text-gray-900">{displayName}</h1>
              {conversation.isGroup && (
                <p className="text-xs text-gray-500">{conversation.members?.length || 0} members</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <p className="text-sm">No messages yet. Say hi!</p>
          </div>
        ) : messages.map((msg: any) => {
          const isMe = msg.userId === currentUser?.id;
          
          return (
            <div key={msg.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
              {!isMe ? (
                <img 
                  src={msg.user?.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'} 
                  className="h-8 w-8 rounded-full object-cover" 
                  alt={msg.user?.name || 'Family'} 
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">You</div>
              )}
              <div className={cn(
                "rounded-2xl shadow-sm max-w-[75%] overflow-hidden p-3",
                isMe ? "rounded-tr-none bg-primary" : "rounded-tl-none bg-white"
              )}>
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Shared image" 
                    className="w-full max-h-64 object-cover mb-2 rounded-lg cursor-pointer"
                    onClick={() => window.open(msg.imageUrl, '_blank')}
                  />
                )}
                <p className={cn("text-sm", isMe ? "text-white" : "text-gray-800")}>{msg.content}</p>
                <span className={cn("mt-1 block text-[10px]", isMe ? "text-primary-foreground/70" : "text-gray-400")}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
          <input 
            type="text" 
            placeholder="Message..." 
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-gray-400"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && messageInput.trim() && sendMessageMutation.mutate()}
            data-testid="input-message"
          />
          <button 
            className="rounded-full bg-primary p-2 text-white shadow-sm active:scale-90 transition-transform disabled:opacity-50"
            onClick={() => sendMessageMutation.mutate()}
            disabled={sendMessageMutation.isPending || !messageInput.trim()}
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
