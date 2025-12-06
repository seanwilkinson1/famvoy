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
  image: text("image"),
  category: text("category"),
  isDirect: boolean("is_direct").default(false),
  isPublic: boolean("is_public").default(true),
  creatorId: integer("creator_id").references(() => users.id),
  memberCount: integer("member_count").default(0),
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
  messageType: text("message_type").default("text"),
  imageUrl: text("image_url"),
  sharedExperienceId: integer("shared_experience_id").references(() => experiences.id),
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

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetId: integer("target_id"),
  targetType: text("target_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followingId: integer("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const podExperiences = pgTable("pod_experiences", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").notNull().references(() => pods.id),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  addedByUserId: integer("added_by_user_id").notNull().references(() => users.id),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const podAlbums = pgTable("pod_albums", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").notNull().references(() => pods.id),
  name: text("name").notNull(),
  description: text("description"),
  coverPhotoUrl: text("cover_photo_url"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const albumPhotos = pgTable("album_photos", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id").notNull().references(() => podAlbums.id),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  uploadedByUserId: integer("uploaded_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  criteriaType: text("criteria_type").notNull(),
  threshold: integer("threshold").notNull(),
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExperienceSchema = createInsertSchema(experiences).omit({ id: true, createdAt: true });
export const insertPodSchema = createInsertSchema(pods).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertSavedExperienceSchema = createInsertSchema(savedExperiences).omit({ id: true, savedAt: true });
export const insertFamilyConnectionSchema = createInsertSchema(familyConnections).omit({ id: true, createdAt: true, status: true });
export const insertFamilySwipeSchema = createInsertSchema(familySwipes).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, createdAt: true });
export const insertPodExperienceSchema = createInsertSchema(podExperiences).omit({ id: true, addedAt: true });
export const insertPodAlbumSchema = createInsertSchema(podAlbums).omit({ id: true, createdAt: true });
export const insertAlbumPhotoSchema = createInsertSchema(albumPhotos).omit({ id: true, createdAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });

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

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

export type PodExperience = typeof podExperiences.$inferSelect;
export type InsertPodExperience = z.infer<typeof insertPodExperienceSchema>;

export type PodAlbum = typeof podAlbums.$inferSelect;
export type InsertPodAlbum = z.infer<typeof insertPodAlbumSchema>;

export type AlbumPhoto = typeof albumPhotos.$inferSelect;
export type InsertAlbumPhoto = z.infer<typeof insertAlbumPhotoSchema>;

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
