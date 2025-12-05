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
  users,
  experiences,
  pods,
  podMembers,
  savedExperiences,
  messages,
  familyConnections,
  familySwipes,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ne, notInArray, ilike } from "drizzle-orm";

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
  getSavedExperiences(userId: number): Promise<Experience[]>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  saveExperience(data: InsertSavedExperience): Promise<void>;
  unsaveExperience(userId: number, experienceId: number): Promise<void>;
  searchExperiences(query: string): Promise<Experience[]>;
  
  getPods(): Promise<Pod[]>;
  getPodById(id: number): Promise<Pod | undefined>;
  getPodsByUser(userId: number): Promise<Pod[]>;
  createPod(pod: InsertPod): Promise<Pod>;
  addPodMember(podId: number, userId: number): Promise<void>;
  
  getMessages(podId: number): Promise<Array<Message & { user: User }>>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  getFamilyConnections(userId: number): Promise<Array<FamilyConnection & { connectedUser: User }>>;
  getPendingConnectionRequests(userId: number): Promise<Array<FamilyConnection & { user: User }>>;
  sendConnectionRequest(data: InsertFamilyConnection): Promise<FamilyConnection>;
  acceptConnection(connectionId: number): Promise<void>;
  declineConnection(connectionId: number): Promise<void>;
  
  getDiscoverableFamilies(userId: number): Promise<User[]>;
  recordSwipe(data: InsertFamilySwipe): Promise<{ matched: boolean }>;
  getMatches(userId: number): Promise<User[]>;
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
          name: userData.name || existingUser.name,
          avatar: userData.avatar || existingUser.avatar,
          location: userData.location || existingUser.location,
          kids: userData.kids || existingUser.kids,
          interests: userData.interests || existingUser.interests,
          bio: userData.bio || existingUser.bio,
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

  async createPod(pod: InsertPod): Promise<Pod> {
    const [newPod] = await db.insert(pods).values(pod).returning();
    return newPod;
  }

  async addPodMember(podId: number, userId: number): Promise<void> {
    await db.insert(podMembers).values({ podId, userId }).onConflictDoNothing();
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

  async getDiscoverableFamilies(userId: number): Promise<User[]> {
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
    
    return db.select().from(users).where(notInArray(users.id, excludeIds));
  }

  async recordSwipe(data: InsertFamilySwipe): Promise<{ matched: boolean }> {
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
        
        return { matched: true };
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
}

export const storage = new DatabaseStorage();
