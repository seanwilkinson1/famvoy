import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodCard } from "@/components/shared/PodCard";
import { TripCard } from "@/components/shared/TripCard";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { ImageCarousel } from "@/components/ui/image-carousel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowLeft, MapPin, Heart, MessageCircle, UserPlus, UserCheck, Plane, Instagram, Linkedin, Twitter, Globe, Briefcase } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import type { FamilyMember } from "@shared/schema";

const BADGE_ICONS: Record<string, string> = {
  "Park Explorer": "\u{1F332}",
  "Outdoor Explorer": "\u{1F3D5}\uFE0F",
  "Social Butterfly": "\u{1F98B}",
  "Pod Leader": "\u{1F451}",
  "Adventure Seeker": "\u{1F5FA}\uFE0F",
  "Review Star": "\u2B50",
  "Photo Pro": "\u{1F4F8}",
  "Family Champion": "\u{1F3C6}",
  "First Steps": "\u{1F463}",
  "Community Builder": "\u{1F91D}",
};

const INTEREST_EMOJIS: Record<string, string> = {
  "Hiking": "\u{1F97E}",
  "Beach": "\u{1F3D6}\uFE0F",
  "Parks": "\u{1F333}",
  "Museums": "\u{1F3DB}\uFE0F",
  "Playgrounds": "\u{1F6DD}",
  "Sports": "\u26BD",
  "Art": "\u{1F3A8}",
  "Music": "\u{1F3B5}",
  "Cooking": "\u{1F373}",
  "Reading": "\u{1F4DA}",
  "Travel": "\u2708\uFE0F",
  "Camping": "\u{1F3D5}\uFE0F",
  "Biking": "\u{1F6B2}",
  "Swimming": "\u{1F3CA}",
  "Dance": "\u{1F483}",
  "Food": "\u{1F355}",
  "Nature": "\u{1F33F}",
  "Science": "\u{1F52C}",
};

export default function FamilyProfile() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"experiences" | "trips" | "saved">("experiences");
  const [showMeetModal, setShowMeetModal] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: family, isLoading } = useQuery({
    queryKey: ["family", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch family");
      return res.json();
    },
    enabled: userId > 0,
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["isFollowing", userId],
    queryFn: () => api.follows.isFollowing(userId),
    enabled: !!currentUser && userId > 0,
  });

  const { data: followCounts } = useQuery({
    queryKey: ["followCounts", userId],
    queryFn: () => api.follows.getCounts(userId),
    enabled: userId > 0,
  });

  const { data: profilePhotos = [] } = useQuery({
    queryKey: ["profilePhotos", userId],
    queryFn: () => api.users.getProfilePhotos(userId),
    enabled: userId > 0,
  });

  const { data: familyExperiences = [] } = useQuery({
    queryKey: ["familyExperiences", userId],
    queryFn: () => api.users.getExperiences(userId),
    enabled: userId > 0,
  });

  const { data: confirmedTrips = [] } = useQuery({
    queryKey: ["userConfirmedTrips", userId],
    queryFn: () => api.users.getConfirmedTrips(userId),
    enabled: userId > 0,
  });

  const { data: savedExperiences = [] } = useQuery({
    queryKey: ["savedExperiences", userId],
    queryFn: () => api.users.getSavedExperiences(userId),
    enabled: userId > 0 && activeTab === "saved",
  });

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["familyMembers", userId],
    queryFn: () => api.users.getFamilyMembers(userId),
    enabled: userId > 0,
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ["userBadges", userId],
    queryFn: () => api.badges.getByUser(userId),
    enabled: userId > 0,
  });

  const { data: pods = [] } = useQuery({
    queryKey: ["userPods", userId],
    queryFn: () => api.users.getPods(userId),
    enabled: userId > 0,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches", currentUser?.id],
    queryFn: () => currentUser ? api.users.getMatches(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await api.follows.unfollow(userId);
      } else {
        await api.follows.follow(userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", userId] });
      queryClient.invalidateQueries({ queryKey: ["followCounts", userId] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      return api.conversations.getOrCreateDirect(userId);
    },
    onSuccess: (conv) => {
      setLocation(`/conversation/${conv.id}`);
    },
  });

  const isConnected = matches.some((m: any) => m.id === userId);
  const isOwnProfile = currentUser?.id === userId;

  const formattedExperiences = familyExperiences.map(exp => formatExperience(exp as any));
  const formattedSavedExperiences = savedExperiences.map(exp => formatExperience(exp as any));

  // Profile photos for carousel — use profile_photos table, fall back to avatar
  const profileImages = profilePhotos.length > 0
    ? profilePhotos.map((p: any) => p.url)
    : [family?.avatar || ""].filter(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Family not found</p>
        <button
          onClick={() => setLocation("/explore")}
          className="text-primary font-bold"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8 md:max-w-5xl md:mx-auto md:px-8">
      {/* Top bar — back arrow */}
      <div className="flex justify-start items-center px-6 pt-4 md:pt-8 pb-2">
        <button
          onClick={() => window.history.back()}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Hero - matching Profile.tsx */}
      <div className="px-6 py-4">
        {/* Photo carousel */}
        <ImageCarousel
          images={profileImages}
          alt={family.name || "Profile"}
          aspectRatio="aspect-square"
          className="rounded-2xl max-w-[280px] mx-auto"
        />

        {/* Name + verification */}
        <div className="mt-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-heading text-2xl font-medium text-foreground" data-testid="text-family-name">
              {family.name}
            </h1>
            {family.isVerified && <VerificationBadge size="md" />}
          </div>

          {/* Location */}
          {family.location && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {family.location}
            </p>
          )}

          {/* Last active */}
          <p className="text-xs text-muted-foreground/60 mt-1">
            Active today
          </p>
        </div>

        {/* Stats row */}
        <div className="mt-5 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{followCounts?.following || 0}</p>
            <p className="text-xs text-muted-foreground">following</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{followCounts?.followers || 0}</p>
            <p className="text-xs text-muted-foreground">followers</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{confirmedTrips.length}</p>
            <p className="text-xs text-muted-foreground">trips</p>
          </div>
        </div>

        {/* Bio */}
        {family.bio && (
          <p className="text-sm text-foreground mt-4 text-center max-w-md mx-auto leading-relaxed" data-testid="text-family-bio">
            {family.bio}
          </p>
        )}

        {/* Action buttons */}
        {!isOwnProfile && (
          <div className="mt-5 max-w-sm mx-auto space-y-3">
            {/* Meet button */}
            <button
              onClick={() => setShowMeetModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-foreground text-background rounded-full font-medium text-sm"
              data-testid="button-meet"
            >
              Meet {family.name?.split(" ")[0] || "Them"}
            </button>

            {/* Follow + Message row */}
            <div className="flex gap-3">
              <button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-medium text-sm transition-colors",
                  isFollowing
                    ? "bg-muted text-foreground hover:bg-border"
                    : "bg-primary text-white hover:bg-primary/90"
                )}
                data-testid="button-follow"
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Follow
                  </>
                )}
              </button>
              <button
                onClick={() => messageMutation.mutate()}
                disabled={messageMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-medium text-sm bg-muted text-foreground hover:bg-border transition-colors"
                data-testid="button-message-family"
              >
                <MessageCircle className="h-4 w-4" />
                {messageMutation.isPending ? "Opening..." : "Message"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 sticky top-14 z-20 bg-background border-b border-border">
        <div className="flex px-6">
          {[
            { id: "experiences", label: "Experiences" },
            { id: "trips", label: "Trips" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-3.5 text-sm font-medium transition-all border-b-2",
                activeTab === tab.id
                  ? "text-foreground border-foreground"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
              data-testid={`button-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        {activeTab === "experiences" && (
          <div>
            {formattedExperiences.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No experiences shared yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[...formattedExperiences].reverse().map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "trips" && (
          <div>
            {confirmedTrips.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No trips yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {confirmedTrips.map((trip: any) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div>
            {formattedSavedExperiences.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No saved experiences yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[...formattedSavedExperiences].reverse().map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meet modal */}
      <Sheet open={showMeetModal} onOpenChange={setShowMeetModal}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="font-heading text-xl">
              Meet {family.name || ""}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-6 pb-8">
            {/* Profile photos grid */}
            {profilePhotos.length > 0 && (
              <section>
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
                  {profilePhotos.map((photo: any, i: number) => (
                    <div
                      key={photo.id}
                      className={cn(
                        "relative overflow-hidden",
                        i === 0 && profilePhotos.length > 1 && "col-span-2 row-span-2"
                      )}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || ""}
                        className="w-full object-cover aspect-square"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                          <p className="text-white text-xs">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Bio */}
            {family.bio && (
              <p className="text-sm text-foreground leading-relaxed">{family.bio}</p>
            )}

            {/* Location */}
            {family.location && (
              <section className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{family.location}</span>
              </section>
            )}

            {/* Profession / Company */}
            {(family.profession || family.company) && (
              <section className="flex items-center gap-2 text-sm text-foreground">
                <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>
                  {family.profession}{family.profession && family.company ? " at " : ""}{family.company}
                </span>
              </section>
            )}

            {/* Social links */}
            {(family.instagramHandle || family.linkedinUrl || family.twitterHandle || family.personalUrl) && (
              <section>
                <div className="flex flex-wrap gap-2">
                  {family.instagramHandle && (
                    <a
                      href={`https://instagram.com/${family.instagramHandle.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      {family.instagramHandle}
                    </a>
                  )}
                  {family.linkedinUrl && (
                    <a
                      href={family.linkedinUrl.startsWith("http") ? family.linkedinUrl : `https://linkedin.com/in/${family.linkedinUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  )}
                  {family.twitterHandle && (
                    <a
                      href={`https://x.com/${family.twitterHandle.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      {family.twitterHandle}
                    </a>
                  )}
                  {family.personalUrl && (
                    <a
                      href={family.personalUrl.startsWith("http") ? family.personalUrl : `https://${family.personalUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Household */}
            {familyMembers.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-3">Household</h3>
                <div className="flex flex-wrap gap-4">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex flex-col items-center w-20">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-muted">
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base text-muted-foreground">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-foreground text-center truncate w-full">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.role}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Interests */}
            {family.interests && family.interests.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {family.interests.map((interest: string) => (
                    <span key={interest} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm text-foreground">
                      {INTEREST_EMOJIS[interest] || "\u{1F31F}"} {interest}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Family Values */}
            {family.familyValues && family.familyValues.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2">Values</h3>
                <div className="flex flex-wrap gap-2">
                  {family.familyValues.map((value: string) => (
                    <span key={value} className="px-3 py-1.5 rounded-full border border-border text-sm text-foreground">{value}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Languages */}
            {family.languages && family.languages.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {family.languages.map((lang: string) => (
                    <span key={lang} className="px-3 py-1.5 rounded-full border border-border text-sm text-foreground">{lang}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Pets */}
            {family.pets && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-1">{"\u{1F43E}"} Pets</h3>
                <p className="text-sm text-muted-foreground">{family.pets}</p>
              </section>
            )}

            {/* Family Motto */}
            {family.familyMotto && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-1">Family Motto</h3>
                <p className="text-sm text-muted-foreground italic">"{family.familyMotto}"</p>
              </section>
            )}

            {/* Dream Vacation */}
            {family.dreamVacation && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-1 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  Dream Vacation
                </h3>
                <p className="text-sm text-muted-foreground">{family.dreamVacation}</p>
              </section>
            )}

            {/* Badges */}
            {userBadges.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  {userBadges.map((badge: any) => (
                    <span key={badge.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground">
                      {BADGE_ICONS[badge.badge?.name || ''] || '\u{1F396}'} {badge.badge?.name || 'Badge'}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Pods */}
            {pods.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2">Pods</h3>
                <div className="space-y-3">
                  {pods.map((pod: any) => (
                    <PodCard key={pod.id} pod={pod} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
