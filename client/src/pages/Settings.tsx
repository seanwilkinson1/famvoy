import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Bell, 
  Shield, 
  Eye, 
  Users, 
  MapPin, 
  LogOut,
  ChevronRight,
  Trash2,
  HelpCircle,
  FileText,
  Mail
} from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingItem({ icon, title, subtitle, onClick, rightElement, danger }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full p-4 text-left transition-colors",
        onClick && "hover:bg-gray-50 active:bg-gray-100"
      )}
      data-testid={`setting-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl",
        danger ? "bg-red-50" : "bg-gray-100"
      )}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className={cn(
          "font-medium",
          danger ? "text-red-600" : "text-gray-900"
        )}>{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {rightElement || (onClick && (
        <ChevronRight className="h-5 w-5 text-gray-400" />
      ))}
    </button>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="px-4 mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  
  const [notifications, setNotifications] = useState({
    newMatches: true,
    messages: true,
    podActivity: true,
    nearbyExperiences: false,
  });
  
  const [privacy, setPrivacy] = useState({
    showLocation: true,
    showKids: true,
    discoverableByOthers: true,
  });

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setLocation("/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <SettingSection title="Notifications">
          <SettingItem
            icon={<Users className="h-5 w-5 text-primary" />}
            title="New Matches"
            subtitle="Get notified when you match with a family"
            rightElement={
              <Switch
                checked={notifications.newMatches}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, newMatches: checked })
                }
                data-testid="switch-new-matches"
              />
            }
          />
          <SettingItem
            icon={<Mail className="h-5 w-5 text-primary" />}
            title="Messages"
            subtitle="Receive notifications for new messages"
            rightElement={
              <Switch
                checked={notifications.messages}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, messages: checked })
                }
                data-testid="switch-messages"
              />
            }
          />
          <SettingItem
            icon={<Bell className="h-5 w-5 text-primary" />}
            title="Pod Activity"
            subtitle="Updates from your pods and group chats"
            rightElement={
              <Switch
                checked={notifications.podActivity}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, podActivity: checked })
                }
                data-testid="switch-pod-activity"
              />
            }
          />
          <SettingItem
            icon={<MapPin className="h-5 w-5 text-primary" />}
            title="Nearby Experiences"
            subtitle="Discover new activities in your area"
            rightElement={
              <Switch
                checked={notifications.nearbyExperiences}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, nearbyExperiences: checked })
                }
                data-testid="switch-nearby-experiences"
              />
            }
          />
        </SettingSection>

        <SettingSection title="Privacy">
          <SettingItem
            icon={<MapPin className="h-5 w-5 text-warm-coral" />}
            title="Show Location"
            subtitle="Let other families see your general area"
            rightElement={
              <Switch
                checked={privacy.showLocation}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, showLocation: checked })
                }
                data-testid="switch-show-location"
              />
            }
          />
          <SettingItem
            icon={<Users className="h-5 w-5 text-warm-coral" />}
            title="Show Kids Info"
            subtitle="Display your children's ages on your profile"
            rightElement={
              <Switch
                checked={privacy.showKids}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, showKids: checked })
                }
                data-testid="switch-show-kids"
              />
            }
          />
          <SettingItem
            icon={<Eye className="h-5 w-5 text-warm-coral" />}
            title="Discoverable"
            subtitle="Allow other families to find you"
            rightElement={
              <Switch
                checked={privacy.discoverableByOthers}
                onCheckedChange={(checked) => 
                  setPrivacy({ ...privacy, discoverableByOthers: checked })
                }
                data-testid="switch-discoverable"
              />
            }
          />
          <SettingItem
            icon={<Shield className="h-5 w-5 text-warm-coral" />}
            title="Blocked Families"
            subtitle="Manage families you've blocked"
            onClick={() => {}}
          />
        </SettingSection>

        <SettingSection title="Support">
          <SettingItem
            icon={<HelpCircle className="h-5 w-5 text-gray-500" />}
            title="Help Center"
            subtitle="FAQs and getting started guides"
            onClick={() => {}}
          />
          <SettingItem
            icon={<Mail className="h-5 w-5 text-gray-500" />}
            title="Contact Us"
            subtitle="Get in touch with our support team"
            onClick={() => {}}
          />
          <SettingItem
            icon={<FileText className="h-5 w-5 text-gray-500" />}
            title="Terms of Service"
            onClick={() => {}}
          />
          <SettingItem
            icon={<Shield className="h-5 w-5 text-gray-500" />}
            title="Privacy Policy"
            onClick={() => {}}
          />
        </SettingSection>

        <SettingSection title="Account">
          <SettingItem
            icon={<LogOut className="h-5 w-5 text-gray-500" />}
            title="Sign Out"
            onClick={handleSignOut}
          />
          <SettingItem
            icon={<Trash2 className="h-5 w-5 text-red-500" />}
            title="Delete Account"
            subtitle="Permanently delete your account and data"
            onClick={() => {}}
            danger
          />
        </SettingSection>

        <p className="text-center text-xs text-gray-400 mt-8">
          FamVoy v1.0.0
        </p>
      </motion.div>
    </div>
  );
}
