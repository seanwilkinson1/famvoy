import { 
  type User, 
  type InsertUser,
  type Experience,
  type InsertExperience,
  type Pod,
  type InsertPod,
  type Message,
  type InsertMessage,
  type InsertSavedExperience,
  users,
  experiences,
  pods,
  podMembers,
  savedExperiences,
  messages,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getExperiences(): Promise<Experience[]>;
  getExperienceById(id: number): Promise<Experience | undefined>;
  getExperiencesByUser(userId: number): Promise<Experience[]>;
  getSavedExperiences(userId: number): Promise<Experience[]>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  saveExperience(data: InsertSavedExperience): Promise<void>;
  unsaveExperience(userId: number, experienceId: number): Promise<void>;
  
  getPods(): Promise<Pod[]>;
  getPodById(id: number): Promise<Pod | undefined>;
  getPodsByUser(userId: number): Promise<Pod[]>;
  createPod(pod: InsertPod): Promise<Pod>;
  addPodMember(podId: number, userId: number): Promise<void>;
  
  getMessages(podId: number): Promise<Array<Message & { user: User }>>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
}

export const storage = new DatabaseStorage();
