import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, real, timestamp, integer, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id").unique(),
  replitId: varchar("replit_id").unique(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  name: text("name"),
  avatar: text("avatar"),
  location: text("location"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  kids: text("kids"),
  interests: text("interests").array(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  image: text("image").notNull(),
  duration: text("duration").notNull(),
  cost: text("cost").notNull(),
  ages: text("ages").notNull(),
  category: text("category").notNull(),
  locationName: text("location_name").notNull(),
  locationLat: real("location_lat").notNull(),
  locationLng: real("location_lng").notNull(),
  description: text("description"),
  tips: text("tips").array(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pods = pgTable("pods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const podMembers = pgTable("pod_members", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").notNull().references(() => pods.id),
  userId: integer("user_id").notNull().references(() => users.id),
});

export const savedExperiences = pgTable("saved_experiences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").notNull().references(() => pods.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const familyConnections = pgTable("family_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  connectedUserId: integer("connected_user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const familySwipes = pgTable("family_swipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  swipedUserId: integer("swiped_user_id").notNull().references(() => users.id),
  liked: boolean("liked").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExperienceSchema = createInsertSchema(experiences).omit({ id: true, createdAt: true });
export const insertPodSchema = createInsertSchema(pods).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertSavedExperienceSchema = createInsertSchema(savedExperiences).omit({ id: true, savedAt: true });
export const insertFamilyConnectionSchema = createInsertSchema(familyConnections).omit({ id: true, createdAt: true, status: true });
export const insertFamilySwipeSchema = createInsertSchema(familySwipes).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = {
  clerkId: string;
  name?: string | null;
  avatar?: string | null;
  location?: string | null;
  kids?: string | null;
  interests?: string[] | null;
  bio?: string | null;
};

export type Experience = typeof experiences.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;

export type Pod = typeof pods.$inferSelect;
export type InsertPod = z.infer<typeof insertPodSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type SavedExperience = typeof savedExperiences.$inferSelect;
export type InsertSavedExperience = z.infer<typeof insertSavedExperienceSchema>;

export type FamilyConnection = typeof familyConnections.$inferSelect;
export type InsertFamilyConnection = z.infer<typeof insertFamilyConnectionSchema>;

export type FamilySwipe = typeof familySwipes.$inferSelect;
export type InsertFamilySwipe = z.infer<typeof insertFamilySwipeSchema>;
