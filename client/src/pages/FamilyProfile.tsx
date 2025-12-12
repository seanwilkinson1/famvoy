import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { ArrowLeft, MapPin, Users, Heart, MessageCircle, Sparkles, UserPlus, UserCheck, CheckCircle2, Plane } from "lucide-react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function FamilyProfile() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
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

  const { data: family, isLoading } = useQuery({
    queryKey: ["family", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch family");
      return res.json();
    },
    enabled: userId > 0,
  });

  const { data: familyExperiences = [] } = useQuery({
    queryKey: ["familyExperiences", userId],
    queryFn: () => api.users.getExperiences(userId),
    enabled: userId > 0,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["userCheckins", userId],
    queryFn: () => api.users.getCheckins(userId),
    enabled: userId > 0,
  });

  const { data: confirmedTrips = [] } = useQuery({
    queryKey: ["userConfirmedTrips", userId],
    queryFn: () => api.users.getConfirmedTrips(userId),
    enabled: userId > 0,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches", currentUser?.id],
    queryFn: () => currentUser ? api.users.getMatches(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      return api.pods.createDirect(userId);
    },
    onSuccess: (pod) => {
      setLocation(`/pod/${pod.id}`);
    },
  });

  const isConnected = matches.some(m => m.id === userId);
  const isOwnProfile = currentUser?.id === userId;

  const formattedExperiences = familyExperiences.map(exp => formatExperience(exp as any));

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
        <p className="text-gray-500 mb-4">Family not found</p>
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
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20">
          {family.avatar && (
            <img 
              src={family.avatar} 
              alt={family.name} 
              className="w-full h-full object-cover opacity-30"
            />
          )}
        </div>
        
        <button 
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 rounded-full bg-white/80 backdrop-blur-sm p-2 shadow-sm"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>

        {/* Profile Image */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <img
            src={family.avatar || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"}
            alt={family.name}
            className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
            data-testid="img-family-avatar"
          />
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-20 px-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-gray-900" data-testid="text-family-name">
          {family.name}
        </h1>
        
        <div className="mt-2 flex items-center justify-center gap-4 text-sm text-gray-500">
          {family.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {family.location}
            </div>
          )}
          {family.kids && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {family.kids}
            </div>
          )}
        </div>

        {family.bio && (
          <p className="mt-4 text-gray-600" data-testid="text-family-bio">
            {family.bio}
          </p>
        )}

        {/* Interests */}
        {family.interests && family.interests.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {family.interests.map((interest: string) => (
              <span
                key={interest}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-bold transition-colors ${
                isFollowing 
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
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
            {isConnected && (
              <button
                onClick={() => messageMutation.mutate()}
                disabled={messageMutation.isPending}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 font-bold text-white"
                style={{ backgroundColor: '#14b8a6' }}
                data-testid="button-message-family"
              >
                <MessageCircle className="h-4 w-4" />
                {messageMutation.isPending ? "Opening..." : "Message"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="mt-8 px-6">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts" data-testid="tab-posts">
              Posts
            </TabsTrigger>
            <TabsTrigger value="done" data-testid="tab-done">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Done
            </TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-trips">
              <Plane className="h-4 w-4 mr-1" />
              Trips
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-4">
            {formattedExperiences.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No experiences shared yet
              </div>
            ) : (
              <div className="space-y-4">
                {formattedExperiences.map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="done" className="mt-4">
            {checkins.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                No check-ins yet
              </div>
            ) : (
              <div className="space-y-4">
                {checkins.map((checkin: any) => (
                  <Link key={checkin.id} href={`/experience/${checkin.experience?.id}`}>
                    <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{checkin.experience?.title}</p>
                          <p className="text-sm text-gray-500">
                            {checkin.createdAt ? format(new Date(checkin.createdAt), 'MMM d, yyyy') : 'Recently'}
                          </p>
                        </div>
                      </div>
                      {checkin.note && (
                        <p className="mt-2 text-sm text-gray-600">{checkin.note}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trips" className="mt-4">
            {confirmedTrips.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Plane className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                No confirmed trips yet
              </div>
            ) : (
              <div className="space-y-4">
                {confirmedTrips.map((trip: any) => (
                  <Link key={trip.id} href={`/trip/${trip.id}`}>
                    <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Plane className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{trip.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {trip.startDate && (
                              <span>{format(new Date(trip.startDate), 'MMM d')} - {trip.endDate ? format(new Date(trip.endDate), 'MMM d, yyyy') : '?'}</span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              Confirmed
                            </span>
                          </div>
                        </div>
                      </div>
                      {trip.destination && (
                        <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          {trip.destination}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="mt-8 mx-6 rounded-2xl bg-gray-50 p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{formattedExperiences.length}</div>
            <div className="text-sm text-gray-500">Experiences</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{followCounts?.followers || 0}</div>
            <div className="text-sm text-gray-500">Followers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{followCounts?.following || 0}</div>
            <div className="text-sm text-gray-500">Following</div>
          </div>
        </div>
      </div>
    </div>
  );
}
