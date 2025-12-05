import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageCircle, X } from "lucide-react";
import type { User } from "@shared/schema";

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchedFamily: User | null;
  currentUser: User | null;
}

export function MatchModal({ isOpen, onClose, matchedFamily, currentUser }: MatchModalProps) {
  if (!matchedFamily || !currentUser) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-br from-primary via-teal-500 to-emerald-400 p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-[22px] bg-white p-6 text-center">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full bg-gray-100 p-2"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>

              {/* Sparkle Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500"
              >
                <Sparkles className="h-8 w-8 text-white" />
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-heading text-3xl font-bold bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent mb-2"
              >
                It's a Match!
              </motion.h2>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500 mb-6"
              >
                You and {matchedFamily.name || 'this family'} both want to connect!
              </motion.p>

              {/* Avatars */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="flex justify-center -space-x-6 mb-8"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'}
                  alt={currentUser.name || 'You'}
                  className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg"
                />
                <img
                  src={matchedFamily.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'}
                  alt={matchedFamily.name || 'Family'}
                  className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg"
                />
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <button
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/30"
                  data-testid="button-send-message"
                >
                  <MessageCircle className="h-5 w-5" />
                  Send a Message
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-sm font-medium text-gray-500"
                  data-testid="button-keep-swiping"
                >
                  Keep Swiping
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
