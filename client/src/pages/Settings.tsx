import { useState, useEffect } from "react";
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
  Mail,
  Navigation,
  Loader2,
  UserPen,
} from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useClerkAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
        onClick && "hover:bg-muted active:bg-muted"
      )}
      data-testid={`setting-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl",
        danger ? "bg-red-50" : "bg-muted"
      )}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className={cn(
          "font-medium",
          danger ? "text-red-600" : "text-foreground"
        )}>{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {rightElement || (onClick && (
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      ))}
    </button>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="px-4 mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
  const { user } = useClerkAuth();
  const queryClient = useQueryClient();
  
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
  
  const [shareLocation, setShareLocation] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  
  useEffect(() => {
    if (user) {
      setShareLocation(user.shareLocation ?? false);
    }
  }, [user]);
  
  const updateLocationMutation = useMutation({
    mutationFn: async ({ lat, lng, shareLocation }: { lat?: number; lng?: number; shareLocation: boolean }) => {
      const body: { lat?: number; lng?: number; shareLocation: boolean } = { shareLocation };
      if (lat !== undefined && lng !== undefined) {
        body.lat = lat;
        body.lng = lng;
      }
      const response = await fetch('/api/users/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error('Failed to update location');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast.success(shareLocation ? "Location sharing enabled" : "Location sharing disabled", {
        description: shareLocation
          ? "Other families can now see you on the map"
          : "Your location is now hidden from the map",
      });
    },
    onError: (error) => {
      setShareLocation(!shareLocation);
      toast.error("Error", { description: "Failed to update location settings" });
    },
  });
  
  const handleShareLocationToggle = async (enabled: boolean) => {
    setShareLocation(enabled);
    setIsUpdatingLocation(true);
    
    if (enabled) {
      if (!navigator.geolocation) {
        toast.error("Geolocation not supported", { description: "Your browser doesn't support location services" });
        setShareLocation(false);
        setIsUpdatingLocation(false);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLocationMutation.mutate({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            shareLocation: true,
          });
          setIsUpdatingLocation(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          let message = "Could not get your location";
          if (error.code === error.PERMISSION_DENIED) {
            message = "Location permission was denied. Please enable it in your browser settings.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = "Location information is unavailable";
          } else if (error.code === error.TIMEOUT) {
            message = "Location request timed out";
          }
          toast.error("Location Error", { description: message });
          setShareLocation(false);
          setIsUpdatingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      // When disabling, only send shareLocation flag - server preserves existing coordinates
      updateLocationMutation.mutate({
        shareLocation: false,
      });
      setIsUpdatingLocation(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-muted pt-14 pb-32 md:max-w-3xl md:mx-auto md:px-8">
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
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
        </div>

        <SettingSection title="Profile">
          <SettingItem
            icon={<UserPen className="h-5 w-5 text-primary" />}
            title="Edit Profile"
            subtitle="Update your photo, bio, and details"
            rightElement={<ChevronRight className="h-5 w-5 text-muted-foreground" />}
            onClick={() => setLocation("/profile?edit=true")}
          />
        </SettingSection>

        <SettingSection title="Location Sharing">
          <SettingItem
            icon={<Navigation className="h-5 w-5 text-green-500" />}
            title="Share My Location"
            subtitle={shareLocation 
              ? "Your location is visible to other families on the map" 
              : "Enable to appear on the explore map"
            }
            rightElement={
              isUpdatingLocation ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={shareLocation}
                  onCheckedChange={handleShareLocationToggle}
                  data-testid="switch-share-location"
                />
              )
            }
          />
        </SettingSection>

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
            subtitle={shareLocation
              ? "Showing activities near your location"
              : "Enable location to discover nearby activities"
            }
            rightElement={
              isUpdatingLocation ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={shareLocation}
                  onCheckedChange={handleShareLocationToggle}
                  data-testid="switch-nearby-experiences"
                />
              )
            }
          />
        </SettingSection>

        <SettingSection title="Privacy">
          <SettingItem
            icon={<MapPin className="h-5 w-5 text-accent" />}
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
            icon={<Users className="h-5 w-5 text-accent" />}
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
            icon={<Eye className="h-5 w-5 text-accent" />}
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
            icon={<Shield className="h-5 w-5 text-accent" />}
            title="Blocked Families"
            subtitle="Manage families you've blocked"
            onClick={() => {}}
          />
        </SettingSection>

        <SettingSection title="Support">
          <SettingItem
            icon={<HelpCircle className="h-5 w-5 text-muted-foreground" />}
            title="Help Center"
            subtitle="FAQs and getting started guides"
            onClick={() => {}}
          />
          <SettingItem
            icon={<Mail className="h-5 w-5 text-muted-foreground" />}
            title="Contact Us"
            subtitle="Get in touch with our support team"
            onClick={() => {}}
          />
          <SettingItem
            icon={<FileText className="h-5 w-5 text-muted-foreground" />}
            title="Terms of Service"
            onClick={() => {}}
          />
          <SettingItem
            icon={<Shield className="h-5 w-5 text-muted-foreground" />}
            title="Privacy Policy"
            onClick={() => {}}
          />
        </SettingSection>

        <SettingSection title="Account">
          <SettingItem
            icon={<LogOut className="h-5 w-5 text-muted-foreground" />}
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

        <p className="text-center text-xs text-muted-foreground mt-8">
          FamVoy v1.0.0
        </p>
      </motion.div>
    </div>
  );
}
