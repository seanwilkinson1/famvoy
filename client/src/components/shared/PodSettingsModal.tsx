import { X, Edit2, Users, Globe, Lock, LogOut, Trash2, Bell, BellOff, UserPlus, UserMinus, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Pod, User } from "@shared/schema";

interface PodSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pod: Pod;
  members: User[];
  currentUserId: number;
  onPodDeleted: () => void;
  onPodLeft: () => void;
}

type SettingsView = "main" | "edit" | "members" | "invite";

export function PodSettingsModal({
  isOpen,
  onClose,
  pod,
  members,
  currentUserId,
  onPodDeleted,
  onPodLeft,
}: PodSettingsModalProps) {
  const [view, setView] = useState<SettingsView>("main");
  const [editName, setEditName] = useState(pod.name);
  const [editDescription, setEditDescription] = useState(pod.description);
  const [isPublic, setIsPublic] = useState(pod.isPublic ?? true);
  const [isMuted, setIsMuted] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  const queryClient = useQueryClient();
  const isCreator = pod.creatorId === currentUserId;

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string; isPublic?: boolean }) =>
      api.pods.update(pod.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podDetails", String(pod.id)] });
      toast.success("Pod updated");
      setView("main");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.pods.delete(pod.id),
    onSuccess: () => {
      toast.success("Pod deleted");
      onPodDeleted();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.pods.leave(pod.id),
    onSuccess: () => {
      toast.success("You left the pod");
      onPodLeft();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.pods.invite(pod.id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podDetails", String(pod.id)] });
      toast.success("Member invited!");
      setInviteEmail("");
      setView("members");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => api.pods.removeMember(pod.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podDetails", String(pod.id)] });
      toast.success("Member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSaveEdit = () => {
    updateMutation.mutate({
      name: editName,
      description: editDescription,
    });
  };

  const handleTogglePrivacy = () => {
    const newIsPublic = !isPublic;
    setIsPublic(newIsPublic);
    updateMutation.mutate({ isPublic: newIsPublic });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate(inviteEmail.trim());
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white rounded-t-3xl max-h-[85vh] overflow-hidden"
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-gray-200" />
          </div>

          <div className="px-6 pb-8 overflow-y-auto max-h-[calc(85vh-40px)]">
            {view === "main" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-xl font-bold text-gray-900">Pod Settings</h2>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                    data-testid="button-close-settings"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-2">
                  {isCreator && (
                    <button
                      onClick={() => {
                        setEditName(pod.name);
                        setEditDescription(pod.description);
                        setView("edit");
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                      data-testid="button-edit-pod"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Edit2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">Edit Pod Info</div>
                        <div className="text-sm text-gray-500">Change name and description</div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => setView("members")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                    data-testid="button-manage-members"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">Manage Members</div>
                      <div className="text-sm text-gray-500">{members.length} {members.length === 1 ? 'family' : 'families'}</div>
                    </div>
                  </button>

                  {isCreator && (
                    <button
                      onClick={handleTogglePrivacy}
                      disabled={updateMutation.isPending}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                      data-testid="button-toggle-privacy"
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        isPublic ? "bg-green-50" : "bg-amber-50"
                      )}>
                        {isPublic ? (
                          <Globe className="h-5 w-5 text-green-600" />
                        ) : (
                          <Lock className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">
                          {isPublic ? "Public Pod" : "Private Pod"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {isPublic ? "Anyone can find and join" : "Invite only"}
                        </div>
                      </div>
                      {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    </button>
                  )}

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                    data-testid="button-toggle-notifications"
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      isMuted ? "bg-gray-100" : "bg-purple-50"
                    )}>
                      {isMuted ? (
                        <BellOff className="h-5 w-5 text-gray-500" />
                      ) : (
                        <Bell className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">Notifications</div>
                      <div className="text-sm text-gray-500">
                        {isMuted ? "Muted" : "Enabled"}
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-gray-100 my-4" />

                  {!isCreator && (
                    <button
                      onClick={() => setShowLeaveConfirm(true)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 transition-colors"
                      data-testid="button-leave-pod"
                    >
                      <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                        <LogOut className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-red-600">Leave Pod</div>
                        <div className="text-sm text-gray-500">You can rejoin if it's public</div>
                      </div>
                    </button>
                  )}

                  {isCreator && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 transition-colors"
                      data-testid="button-delete-pod"
                    >
                      <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-red-600">Delete Pod</div>
                        <div className="text-sm text-gray-500">This cannot be undone</div>
                      </div>
                    </button>
                  )}
                </div>

                {showLeaveConfirm && (
                  <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                      <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">Leave Pod?</h3>
                      <p className="text-sm text-gray-500 mb-6">
                        Are you sure you want to leave "{pod.name}"?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowLeaveConfirm(false)}
                          className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => leaveMutation.mutate()}
                          disabled={leaveMutation.isPending}
                          className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
                        >
                          {leaveMutation.isPending ? "Leaving..." : "Leave"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showDeleteConfirm && (
                  <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                      <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">Delete Pod?</h3>
                      <p className="text-sm text-gray-500 mb-6">
                        Are you sure you want to delete "{pod.name}"? This will remove all messages and members. This action cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate()}
                          disabled={deleteMutation.isPending}
                          className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {view === "edit" && (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setView("main")}
                    className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                  <h2 className="font-heading text-xl font-bold text-gray-900">Edit Pod Info</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pod Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter pod name"
                      data-testid="input-pod-name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      placeholder="What's this pod about?"
                      data-testid="input-pod-description"
                    />
                  </div>

                  <button
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending || !editName.trim()}
                    className="w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
                    data-testid="button-save-pod"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {view === "members" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setView("main")}
                      className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                    <h2 className="font-heading text-xl font-bold text-gray-900">Members</h2>
                  </div>
                  <button
                    onClick={() => setView("invite")}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-bold"
                    data-testid="button-invite-member"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </button>
                </div>

                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-gray-50"
                      data-testid={`member-${member.id}`}
                    >
                      <img
                        src={member.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'}
                        alt={member.name || 'Member'}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{member.name}</div>
                        <div className="text-sm text-gray-500">
                          {member.id === pod.creatorId ? "Creator" : "Member"}
                        </div>
                      </div>
                      {isCreator && member.id !== currentUserId && member.id !== pod.creatorId && (
                        <button
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={removeMemberMutation.isPending}
                          className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <UserMinus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {view === "invite" && (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setView("members")}
                    className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                  <h2 className="font-heading text-xl font-bold text-gray-900">Invite by Email</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="friend@email.com"
                      data-testid="input-invite-email"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      The user must already have an account on FamVoy
                    </p>
                  </div>

                  <button
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending || !inviteEmail.trim()}
                    className="w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
                    data-testid="button-send-invite"
                  >
                    {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
