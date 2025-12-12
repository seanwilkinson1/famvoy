import { 
  type User, 
  type InsertUser,
  type UpsertUser,
  type Experience,
  type InsertExperience,
  type Pod,
  type InsertPod,
  type Message,
  type InsertMessage,
  type InsertSavedExperience,
  type FamilyConnection,
  type InsertFamilyConnection,
  type FamilySwipe,
  type InsertFamilySwipe,
  type Activity,
  type InsertActivity,
  type Comment,
  type InsertComment,
  type Follow,
  type InsertFollow,
  type PodAlbum,
  type InsertPodAlbum,
  type AlbumPhoto,
  type InsertAlbumPhoto,
  type Badge,
  type UserBadge,
  type ExperienceCheckin,
  type InsertExperienceCheckin,
  type PodTrip,
  type InsertPodTrip,
  type TripItem,
  type InsertTripItem,
  type TripDestination,
  type InsertTripDestination,
  type FamilyMember,
  type InsertFamilyMember,
  type BookingOption,
  type InsertBookingOption,
  type Cart,
  type InsertCart,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type TripConfirmationSession,
  type InsertTripConfirmationSession,
  type TripItemOption,
  type InsertTripItemOption,
  users,
  experiences,
  pods,
  podMembers,
  savedExperiences,
  messages,
  familyConnections,
  familySwipes,
  activities,
  comments,
  follows,
  podExperiences,
  podAlbums,
  albumPhotos,
  badges,
  userBadges,
  experienceCheckins,
  podTrips,
  tripDestinations,
  tripItems,
  familyMembers,
  bookingOptions,
  carts,
  cartItems,
  orders,
  orderItems,
  tripConfirmationSessions,
  tripItemOptions,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ne, notInArray, ilike, isNotNull, inArray } from "drizzle-orm";

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: number, data: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  
  getExperiences(): Promise<Experience[]>;
  getExperienceById(id: number): Promise<Experience | undefined>;
  getExperiencesByUser(userId: number): Promise<Experience[]>;
  deleteExperience(id: number): Promise<void>;
  getSavedExperiences(userId: number): Promise<Experience[]>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  saveExperience(data: InsertSavedExperience): Promise<void>;
  unsaveExperience(userId: number, experienceId: number): Promise<void>;
  searchExperiences(query: string): Promise<Experience[]>;
  
  getPods(): Promise<Pod[]>;
  getPodById(id: number): Promise<Pod | undefined>;
  getPodsByUser(userId: number): Promise<Pod[]>;
  getPodWithMembers(podId: number): Promise<{ pod: Pod; members: User[] } | undefined>;
  getPublicPods(userId?: number): Promise<Pod[]>;
  searchPods(query: string): Promise<Pod[]>;
  createPod(pod: InsertPod): Promise<Pod>;
  createGroupPod(creatorId: number, data: { name: string; description: string; category?: string; image?: string }): Promise<Pod>;
  createDirectPod(userId1: number, userId2: number): Promise<Pod>;
  findDirectPod(userId1: number, userId2: number): Promise<Pod | undefined>;
  getOrCreateDirectPod(userId1: number, userId2: number): Promise<Pod>;
  addPodMember(podId: number, userId: number): Promise<void>;
  removePodMember(podId: number, userId: number): Promise<void>;
  isPodMember(podId: number, userId: number): Promise<boolean>;
  updatePodMemberCount(podId: number): Promise<void>;
  updatePod(podId: number, data: { name?: string; description?: string; isPublic?: boolean }): Promise<Pod>;
  deletePod(podId: number): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
  getMessages(podId: number): Promise<Array<Message & { user: User }>>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  getFamilyConnections(userId: number): Promise<Array<FamilyConnection & { connectedUser: User }>>;
  getPendingConnectionRequests(userId: number): Promise<Array<FamilyConnection & { user: User }>>;
  sendConnectionRequest(data: InsertFamilyConnection): Promise<FamilyConnection>;
  acceptConnection(connectionId: number): Promise<void>;
  declineConnection(connectionId: number): Promise<void>;
  
  getDiscoverableFamilies(userId: number, userLat?: number, userLng?: number): Promise<(User & { distance?: number })[]>;
  getExperiencesNearby(lat: number, lng: number, radiusMiles?: number): Promise<(Experience & { distance: number })[]>;
  recordSwipe(data: InsertFamilySwipe): Promise<{ matched: boolean; podId?: number }>;
  getMatches(userId: number): Promise<User[]>;
  
  createActivity(data: InsertActivity): Promise<Activity>;
  getActivitiesForUser(userId: number, limit?: number): Promise<(Activity & { user: User })[]>;
  getActivityFeed(userId: number, limit?: number): Promise<(Activity & { user: User })[]>;
  
  getCommentsByExperience(experienceId: number): Promise<(Comment & { user: User })[]>;
  createComment(data: InsertComment): Promise<Comment>;
  deleteComment(commentId: number, userId: number): Promise<void>;
  getExperienceRating(experienceId: number): Promise<{ average: number; count: number }>;
  
  followUser(followerId: number, followingId: number): Promise<Follow>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  getFollowCounts(userId: number): Promise<{ followers: number; following: number }>;
  
  getPodExperiences(podId: number): Promise<(Experience & { creator: { id: number; name: string | null; avatar: string | null } | null })[]>;
  addExperienceToPod(podId: number, experienceId: number, userId: number): Promise<void>;
  removeExperienceFromPod(podId: number, experienceId: number): Promise<void>;
  isExperienceInPod(podId: number, experienceId: number): Promise<boolean>;
  
  getPodAlbums(podId: number): Promise<(PodAlbum & { creator: User; photoCount: number })[]>;
  getPodAlbumById(albumId: number): Promise<PodAlbum | undefined>;
  createPodAlbum(data: InsertPodAlbum): Promise<PodAlbum>;
  deletePodAlbum(albumId: number): Promise<void>;
  getAlbumPhotos(albumId: number): Promise<(AlbumPhoto & { user: User })[]>;
  addPhotoToAlbum(data: InsertAlbumPhoto): Promise<AlbumPhoto>;
  deleteAlbumPhoto(photoId: number): Promise<void>;
  updateAlbumCover(albumId: number, coverUrl: string): Promise<void>;
  
  getAllBadges(): Promise<Badge[]>;
  getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]>;
  awardBadge(userId: number, badgeId: number): Promise<UserBadge>;
  hasUserEarnedBadge(userId: number, badgeId: number): Promise<boolean>;
  checkAndAwardBadges(userId: number): Promise<Badge[]>;
  
  createExperienceCheckin(data: InsertExperienceCheckin): Promise<ExperienceCheckin>;
  getCheckinsByExperience(experienceId: number): Promise<(ExperienceCheckin & { user: User })[]>;
  getCheckinsByUser(userId: number): Promise<(ExperienceCheckin & { experience: Experience })[]>;
  getCheckinCount(experienceId: number): Promise<number>;
  hasUserCheckedIn(userId: number, experienceId: number): Promise<boolean>;
  
  getTripsByPod(podId: number): Promise<(PodTrip & { creator: User; itemCount: number })[]>;
  getTripsByUser(userId: number): Promise<(PodTrip & { creator: User; itemCount: number; pod: Pod })[]>;
  getTripById(tripId: number): Promise<(PodTrip & { items: TripItem[] }) | undefined>;
  createTrip(data: InsertPodTrip): Promise<PodTrip>;
  updateTrip(tripId: number, data: Partial<PodTrip>): Promise<PodTrip>;
  deleteTrip(tripId: number): Promise<void>;
  getTripItems(tripId: number): Promise<TripItem[]>;
  createTripItem(data: InsertTripItem): Promise<TripItem>;
  updateTripItem(itemId: number, data: Partial<TripItem>): Promise<TripItem>;
  deleteTripItem(itemId: number): Promise<void>;
  bulkCreateTripItems(items: InsertTripItem[]): Promise<TripItem[]>;
  clearTripItems(tripId: number): Promise<void>;
  
  getTripDestinations(tripId: number): Promise<TripDestination[]>;
  createTripDestination(data: InsertTripDestination): Promise<TripDestination>;
  updateTripDestination(destId: number, data: Partial<TripDestination>): Promise<TripDestination>;
  deleteTripDestination(destId: number): Promise<void>;
  clearTripDestinations(tripId: number): Promise<void>;
  
  getFamilyMembers(userId: number): Promise<FamilyMember[]>;
  createFamilyMember(data: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(memberId: number, data: Partial<FamilyMember>): Promise<FamilyMember>;
  deleteFamilyMember(memberId: number): Promise<void>;
  
  getBookingOptions(tripItemId?: number): Promise<BookingOption[]>;
  getBookingOptionById(id: number): Promise<BookingOption | undefined>;
  createBookingOption(data: InsertBookingOption): Promise<BookingOption>;
  updateBookingOption(id: number, data: Partial<BookingOption>): Promise<BookingOption>;
  deleteBookingOption(id: number): Promise<void>;
  
  getCartByUser(userId: number): Promise<(Cart & { items: (CartItem & { bookingOption: BookingOption })[] }) | undefined>;
  getOrCreateCart(userId: number, podTripId?: number): Promise<Cart>;
  addToCart(data: InsertCartItem): Promise<CartItem>;
  updateCartItem(itemId: number, data: Partial<CartItem>): Promise<CartItem>;
  removeFromCart(itemId: number): Promise<void>;
  clearCart(cartId: number): Promise<void>;
  
  createOrder(data: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<(Order & { items: (OrderItem & { bookingOption: BookingOption })[] }) | undefined>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  getOrdersByPodTrip(podTripId: number): Promise<(Order & { user: User })[]>;
  updateOrder(id: number, data: Partial<Order>): Promise<Order>;
  createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]>;
  
  getConfirmationSession(tripId: number): Promise<TripConfirmationSession | undefined>;
  createConfirmationSession(data: InsertTripConfirmationSession): Promise<TripConfirmationSession>;
  updateConfirmationSession(sessionId: number, data: Partial<TripConfirmationSession>): Promise<TripConfirmationSession>;
  
  getTripItemOptions(tripItemId: number, generationId?: string): Promise<TripItemOption[]>;
  createTripItemOptions(options: InsertTripItemOption[]): Promise<TripItemOption[]>;
  deleteTripItemOptions(tripItemId: number, generationId?: string): Promise<void>;
  lockTripItemOption(optionId: number): Promise<TripItemOption>;
  
  updateTripStatus(tripId: number, status: string): Promise<PodTrip>;
  updateTripItemConfirmation(itemId: number, state: string, selectedOptionId?: number): Promise<TripItem>;
  getConfirmableItems(tripId: number): Promise<TripItem[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUserByClerkId(userData.clerkId);
    
    if (existingUser) {
      const [user] = await db
        .update(users)
        .set({
          email: userData.email || existingUser.email,
          name: userData.name || existingUser.name,
          avatar: userData.avatar || existingUser.avatar,
          location: userData.location || existingUser.location,
          kids: userData.kids || existingUser.kids,
          interests: userData.interests || existingUser.interests,
          bio: userData.bio || existingUser.bio,
          familyValues: userData.familyValues || existingUser.familyValues,
          languages: userData.languages || existingUser.languages,
          pets: userData.pets || existingUser.pets,
          familyMotto: userData.familyMotto || existingUser.familyMotto,
          favoriteTraditions: userData.favoriteTraditions || existingUser.favoriteTraditions,
          dreamVacation: userData.dreamVacation || existingUser.dreamVacation,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userData.clerkId))
        .returning();
      return user;
    }

    const [user] = await db
      .insert(users)
      .values({
        clerkId: userData.clerkId,
        email: userData.email,
        name: userData.name || 'New Family',
        avatar: userData.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400',
        location: userData.location || 'Not set',
        kids: userData.kids || 'Not specified',
        interests: userData.interests || [],
        bio: userData.bio,
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: number, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async searchUsers(query: string): Promise<User[]> {
    return db.select().from(users).where(
      or(
        ilike(users.name, `%${query}%`),
        ilike(users.email, `%${query}%`),
        ilike(users.location, `%${query}%`)
      )
    );
  }

  async getExperiences(): Promise<Experience[]> {
    return db.select().from(experiences).orderBy(desc(experiences.createdAt));
  }

  async getExperienceById(id: number): Promise<Experience | undefined> {
    const [experience] = await db.select().from(experiences).where(eq(experiences.id, id));
    return experience || undefined;
  }

  async getExperiencesByUser(userId: number): Promise<Experience[]> {
    return db.select().from(experiences).where(eq(experiences.userId, userId));
  }

  async deleteExperience(id: number): Promise<void> {
    await db.delete(savedExperiences).where(eq(savedExperiences.experienceId, id));
    await db.delete(comments).where(eq(comments.experienceId, id));
    await db.delete(podExperiences).where(eq(podExperiences.experienceId, id));
    await db.delete(experienceCheckins).where(eq(experienceCheckins.experienceId, id));
    await db.delete(experiences).where(eq(experiences.id, id));
  }

  async getSavedExperiences(userId: number): Promise<Experience[]> {
    const saved = await db
      .select({ experience: experiences })
      .from(savedExperiences)
      .innerJoin(experiences, eq(savedExperiences.experienceId, experiences.id))
      .where(eq(savedExperiences.userId, userId));
    
    return saved.map(s => s.experience);
  }

  async createExperience(experience: InsertExperience): Promise<Experience> {
    const [newExperience] = await db
      .insert(experiences)
      .values(experience)
      .returning();
    return newExperience;
  }

  async saveExperience(data: InsertSavedExperience): Promise<void> {
    await db.insert(savedExperiences).values(data).onConflictDoNothing();
  }

  async unsaveExperience(userId: number, experienceId: number): Promise<void> {
    await db
      .delete(savedExperiences)
      .where(
        and(
          eq(savedExperiences.userId, userId),
          eq(savedExperiences.experienceId, experienceId)
        )
      );
  }

  async searchExperiences(query: string): Promise<Experience[]> {
    return db.select().from(experiences).where(
      or(
        ilike(experiences.title, `%${query}%`),
        ilike(experiences.locationName, `%${query}%`),
        ilike(experiences.category, `%${query}%`)
      )
    );
  }

  async getPods(): Promise<Pod[]> {
    return db.select().from(pods).orderBy(desc(pods.createdAt));
  }

  async getPodById(id: number): Promise<Pod | undefined> {
    const [pod] = await db.select().from(pods).where(eq(pods.id, id));
    return pod || undefined;
  }

  async getPodsByUser(userId: number): Promise<Pod[]> {
    const userPods = await db
      .select({ pod: pods })
      .from(podMembers)
      .innerJoin(pods, eq(podMembers.podId, pods.id))
      .where(eq(podMembers.userId, userId));
    
    return userPods.map(p => p.pod);
  }

  async getPodWithMembers(podId: number): Promise<{ pod: Pod; members: User[] } | undefined> {
    const pod = await this.getPodById(podId);
    if (!pod) return undefined;
    
    const members = await db
      .select({ user: users })
      .from(podMembers)
      .innerJoin(users, eq(podMembers.userId, users.id))
      .where(eq(podMembers.podId, podId));
    
    return { pod, members: members.map(m => m.user) };
  }

  async createPod(pod: InsertPod): Promise<Pod> {
    const [newPod] = await db.insert(pods).values(pod).returning();
    return newPod;
  }

  async createDirectPod(userId1: number, userId2: number): Promise<Pod> {
    const user1 = await this.getUser(userId1);
    const user2 = await this.getUser(userId2);
    
    const [newPod] = await db.insert(pods).values({
      name: `${user1?.name || 'Family'} & ${user2?.name || 'Family'}`,
      description: 'Direct message',
      isDirect: true,
      creatorId: userId1,
    }).returning();
    
    await this.addPodMember(newPod.id, userId1);
    await this.addPodMember(newPod.id, userId2);
    
    return newPod;
  }

  async findDirectPod(userId1: number, userId2: number): Promise<Pod | undefined> {
    const user1Pods = await db
      .select({ podId: podMembers.podId })
      .from(podMembers)
      .where(eq(podMembers.userId, userId1));
    
    const user1PodIds = user1Pods.map(p => p.podId);
    
    if (user1PodIds.length === 0) return undefined;
    
    for (const podId of user1PodIds) {
      const pod = await this.getPodById(podId);
      if (!pod || !pod.isDirect) continue;
      
      const [membership] = await db
        .select()
        .from(podMembers)
        .where(and(eq(podMembers.podId, podId), eq(podMembers.userId, userId2)));
      
      if (membership) return pod;
    }
    
    return undefined;
  }

  async getOrCreateDirectPod(userId1: number, userId2: number): Promise<Pod> {
    const existing = await this.findDirectPod(userId1, userId2);
    if (existing) return existing;
    return this.createDirectPod(userId1, userId2);
  }

  async addPodMember(podId: number, userId: number): Promise<void> {
    await db.insert(podMembers).values({ podId, userId }).onConflictDoNothing();
    await this.updatePodMemberCount(podId);
  }

  async removePodMember(podId: number, userId: number): Promise<void> {
    await db.delete(podMembers).where(
      and(eq(podMembers.podId, podId), eq(podMembers.userId, userId))
    );
    await this.updatePodMemberCount(podId);
  }

  async isPodMember(podId: number, userId: number): Promise<boolean> {
    const [member] = await db.select().from(podMembers).where(
      and(eq(podMembers.podId, podId), eq(podMembers.userId, userId))
    );
    return !!member;
  }

  async updatePodMemberCount(podId: number): Promise<void> {
    const members = await db.select().from(podMembers).where(eq(podMembers.podId, podId));
    await db.update(pods).set({ memberCount: members.length }).where(eq(pods.id, podId));
  }

  async updatePod(podId: number, data: { name?: string; description?: string; isPublic?: boolean }): Promise<Pod> {
    const [pod] = await db
      .update(pods)
      .set(data)
      .where(eq(pods.id, podId))
      .returning();
    return pod;
  }

  async deletePod(podId: number): Promise<void> {
    await db.delete(podMembers).where(eq(podMembers.podId, podId));
    await db.delete(messages).where(eq(messages.podId, podId));
    await db.delete(podExperiences).where(eq(podExperiences.podId, podId));
    await db.delete(pods).where(eq(pods.id, podId));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getPublicPods(userId?: number): Promise<Pod[]> {
    const publicPods = await db.select().from(pods).where(
      and(eq(pods.isPublic, true), eq(pods.isDirect, false))
    ).orderBy(desc(pods.memberCount), desc(pods.createdAt));
    
    return publicPods;
  }

  async searchPods(query: string): Promise<Pod[]> {
    return db.select().from(pods).where(
      and(
        eq(pods.isPublic, true),
        eq(pods.isDirect, false),
        or(
          ilike(pods.name, `%${query}%`),
          ilike(pods.description, `%${query}%`),
          ilike(pods.category, `%${query}%`)
        )
      )
    );
  }

  async createGroupPod(creatorId: number, data: { name: string; description: string; category?: string; image?: string }): Promise<Pod> {
    const [newPod] = await db.insert(pods).values({
      name: data.name,
      description: data.description,
      category: data.category || null,
      image: data.image || null,
      isDirect: false,
      isPublic: true,
      creatorId,
      memberCount: 1,
    }).returning();
    
    await db.insert(podMembers).values({ podId: newPod.id, userId: creatorId });
    
    return newPod;
  }

  async getMessages(podId: number): Promise<Array<Message & { user: User }>> {
    const result = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.podId, podId))
      .orderBy(messages.createdAt);
    
    return result.map(r => ({ ...r.messages, user: r.users }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getFamilyConnections(userId: number): Promise<Array<FamilyConnection & { connectedUser: User }>> {
    const connections = await db
      .select()
      .from(familyConnections)
      .innerJoin(users, eq(familyConnections.connectedUserId, users.id))
      .where(
        and(
          eq(familyConnections.userId, userId),
          eq(familyConnections.status, "accepted")
        )
      );
    
    return connections.map(c => ({ ...c.family_connections, connectedUser: c.users }));
  }

  async getPendingConnectionRequests(userId: number): Promise<Array<FamilyConnection & { user: User }>> {
    const requests = await db
      .select()
      .from(familyConnections)
      .innerJoin(users, eq(familyConnections.userId, users.id))
      .where(
        and(
          eq(familyConnections.connectedUserId, userId),
          eq(familyConnections.status, "pending")
        )
      );
    
    return requests.map(r => ({ ...r.family_connections, user: r.users }));
  }

  async sendConnectionRequest(data: InsertFamilyConnection): Promise<FamilyConnection> {
    const [connection] = await db
      .insert(familyConnections)
      .values({ ...data, status: "pending" })
      .returning();
    return connection;
  }

  async acceptConnection(connectionId: number): Promise<void> {
    const [conn] = await db.select().from(familyConnections).where(eq(familyConnections.id, connectionId));
    if (conn) {
      await db.update(familyConnections)
        .set({ status: "accepted" })
        .where(eq(familyConnections.id, connectionId));
      
      await db.insert(familyConnections)
        .values({ userId: conn.connectedUserId, connectedUserId: conn.userId, status: "accepted" })
        .onConflictDoNothing();
    }
  }

  async declineConnection(connectionId: number): Promise<void> {
    await db.delete(familyConnections).where(eq(familyConnections.id, connectionId));
  }

  async getDiscoverableFamilies(userId: number, userLat?: number, userLng?: number): Promise<(User & { distance?: number })[]> {
    const swipedIds = await db
      .select({ id: familySwipes.swipedUserId })
      .from(familySwipes)
      .where(eq(familySwipes.userId, userId));
    
    const connectedIds = await db
      .select({ id: familyConnections.connectedUserId })
      .from(familyConnections)
      .where(eq(familyConnections.userId, userId));
    
    const excludeIds = [
      userId,
      ...swipedIds.map(s => s.id),
      ...connectedIds.map(c => c.id)
    ];
    
    const families = await db.select().from(users).where(notInArray(users.id, excludeIds));
    
    if (userLat !== undefined && userLng !== undefined) {
      return families
        .map(family => ({
          ...family,
          distance: family.locationLat !== null && family.locationLng !== null
            ? calculateDistance(userLat, userLng, family.locationLat, family.locationLng)
            : undefined
        }))
        .sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
    }
    
    return families;
  }

  async getExperiencesNearby(lat: number, lng: number, radiusMiles: number = 50): Promise<(Experience & { distance: number })[]> {
    const allExperiences = await db.select().from(experiences);
    
    return allExperiences
      .map(exp => ({
        ...exp,
        distance: calculateDistance(lat, lng, exp.locationLat, exp.locationLng)
      }))
      .filter(exp => exp.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);
  }

  async recordSwipe(data: InsertFamilySwipe): Promise<{ matched: boolean; podId?: number }> {
    await db.insert(familySwipes).values(data);
    
    if (data.liked) {
      const [mutualLike] = await db
        .select()
        .from(familySwipes)
        .where(
          and(
            eq(familySwipes.userId, data.swipedUserId),
            eq(familySwipes.swipedUserId, data.userId),
            eq(familySwipes.liked, true)
          )
        );
      
      if (mutualLike) {
        await db.insert(familyConnections)
          .values({ userId: data.userId, connectedUserId: data.swipedUserId, status: "accepted" })
          .onConflictDoNothing();
        await db.insert(familyConnections)
          .values({ userId: data.swipedUserId, connectedUserId: data.userId, status: "accepted" })
          .onConflictDoNothing();
        
        const pod = await this.getOrCreateDirectPod(data.userId, data.swipedUserId);
        
        return { matched: true, podId: pod.id };
      }
    }
    
    return { matched: false };
  }

  async getMatches(userId: number): Promise<User[]> {
    const connections = await db
      .select({ user: users })
      .from(familyConnections)
      .innerJoin(users, eq(familyConnections.connectedUserId, users.id))
      .where(
        and(
          eq(familyConnections.userId, userId),
          eq(familyConnections.status, "accepted")
        )
      );
    
    return connections.map(c => c.user);
  }

  async createActivity(data: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(data).returning();
    return activity;
  }

  async getActivitiesForUser(userId: number, limit: number = 50): Promise<(Activity & { user: User })[]> {
    const result = await db
      .select({
        activity: activities,
        user: users,
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
    
    return result.map(r => ({ ...r.activity, user: r.user }));
  }

  async getActivityFeed(userId: number, limit: number = 50): Promise<(Activity & { user: User })[]> {
    const connections = await this.getMatches(userId);
    const connectionIds = connections.map(c => c.id);
    
    if (connectionIds.length === 0) {
      return [];
    }
    
    const result = await db
      .select({
        activity: activities,
        user: users,
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
    
    return result
      .filter(r => connectionIds.includes(r.activity.userId))
      .map(r => ({ ...r.activity, user: r.user }));
  }

  async getCommentsByExperience(experienceId: number): Promise<(Comment & { user: User })[]> {
    const result = await db
      .select()
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.experienceId, experienceId))
      .orderBy(desc(comments.createdAt));
    
    return result.map(r => ({ ...r.comments, user: r.users }));
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    await db.delete(comments).where(
      and(eq(comments.id, commentId), eq(comments.userId, userId))
    );
  }

  async getExperienceRating(experienceId: number): Promise<{ average: number; count: number }> {
    const expComments = await db
      .select({ rating: comments.rating })
      .from(comments)
      .where(and(eq(comments.experienceId, experienceId), isNotNull(comments.rating)));
    
    const ratings = expComments.filter(c => c.rating !== null).map(c => c.rating as number);
    if (ratings.length === 0) {
      return { average: 0, count: 0 };
    }
    
    const sum = ratings.reduce((a, b) => a + b, 0);
    return { average: sum / ratings.length, count: ratings.length };
  }

  async followUser(followerId: number, followingId: number): Promise<Follow> {
    const [follow] = await db.insert(follows).values({ followerId, followingId }).returning();
    return follow;
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db.select().from(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );
    return !!follow;
  }

  async getFollowers(userId: number): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    
    return result.map(r => r.user);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    
    return result.map(r => r.user);
  }

  async getFollowCounts(userId: number): Promise<{ followers: number; following: number }> {
    const followers = await db.select().from(follows).where(eq(follows.followingId, userId));
    const following = await db.select().from(follows).where(eq(follows.followerId, userId));
    return { followers: followers.length, following: following.length };
  }

  async getPodExperiences(podId: number): Promise<(Experience & { creator: { id: number; name: string | null; avatar: string | null } | null })[]> {
    const result = await db
      .select({ 
        experience: experiences,
        creator: users 
      })
      .from(podExperiences)
      .innerJoin(experiences, eq(podExperiences.experienceId, experiences.id))
      .leftJoin(users, eq(experiences.userId, users.id))
      .where(eq(podExperiences.podId, podId))
      .orderBy(desc(podExperiences.addedAt));
    
    return result.map(r => ({
      ...r.experience,
      creator: r.creator ? {
        id: r.creator.id,
        name: r.creator.name,
        avatar: r.creator.avatar,
      } : null
    }));
  }

  async addExperienceToPod(podId: number, experienceId: number, userId: number): Promise<void> {
    await db.insert(podExperiences).values({ podId, experienceId, addedByUserId: userId });
  }

  async removeExperienceFromPod(podId: number, experienceId: number): Promise<void> {
    await db.delete(podExperiences).where(
      and(eq(podExperiences.podId, podId), eq(podExperiences.experienceId, experienceId))
    );
  }

  async isExperienceInPod(podId: number, experienceId: number): Promise<boolean> {
    const [exists] = await db.select().from(podExperiences).where(
      and(eq(podExperiences.podId, podId), eq(podExperiences.experienceId, experienceId))
    );
    return !!exists;
  }

  async getPodAlbums(podId: number): Promise<(PodAlbum & { creator: User; photoCount: number })[]> {
    const albums = await db
      .select()
      .from(podAlbums)
      .innerJoin(users, eq(podAlbums.createdByUserId, users.id))
      .where(eq(podAlbums.podId, podId))
      .orderBy(desc(podAlbums.createdAt));
    
    const result = await Promise.all(albums.map(async (a) => {
      const photos = await db.select().from(albumPhotos).where(eq(albumPhotos.albumId, a.pod_albums.id));
      return {
        ...a.pod_albums,
        creator: a.users,
        photoCount: photos.length,
      };
    }));
    
    return result;
  }

  async getPodAlbumById(albumId: number): Promise<PodAlbum | undefined> {
    const [album] = await db.select().from(podAlbums).where(eq(podAlbums.id, albumId));
    return album || undefined;
  }

  async createPodAlbum(data: InsertPodAlbum): Promise<PodAlbum> {
    const [album] = await db.insert(podAlbums).values(data).returning();
    return album;
  }

  async deletePodAlbum(albumId: number): Promise<void> {
    await db.delete(albumPhotos).where(eq(albumPhotos.albumId, albumId));
    await db.delete(podAlbums).where(eq(podAlbums.id, albumId));
  }

  async getAlbumPhotos(albumId: number): Promise<(AlbumPhoto & { user: User })[]> {
    const photos = await db
      .select()
      .from(albumPhotos)
      .innerJoin(users, eq(albumPhotos.uploadedByUserId, users.id))
      .where(eq(albumPhotos.albumId, albumId))
      .orderBy(desc(albumPhotos.createdAt));
    
    return photos.map(p => ({ ...p.album_photos, user: p.users }));
  }

  async addPhotoToAlbum(data: InsertAlbumPhoto): Promise<AlbumPhoto> {
    const [photo] = await db.insert(albumPhotos).values(data).returning();
    
    const album = await this.getPodAlbumById(data.albumId);
    if (album && !album.coverPhotoUrl) {
      await this.updateAlbumCover(data.albumId, data.photoUrl);
    }
    
    return photo;
  }

  async deleteAlbumPhoto(photoId: number): Promise<void> {
    await db.delete(albumPhotos).where(eq(albumPhotos.id, photoId));
  }

  async updateAlbumCover(albumId: number, coverUrl: string): Promise<void> {
    await db.update(podAlbums).set({ coverPhotoUrl: coverUrl }).where(eq(podAlbums.id, albumId));
  }

  async getAllBadges(): Promise<Badge[]> {
    return db.select().from(badges);
  }

  async getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    const result = await db
      .select()
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));
    
    return result.map(r => ({ ...r.user_badges, badge: r.badges }));
  }

  async awardBadge(userId: number, badgeId: number): Promise<UserBadge> {
    const [userBadge] = await db.insert(userBadges).values({ userId, badgeId }).returning();
    return userBadge;
  }

  async hasUserEarnedBadge(userId: number, badgeId: number): Promise<boolean> {
    const [exists] = await db.select().from(userBadges).where(
      and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId))
    );
    return !!exists;
  }

  async checkAndAwardBadges(userId: number): Promise<Badge[]> {
    const allBadges = await this.getAllBadges();
    const newlyEarned: Badge[] = [];
    
    for (const badge of allBadges) {
      const alreadyHas = await this.hasUserEarnedBadge(userId, badge.id);
      if (alreadyHas) continue;
      
      let count = 0;
      
      switch (badge.criteriaType) {
        case 'experiences_created':
          const userExperiences = await db.select().from(experiences).where(eq(experiences.userId, userId));
          count = userExperiences.length;
          break;
          
        case 'pods_joined':
          const userPods = await db.select().from(podMembers).where(eq(podMembers.userId, userId));
          count = userPods.length;
          break;
          
        case 'outdoor_experiences':
          const outdoorExp = await db.select().from(experiences).where(
            and(eq(experiences.userId, userId), eq(experiences.category, 'Outdoor'))
          );
          count = outdoorExp.length;
          break;
          
        case 'park_visits':
          const parkExp = await db.select().from(experiences).where(eq(experiences.userId, userId));
          count = parkExp.filter(e => 
            e.category === 'Parks & Playgrounds' || 
            e.title.toLowerCase().includes('park')
          ).length;
          break;
          
        case 'connections_made':
          const connections = await db.select().from(familyConnections).where(
            and(eq(familyConnections.userId, userId), eq(familyConnections.status, 'accepted'))
          );
          count = connections.length;
          break;
      }
      
      if (count >= badge.threshold) {
        await this.awardBadge(userId, badge.id);
        newlyEarned.push(badge);
      }
    }
    
    return newlyEarned;
  }

  async createExperienceCheckin(data: InsertExperienceCheckin): Promise<ExperienceCheckin> {
    const [checkin] = await db.insert(experienceCheckins).values(data).returning();
    return checkin;
  }

  async getCheckinsByExperience(experienceId: number): Promise<(ExperienceCheckin & { user: User })[]> {
    const results = await db.select()
      .from(experienceCheckins)
      .leftJoin(users, eq(experienceCheckins.userId, users.id))
      .where(eq(experienceCheckins.experienceId, experienceId))
      .orderBy(desc(experienceCheckins.createdAt));
    
    return results.map(r => ({
      ...r.experience_checkins,
      user: r.users!,
    }));
  }

  async getCheckinsByUser(userId: number): Promise<(ExperienceCheckin & { experience: Experience })[]> {
    const results = await db.select()
      .from(experienceCheckins)
      .leftJoin(experiences, eq(experienceCheckins.experienceId, experiences.id))
      .where(eq(experienceCheckins.userId, userId))
      .orderBy(desc(experienceCheckins.createdAt));
    
    return results.map(r => ({
      ...r.experience_checkins,
      experience: r.experiences!,
    }));
  }

  async getCheckinCount(experienceId: number): Promise<number> {
    const results = await db.select()
      .from(experienceCheckins)
      .where(eq(experienceCheckins.experienceId, experienceId));
    return results.length;
  }

  async hasUserCheckedIn(userId: number, experienceId: number): Promise<boolean> {
    const [exists] = await db.select()
      .from(experienceCheckins)
      .where(and(
        eq(experienceCheckins.userId, userId),
        eq(experienceCheckins.experienceId, experienceId)
      ));
    return !!exists;
  }

  async getTripsByPod(podId: number): Promise<(PodTrip & { creator: User; itemCount: number })[]> {
    const results = await db.select()
      .from(podTrips)
      .leftJoin(users, eq(podTrips.createdByUserId, users.id))
      .where(eq(podTrips.podId, podId))
      .orderBy(desc(podTrips.createdAt));
    
    const tripsWithCounts = await Promise.all(results.map(async (r) => {
      const items = await db.select().from(tripItems).where(eq(tripItems.tripId, r.pod_trips.id));
      return {
        ...r.pod_trips,
        creator: r.users!,
        itemCount: items.length,
      };
    }));
    
    return tripsWithCounts;
  }

  async getTripsByUser(userId: number): Promise<(PodTrip & { creator: User; itemCount: number; pod: Pod })[]> {
    const userPods = await this.getPodsByUser(userId);
    const podIds = userPods.map(p => p.id);
    
    if (podIds.length === 0) return [];
    
    const results = await db.select()
      .from(podTrips)
      .leftJoin(users, eq(podTrips.createdByUserId, users.id))
      .leftJoin(pods, eq(podTrips.podId, pods.id))
      .where(inArray(podTrips.podId, podIds))
      .orderBy(desc(podTrips.createdAt));
    
    const tripsWithCounts = await Promise.all(results.map(async (r) => {
      const items = await db.select().from(tripItems).where(eq(tripItems.tripId, r.pod_trips.id));
      return {
        ...r.pod_trips,
        creator: r.users!,
        pod: r.pods!,
        itemCount: items.length,
      };
    }));
    
    return tripsWithCounts;
  }

  async getTripById(tripId: number): Promise<(PodTrip & { items: TripItem[] }) | undefined> {
    const [trip] = await db.select().from(podTrips).where(eq(podTrips.id, tripId));
    if (!trip) return undefined;
    
    const items = await db.select()
      .from(tripItems)
      .where(eq(tripItems.tripId, tripId))
      .orderBy(tripItems.dayNumber, tripItems.sortOrder);
    
    return { ...trip, items };
  }

  async createTrip(data: InsertPodTrip): Promise<PodTrip> {
    const [trip] = await db.insert(podTrips).values(data).returning();
    return trip;
  }

  async updateTrip(tripId: number, data: Partial<PodTrip>): Promise<PodTrip> {
    const [trip] = await db.update(podTrips)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(podTrips.id, tripId))
      .returning();
    return trip;
  }

  async deleteTrip(tripId: number): Promise<void> {
    await db.delete(tripItems).where(eq(tripItems.tripId, tripId));
    await db.delete(podTrips).where(eq(podTrips.id, tripId));
  }

  async getTripItems(tripId: number): Promise<TripItem[]> {
    return db.select()
      .from(tripItems)
      .where(eq(tripItems.tripId, tripId))
      .orderBy(tripItems.dayNumber, tripItems.sortOrder);
  }

  async createTripItem(data: InsertTripItem): Promise<TripItem> {
    const [item] = await db.insert(tripItems).values(data).returning();
    return item;
  }

  async updateTripItem(itemId: number, data: Partial<TripItem>): Promise<TripItem> {
    const [item] = await db.update(tripItems)
      .set(data)
      .where(eq(tripItems.id, itemId))
      .returning();
    return item;
  }

  async deleteTripItem(itemId: number): Promise<void> {
    await db.delete(tripItems).where(eq(tripItems.id, itemId));
  }

  async bulkCreateTripItems(items: InsertTripItem[]): Promise<TripItem[]> {
    if (items.length === 0) return [];
    return db.insert(tripItems).values(items).returning();
  }

  async clearTripItems(tripId: number): Promise<void> {
    await db.delete(tripItems).where(eq(tripItems.tripId, tripId));
  }

  async getTripDestinations(tripId: number): Promise<TripDestination[]> {
    return db.select()
      .from(tripDestinations)
      .where(eq(tripDestinations.tripId, tripId))
      .orderBy(tripDestinations.sortOrder);
  }

  async createTripDestination(data: InsertTripDestination): Promise<TripDestination> {
    const [dest] = await db.insert(tripDestinations).values(data).returning();
    return dest;
  }

  async updateTripDestination(destId: number, data: Partial<TripDestination>): Promise<TripDestination> {
    const [dest] = await db.update(tripDestinations)
      .set(data)
      .where(eq(tripDestinations.id, destId))
      .returning();
    return dest;
  }

  async deleteTripDestination(destId: number): Promise<void> {
    await db.delete(tripDestinations).where(eq(tripDestinations.id, destId));
  }

  async clearTripDestinations(tripId: number): Promise<void> {
    await db.delete(tripDestinations).where(eq(tripDestinations.tripId, tripId));
  }

  async getFamilyMembers(userId: number): Promise<FamilyMember[]> {
    return db.select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId))
      .orderBy(familyMembers.isAdult, familyMembers.sortOrder);
  }

  async createFamilyMember(data: InsertFamilyMember): Promise<FamilyMember> {
    const [member] = await db.insert(familyMembers).values(data).returning();
    return member;
  }

  async updateFamilyMember(memberId: number, data: Partial<FamilyMember>): Promise<FamilyMember> {
    const [member] = await db.update(familyMembers)
      .set(data)
      .where(eq(familyMembers.id, memberId))
      .returning();
    return member;
  }

  async deleteFamilyMember(memberId: number): Promise<void> {
    await db.delete(familyMembers).where(eq(familyMembers.id, memberId));
  }

  async getBookingOptions(tripItemId?: number): Promise<BookingOption[]> {
    if (tripItemId) {
      return db.select().from(bookingOptions)
        .where(and(eq(bookingOptions.tripItemId, tripItemId), eq(bookingOptions.isActive, true)))
        .orderBy(bookingOptions.priceInCents);
    }
    return db.select().from(bookingOptions)
      .where(eq(bookingOptions.isActive, true))
      .orderBy(desc(bookingOptions.createdAt));
  }

  async getBookingOptionById(id: number): Promise<BookingOption | undefined> {
    const [option] = await db.select().from(bookingOptions).where(eq(bookingOptions.id, id));
    return option || undefined;
  }

  async createBookingOption(data: InsertBookingOption): Promise<BookingOption> {
    const [option] = await db.insert(bookingOptions).values(data).returning();
    return option;
  }

  async updateBookingOption(id: number, data: Partial<BookingOption>): Promise<BookingOption> {
    const [option] = await db.update(bookingOptions).set(data).where(eq(bookingOptions.id, id)).returning();
    return option;
  }

  async deleteBookingOption(id: number): Promise<void> {
    await db.update(bookingOptions).set({ isActive: false }).where(eq(bookingOptions.id, id));
  }

  async getCartByUser(userId: number): Promise<(Cart & { items: (CartItem & { bookingOption: BookingOption })[] }) | undefined> {
    const [cart] = await db.select().from(carts)
      .where(and(eq(carts.userId, userId), eq(carts.status, 'active')));
    
    if (!cart) return undefined;

    const items = await db.select({
      cartItem: cartItems,
      bookingOption: bookingOptions
    }).from(cartItems)
      .innerJoin(bookingOptions, eq(cartItems.bookingOptionId, bookingOptions.id))
      .where(eq(cartItems.cartId, cart.id));

    return {
      ...cart,
      items: items.map(i => ({ ...i.cartItem, bookingOption: i.bookingOption }))
    };
  }

  async getOrCreateCart(userId: number, podTripId?: number): Promise<Cart> {
    const existingCart = await db.select().from(carts)
      .where(and(eq(carts.userId, userId), eq(carts.status, 'active')));
    
    if (existingCart.length > 0) return existingCart[0];

    const [cart] = await db.insert(carts).values({
      userId,
      podTripId,
      status: 'active'
    }).returning();
    return cart;
  }

  async addToCart(data: InsertCartItem): Promise<CartItem> {
    const [item] = await db.insert(cartItems).values(data).returning();
    return item;
  }

  async updateCartItem(itemId: number, data: Partial<CartItem>): Promise<CartItem> {
    const [item] = await db.update(cartItems).set(data).where(eq(cartItems.id, itemId)).returning();
    return item;
  }

  async removeFromCart(itemId: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
  }

  async clearCart(cartId: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
    await db.update(carts).set({ status: 'completed' }).where(eq(carts.id, cartId));
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async getOrderById(id: number): Promise<(Order & { items: (OrderItem & { bookingOption: BookingOption })[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db.select({
      orderItem: orderItems,
      bookingOption: bookingOptions
    }).from(orderItems)
      .innerJoin(bookingOptions, eq(orderItems.bookingOptionId, bookingOptions.id))
      .where(eq(orderItems.orderId, id));

    return {
      ...order,
      items: items.map(i => ({ ...i.orderItem, bookingOption: i.bookingOption }))
    };
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByPodTrip(podTripId: number): Promise<(Order & { user: User })[]> {
    const result = await db.select({
      order: orders,
      user: users
    }).from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.podTripId, podTripId))
      .orderBy(desc(orders.createdAt));

    return result.map(r => ({ ...r.order, user: r.user }));
  }

  async updateOrder(id: number, data: Partial<Order>): Promise<Order> {
    const [order] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return order;
  }

  async createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]> {
    if (items.length === 0) return [];
    return db.insert(orderItems).values(items).returning();
  }

  async getConfirmationSession(tripId: number): Promise<TripConfirmationSession | undefined> {
    const [session] = await db.select().from(tripConfirmationSessions)
      .where(eq(tripConfirmationSessions.tripId, tripId));
    return session || undefined;
  }

  async createConfirmationSession(data: InsertTripConfirmationSession): Promise<TripConfirmationSession> {
    const [session] = await db.insert(tripConfirmationSessions).values(data).returning();
    return session;
  }

  async updateConfirmationSession(sessionId: number, data: Partial<TripConfirmationSession>): Promise<TripConfirmationSession> {
    const [session] = await db.update(tripConfirmationSessions)
      .set(data)
      .where(eq(tripConfirmationSessions.id, sessionId))
      .returning();
    return session;
  }

  async getTripItemOptions(tripItemId: number, generationId?: string): Promise<TripItemOption[]> {
    if (generationId) {
      return db.select().from(tripItemOptions)
        .where(and(
          eq(tripItemOptions.tripItemId, tripItemId),
          eq(tripItemOptions.generationId, generationId)
        ))
        .orderBy(tripItemOptions.createdAt);
    }
    return db.select().from(tripItemOptions)
      .where(eq(tripItemOptions.tripItemId, tripItemId))
      .orderBy(desc(tripItemOptions.createdAt));
  }

  async createTripItemOptions(options: InsertTripItemOption[]): Promise<TripItemOption[]> {
    if (options.length === 0) return [];
    return db.insert(tripItemOptions).values(options).returning();
  }

  async deleteTripItemOptions(tripItemId: number, generationId?: string): Promise<void> {
    if (generationId) {
      await db.delete(tripItemOptions)
        .where(and(
          eq(tripItemOptions.tripItemId, tripItemId),
          eq(tripItemOptions.generationId, generationId)
        ));
    } else {
      await db.delete(tripItemOptions)
        .where(eq(tripItemOptions.tripItemId, tripItemId));
    }
  }

  async lockTripItemOption(optionId: number): Promise<TripItemOption> {
    const [option] = await db.update(tripItemOptions)
      .set({ isLocked: true })
      .where(eq(tripItemOptions.id, optionId))
      .returning();
    return option;
  }

  async updateTripStatus(tripId: number, status: string): Promise<PodTrip> {
    const [trip] = await db.update(podTrips)
      .set({ status, updatedAt: new Date() })
      .where(eq(podTrips.id, tripId))
      .returning();
    return trip;
  }

  async updateTripItemConfirmation(itemId: number, state: string, selectedOptionId?: number): Promise<TripItem> {
    const [item] = await db.update(tripItems)
      .set({ 
        confirmationState: state, 
        selectedOptionId: selectedOptionId || null 
      })
      .where(eq(tripItems.id, itemId))
      .returning();
    return item;
  }

  async getConfirmableItems(tripId: number): Promise<TripItem[]> {
    return db.select().from(tripItems)
      .where(and(
        eq(tripItems.tripId, tripId),
        eq(tripItems.isConfirmable, true)
      ))
      .orderBy(tripItems.dayNumber, tripItems.sortOrder);
  }
}

export const storage = new DatabaseStorage();
