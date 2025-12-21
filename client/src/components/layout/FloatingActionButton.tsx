import { useState } from "react";
import { Plus, X, MapPin, Plane, Users, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ActionItem {
  href: string;
  icon: React.ElementType;
  label: string;
  color: string;
}

const actions: ActionItem[] = [
  { href: "/create", icon: MapPin, label: "Create Experience", color: "bg-amber-500" },
  { href: "/pods?create=true", icon: Users, label: "Start a Pod", color: "bg-blue-500" },
  { href: "/trips", icon: Plane, label: "Plan a Trip", color: "bg-green-500" },
  { href: "/explore?mode=families", icon: UserPlus, label: "Find Families", color: "bg-purple-500" },
];

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-end gap-3">
        <AnimatePresence>
          {isOpen && (
            <>
              {actions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <Link href={action.href} onClick={() => setIsOpen(false)}>
                    <div className="flex items-center gap-3 cursor-pointer group" data-testid={`fab-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      <span className="px-3 py-2 bg-white rounded-full text-sm font-semibold text-gray-800 shadow-xl whitespace-nowrap">
                        {action.label}
                      </span>
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl border-2 border-white",
                        action.color
                      )}>
                        <action.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-colors",
            isOpen 
              ? "bg-gray-800 text-white" 
              : "bg-warm-teal text-white"
          )}
          whileTap={{ scale: 0.95 }}
          data-testid="fab-toggle"
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </motion.div>
        </motion.button>
      </div>
    </>
  );
}
