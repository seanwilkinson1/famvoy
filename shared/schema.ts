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
  familyValues: text("family_values").array(),
  languages: text("languages").array(),
  pets: text("pets"),
  familyMotto: text("family_motto"),
  favoriteTraditions: text("favorite_traditions"),
  dreamVacation: text("dream_vacation"),
  isAgent: boolean("is_agent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  photo: text("photo"),
  ageGroup: text("age_group"),
  isAdult: boolean("is_adult").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
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

export const experienceCheckins = pgTable("experience_checkins", {
  id: serial("id").primaryKey(),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  userId: integer("user_id").notNull().references(() => users.id),
  photoUrl: text("photo_url"),
  review: text("review"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const podTrips = pgTable("pod_trips", {
  id: serial("id").primaryKey(),
  podId: integer("pod_id").notNull().references(() => pods.id),
  name: text("name").notNull(),
  destination: text("destination").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  aiSummary: text("ai_summary"),
  status: text("status").default("draft").notNull(),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  pace: text("pace"),
  kidsAgeGroups: text("kids_age_groups").array(),
  tripInterests: text("trip_interests").array(),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tripDestinations = pgTable("trip_destinations", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => podTrips.id),
  destination: text("destination").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tripItems = pgTable("trip_items", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => podTrips.id),
  destinationId: integer("destination_id").references(() => tripDestinations.id),
  dayNumber: integer("day_number").notNull(),
  dayTitle: text("day_title"),
  time: text("time").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  itemType: text("item_type").notNull(),
  sortOrder: integer("sort_order").notNull(),
  experienceId: integer("experience_id").references(() => experiences.id),
  isConfirmable: boolean("is_confirmable").default(true),
  confirmationState: text("confirmation_state").default("pending"),
  selectedOptionId: integer("selected_option_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tripConfirmationSessions = pgTable("trip_confirmation_sessions", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => podTrips.id),
  currentItemIndex: integer("current_item_index").default(0).notNull(),
  requestedByUserId: integer("requested_by_user_id").notNull().references(() => users.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const tripItemOptions = pgTable("trip_item_options", {
  id: serial("id").primaryKey(),
  tripItemId: integer("trip_item_id").notNull().references(() => tripItems.id),
  generationId: text("generation_id").notNull(),
  provider: text("provider"),
  title: text("title").notNull(),
  description: text("description"),
  priceEstimate: text("price_estimate"),
  numericPriceEstimate: integer("numeric_price_estimate"),
  rating: text("rating"),
  reviewCount: integer("review_count"),
  image: text("image"),
  bookingUrl: text("booking_url"),
  address: text("address"),
  metadata: jsonb("metadata"),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const bookingOptions = pgTable("booking_options", {
  id: serial("id").primaryKey(),
  tripItemId: integer("trip_item_id").references(() => tripItems.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priceInCents: integer("price_in_cents").notNull(),
  currency: text("currency").default("usd").notNull(),
  image: text("image"),
  locationName: text("location_name"),
  duration: text("duration"),
  maxGuests: integer("max_guests"),
  isActive: boolean("is_active").default(true).notNull(),
  stripePriceId: text("stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  podTripId: integer("pod_trip_id").references(() => podTrips.id),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull().references(() => carts.id),
  bookingOptionId: integer("booking_option_id").notNull().references(() => bookingOptions.id),
  quantity: integer("quantity").default(1).notNull(),
  guestCount: integer("guest_count").default(1).notNull(),
  selectedDate: text("selected_date"),
  priceSnapshot: integer("price_snapshot").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  cartId: integer("cart_id").references(() => carts.id),
  podTripId: integer("pod_trip_id").references(() => podTrips.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  totalInCents: integer("total_in_cents").notNull(),
  currency: text("currency").default("usd").notNull(),
  status: text("status").default("pending").notNull(),
  confirmationData: jsonb("confirmation_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  bookingOptionId: integer("booking_option_id").notNull().references(() => bookingOptions.id),
  quantity: integer("quantity").notNull(),
  guestCount: integer("guest_count").notNull(),
  selectedDate: text("selected_date"),
  priceInCents: integer("price_in_cents").notNull(),
  status: text("status").default("confirmed").notNull(),
  confirmationCode: text("confirmation_code"),
});

export const conciergeRequests = pgTable("concierge_requests", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => podTrips.id),
  userId: integer("user_id").notNull().references(() => users.id),
  assignedAgentId: integer("assigned_agent_id").references(() => users.id),
  status: text("status").default("pending").notNull(),
  totalEstimatedCents: integer("total_estimated_cents").notNull(),
  serviceFeePercent: integer("service_fee_percent").default(15).notNull(),
  serviceFeeCents: integer("service_fee_cents").notNull(),
  totalPaidCents: integer("total_paid_cents").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  customerNotes: text("customer_notes"),
  agentNotes: text("agent_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const conciergeRequestItems = pgTable("concierge_request_items", {
  id: serial("id").primaryKey(),
  conciergeRequestId: integer("concierge_request_id").notNull().references(() => conciergeRequests.id),
  tripItemId: integer("trip_item_id").notNull().references(() => tripItems.id),
  selectedOptionId: integer("selected_option_id").references(() => tripItemOptions.id),
  status: text("status").default("pending").notNull(),
  estimatedPriceCents: integer("estimated_price_cents"),
  actualPriceCents: integer("actual_price_cents"),
  confirmationCode: text("confirmation_code"),
  bookingReference: text("booking_reference"),
  providerName: text("provider_name"),
  agentNotes: text("agent_notes"),
  bookedAt: timestamp("booked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({ id: true });
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
export const insertExperienceCheckinSchema = createInsertSchema(experienceCheckins).omit({ id: true, createdAt: true });
export const insertPodTripSchema = createInsertSchema(podTrips).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTripDestinationSchema = createInsertSchema(tripDestinations).omit({ id: true, createdAt: true });
export const insertTripItemSchema = createInsertSchema(tripItems).omit({ id: true, createdAt: true });
export const insertTripConfirmationSessionSchema = createInsertSchema(tripConfirmationSessions).omit({ id: true, startedAt: true });
export const insertTripItemOptionSchema = createInsertSchema(tripItemOptions).omit({ id: true, createdAt: true });
export const insertBookingOptionSchema = createInsertSchema(bookingOptions).omit({ id: true, createdAt: true });
export const insertCartSchema = createInsertSchema(carts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertConciergeRequestSchema = createInsertSchema(conciergeRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConciergeRequestItemSchema = createInsertSchema(conciergeRequestItems).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = {
  clerkId: string;
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
  location?: string | null;
  kids?: string | null;
  interests?: string[] | null;
  bio?: string | null;
  familyValues?: string[] | null;
  languages?: string[] | null;
  pets?: string | null;
  familyMotto?: string | null;
  favoriteTraditions?: string | null;
  dreamVacation?: string | null;
};

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;

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

export type ExperienceCheckin = typeof experienceCheckins.$inferSelect;
export type InsertExperienceCheckin = z.infer<typeof insertExperienceCheckinSchema>;

export type PodTrip = typeof podTrips.$inferSelect;
export type InsertPodTrip = z.infer<typeof insertPodTripSchema>;

export type TripDestination = typeof tripDestinations.$inferSelect;
export type InsertTripDestination = z.infer<typeof insertTripDestinationSchema>;

export type TripItem = typeof tripItems.$inferSelect;
export type InsertTripItem = z.infer<typeof insertTripItemSchema>;

export type TripConfirmationSession = typeof tripConfirmationSessions.$inferSelect;
export type InsertTripConfirmationSession = z.infer<typeof insertTripConfirmationSessionSchema>;

export type TripItemOption = typeof tripItemOptions.$inferSelect;
export type InsertTripItemOption = z.infer<typeof insertTripItemOptionSchema>;

export type BookingOption = typeof bookingOptions.$inferSelect;
export type InsertBookingOption = z.infer<typeof insertBookingOptionSchema>;

export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type ConciergeRequest = typeof conciergeRequests.$inferSelect;
export type InsertConciergeRequest = z.infer<typeof insertConciergeRequestSchema>;

export type ConciergeRequestItem = typeof conciergeRequestItems.$inferSelect;
export type InsertConciergeRequestItem = z.infer<typeof insertConciergeRequestItemSchema>;
