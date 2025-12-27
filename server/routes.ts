import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import multer from "multer";
import express from "express";
import { clerkMiddleware, getAuth, requireAuth, clerkClient } from "@clerk/express";
import { storage } from "./storage";
import { db } from "./db";
import { insertExperienceSchema, insertPodSchema, insertMessageSchema, insertSavedExperienceSchema, insertFamilySwipeSchema, insertCommentSchema, insertPodAlbumSchema, insertAlbumPhotoSchema, insertFamilyMemberSchema, insertBookingOptionSchema, insertCartItemSchema, insertPodPostSchema, insertChatMessageSchema, conciergeBookingSessions, conciergeChatMessages, conciergeRequests, conciergeRequestItems, tripItems, users, experiences, pods, podTrips, orders, podMembers, messages, orderItems, tripItemBookingMeta, savedExperiences, comments, podExperiences } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import OpenAI from "openai";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get('/api/config', (req, res) => {
    res.json({
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      googleMapsApiKey: process.env.GOOGLE_PLACES_API_KEY,
    });
  });

  app.use('/uploads', express.static('public/uploads'));

  app.use(clerkMiddleware());

  app.post('/api/upload', requireAuth(), (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File is too large. Maximum size is 20MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ url: imageUrl, filename: req.file.filename });
    });
  });

  app.post('/api/objects/upload', requireAuth(), async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: error.message || "Failed to get upload URL" });
    }
  });

  app.put('/api/objects/confirm', requireAuth(), async (req, res) => {
    try {
      const { uploadURL } = req.body;
      if (!uploadURL) {
        return res.status(400).json({ error: "uploadURL is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      const exists = await objectStorageService.verifyObjectExists(objectPath);
      if (!exists) {
        return res.status(400).json({ error: "Upload not found. Please try uploading again." });
      }
      
      res.json({ objectPath });
    } catch (error: any) {
      console.error("Error confirming upload:", error);
      res.status(400).json({ error: error.message || "Failed to confirm upload" });
    }
  });

  app.get('/objects/:objectPath(*)', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Google Places photo proxy - hides API key from clients
  app.get('/api/places/photo', async (req, res) => {
    try {
      const { ref, maxwidth } = req.query;
      if (!ref || typeof ref !== 'string') {
        return res.status(400).json({ error: 'Missing photo reference' });
      }
      
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Google Places API not configured' });
      }
      
      const width = parseInt(maxwidth as string) || 400;
      const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${ref}&key=${apiKey}`;
      
      const response = await fetch(googlePhotoUrl, { redirect: 'follow' });
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch photo' });
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Error proxying Google Places photo:', error);
      res.status(500).json({ error: 'Failed to fetch photo' });
    }
  });

  app.get('/api/auth/user', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      let user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found", needsOnboarding: true });
      }
      
      if (!user.email) {
        try {
          const clerkUser = await clerkClient.users.getUser(userId);
          const email = clerkUser.emailAddresses?.[0]?.emailAddress || null;
          if (email) {
            user = await storage.updateUserProfile(user.id, { email });
          }
        } catch (e) {
          console.error("Failed to fetch email from Clerk:", e);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/onboarding', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { name, location, kids, interests, bio, avatar } = req.body;
      
      let email: string | null = null;
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        email = clerkUser.emailAddresses?.[0]?.emailAddress || null;
      } catch (e) {
        console.error("Failed to fetch email from Clerk:", e);
      }
      
      const user = await storage.upsertUser({
        clerkId: userId,
        email: email,
        name: name || 'New Family',
        location: location || 'Not set',
        kids: kids || 'Not specified',
        interests: interests || [],
        bio: bio || null,
        avatar: avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400',
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error during onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  app.get('/api/users/me', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      let user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.email) {
        try {
          const clerkUser = await clerkClient.users.getUser(userId);
          const email = clerkUser.emailAddresses?.[0]?.emailAddress || null;
          if (email) {
            user = await storage.updateUserProfile(user.id, { email });
          }
        } catch (e) {
          console.error("Failed to fetch email from Clerk:", e);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user/profile', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const updatedUser = await storage.updateUserProfile(user.id, req.body);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/users/me/trips', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const trips = await storage.getTripsByUser(user.id);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching user trips:", error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  // Explore API - People with location sharing
  app.get('/api/explore/people', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const podId = req.query.podId ? parseInt(req.query.podId as string) : undefined;
      const people = await storage.getExplorePeople(user.id, podId);
      res.json(people);
    } catch (error) {
      console.error("Error fetching explore people:", error);
      res.status(500).json({ message: "Failed to fetch people" });
    }
  });

  // Explore API - Public/Shared trips
  app.get('/api/explore/trips', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const trips = await storage.getExploreTrips(user.id);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching explore trips:", error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  // Update user location (also available at /api/users/location for compatibility)
  app.patch('/api/users/location', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const locationSchema = z.object({
        lat: z.number().optional(),
        lng: z.number().optional(),
        shareLocation: z.boolean(),
      });
      
      const parsed = locationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      
      const { lat, lng, shareLocation } = parsed.data;
      
      // When enabling sharing, coordinates are required
      if (shareLocation && (lat === undefined || lng === undefined)) {
        return res.status(400).json({ error: "Coordinates required when enabling location sharing" });
      }
      
      // When disabling, just update shareLocation flag without touching coordinates
      const updated = await storage.updateUserLocation(
        user.id, 
        lat ?? user.locationLat ?? 0, 
        lng ?? user.locationLng ?? 0, 
        shareLocation
      );
      res.json(updated);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.get("/api/experiences", async (req, res) => {
    try {
      const allExperiences = await storage.getExperiences();
      
      const experienceIds = allExperiences.map(exp => exp.id);
      const userIds = Array.from(new Set(allExperiences.map(exp => exp.userId)));
      
      const [ratingsMap, checkinsMap, usersResults] = await Promise.all([
        storage.getBatchExperienceRatings(experienceIds),
        storage.getBatchCheckinCounts(experienceIds),
        Promise.all(userIds.map(id => storage.getUser(id))),
      ]);
      
      const usersMap = new Map(usersResults.filter(Boolean).map(u => [u!.id, u!]));
      
      const experiencesWithCreators = allExperiences.map(exp => {
        const creator = usersMap.get(exp.userId);
        const ratingData = ratingsMap.get(exp.id) || { average: 0, count: 0 };
        const checkinCount = checkinsMap.get(exp.id) || 0;
        return {
          ...exp,
          creator: creator ? {
            id: creator.id,
            name: creator.name,
            avatar: creator.avatar,
          } : null,
          rating: ratingData.average,
          ratingCount: ratingData.count,
          checkinCount,
        };
      });
      
      res.json(experiencesWithCreators);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/experiences/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const results = await storage.searchExperiences(query);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/experiences/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const experience = await storage.getExperienceById(id);
      if (!experience) {
        return res.status(404).json({ error: "Experience not found" });
      }
      
      const creator = await storage.getUser(experience.userId);
      
      res.json({
        ...experience,
        creator: creator ? {
          id: creator.id,
          name: creator.name,
          avatar: creator.avatar,
        } : null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/experiences", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const parsed = insertExperienceSchema.safeParse({ ...req.body, userId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const experience = await storage.createExperience(parsed.data);
      res.status(201).json(experience);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/experiences/:id", requireAuth(), async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const experience = await storage.getExperienceById(experienceId);
      if (!experience) {
        return res.status(404).json({ error: "Experience not found" });
      }
      if (experience.userId !== user.id) {
        return res.status(403).json({ error: "You can only delete your own experiences" });
      }
      
      await storage.deleteExperience(experienceId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users", requireAuth(), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/experiences", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userExperiences = await storage.getExperiencesByUser(userId);
      res.json(userExperiences);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/saved-experiences", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const saved = await storage.getSavedExperiences(userId);
      res.json(saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/family-members", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const members = await storage.getFamilyMembers(userId);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/family-members", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const parsed = insertFamilyMemberSchema.safeParse({
        ...req.body,
        userId: user.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const member = await storage.createFamilyMember(parsed.data);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/family-members/:id", requireAuth(), async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const member = await storage.updateFamilyMember(memberId, req.body);
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/family-members/:id", requireAuth(), async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.deleteFamilyMember(memberId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/experiences/:id/save", requireAuth(), async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const parsed = insertSavedExperienceSchema.safeParse({ 
        userId: user.id,
        experienceId 
      });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      await storage.saveExperience(parsed.data);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/experiences/:id/save", requireAuth(), async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      await storage.unsaveExperience(user.id, experienceId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods", async (req, res) => {
    try {
      const allPods = await storage.getPods();
      res.json(allPods);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods/discover", async (req, res) => {
    try {
      const publicPods = await storage.getPublicPods();
      res.json(publicPods);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      const results = await storage.searchPods(query);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pod = await storage.getPodById(id);
      if (!pod) {
        return res.status(404).json({ error: "Pod not found" });
      }
      res.json(pod);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods/:id/details", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.getPodWithMembers(id);
      if (!result) {
        return res.status(404).json({ error: "Pod not found" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/direct", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const { otherUserId } = req.body;
      if (!otherUserId) {
        return res.status(400).json({ error: "otherUserId is required" });
      }
      const pod = await storage.getOrCreateDirectPod(user.id, otherUserId);
      res.json(pod);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods", requireAuth(), async (req, res) => {
    try {
      const parsed = insertPodSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const pod = await storage.createPod(parsed.data);
      res.status(201).json(pod);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/group", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const { name, description, category, image } = req.body;
      if (!name || !description) {
        return res.status(400).json({ error: "Name and description are required" });
      }
      const pod = await storage.createGroupPod(user.id, { name, description, category, image });
      res.status(201).json(pod);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/join", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const isMember = await storage.isPodMember(podId, user.id);
      if (isMember) {
        return res.status(400).json({ error: "Already a member" });
      }
      await storage.addPodMember(podId, user.id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/leave", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      await storage.removePodMember(podId, user.id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/pods/:id", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const pod = await storage.getPodById(podId);
      if (!pod) {
        return res.status(404).json({ error: "Pod not found" });
      }
      if (pod.creatorId !== user.id) {
        return res.status(403).json({ error: "Only the pod creator can edit this pod" });
      }
      
      const { name, description, isPublic } = req.body;
      const updatedPod = await storage.updatePod(podId, { name, description, isPublic });
      res.json(updatedPod);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pods/:id", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const pod = await storage.getPodById(podId);
      if (!pod) {
        return res.status(404).json({ error: "Pod not found" });
      }
      if (pod.creatorId !== user.id) {
        return res.status(403).json({ error: "Only the pod creator can delete this pod" });
      }
      
      await storage.deletePod(podId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/invite", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const isMember = await storage.isPodMember(podId, user.id);
      if (!isMember) {
        return res.status(403).json({ error: "You must be a member to invite others" });
      }
      
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const invitedUser = await storage.getUserByEmail(email);
      if (!invitedUser) {
        return res.status(404).json({ error: "No user found with that email" });
      }
      
      const alreadyMember = await storage.isPodMember(podId, invitedUser.id);
      if (alreadyMember) {
        return res.status(400).json({ error: "User is already a member of this pod" });
      }
      
      await storage.addPodMember(podId, invitedUser.id);
      res.json({ success: true, user: { id: invitedUser.id, name: invitedUser.name, avatar: invitedUser.avatar } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pods/:podId/members/:userId", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.podId);
      const memberUserId = parseInt(req.params.userId);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const pod = await storage.getPodById(podId);
      if (!pod) {
        return res.status(404).json({ error: "Pod not found" });
      }
      if (pod.creatorId !== user.id) {
        return res.status(403).json({ error: "Only the pod creator can remove members" });
      }
      if (memberUserId === pod.creatorId) {
        return res.status(400).json({ error: "Cannot remove the pod creator" });
      }
      
      await storage.removePodMember(podId, memberUserId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/pods", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userPods = await storage.getPodsByUser(userId);
      res.json(userPods);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/members", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      await storage.addPodMember(podId, user.id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods/:id/messages", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const podMessages = await storage.getMessages(podId);
      res.json(podMessages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/messages", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const parsed = insertMessageSchema.safeParse({ ...req.body, podId, userId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const message = await storage.createMessage(parsed.data);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pod Posts
  app.get("/api/pods/:id/posts", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) {
        return res.status(400).json({ error: "Invalid pod ID" });
      }
      const posts = await storage.getPodPosts(podId);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/posts", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const isMember = await storage.isPodMember(podId, user.id);
      if (!isMember) {
        return res.status(403).json({ error: "You must be a member of this pod to post" });
      }
      const parsed = insertPodPostSchema.safeParse({ ...req.body, podId, userId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const post = await storage.createPodPost(parsed.data);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pods/:podId/posts/:postId", requireAuth(), async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      if (isNaN(postId)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }
      await storage.deletePodPost(postId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Conversations (Direct Messages & Group Chats)
  app.get("/api/conversations", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const conversations = await storage.getConversations(user.id);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/conversations/:id", requireAuth(), async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const { memberIds, name, isGroup } = req.body;
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: "At least one member is required" });
      }
      const conversation = await storage.createConversation(user.id, memberIds, name, isGroup);
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations/direct/:userId", requireAuth(), async (req, res) => {
    try {
      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const currentUser = await storage.getUserByClerkId(clerkUserId);
      if (!currentUser) {
        return res.status(401).json({ error: "User not found" });
      }
      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const conversation = await storage.getOrCreateDirectConversation(currentUser.id, targetUserId);
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth(), async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const messages = await storage.getChatMessages(conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth(), async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const parsed = insertChatMessageSchema.safeParse({ ...req.body, conversationId, userId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const message = await storage.createChatMessage(parsed.data);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods/:id/experiences", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) {
        return res.status(400).json({ error: "Invalid pod ID" });
      }
      const experiencesWithCreators = await storage.getPodExperiences(podId);
      res.json(experiencesWithCreators);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/experiences", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) {
        return res.status(400).json({ error: "Invalid pod ID" });
      }
      
      const { experienceId } = req.body;
      if (!experienceId || typeof experienceId !== 'number') {
        return res.status(400).json({ error: "Valid experience ID is required" });
      }
      
      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found. Please complete your profile." });
      }
      
      const isMember = await storage.isPodMember(podId, user.id);
      if (!isMember) {
        return res.status(403).json({ error: "You must be a member of this pod to add experiences" });
      }
      
      const alreadyAdded = await storage.isExperienceInPod(podId, experienceId);
      if (alreadyAdded) {
        return res.status(400).json({ error: "Experience already added to this pod" });
      }
      
      await storage.addExperienceToPod(podId, experienceId, user.id);
      res.status(201).json({ success: true });
    } catch (error: any) {
      console.error("Error adding experience to pod:", error);
      res.status(500).json({ error: "Failed to add experience to pod" });
    }
  });

  app.delete("/api/pods/:podId/experiences/:experienceId", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.podId);
      const experienceId = parseInt(req.params.experienceId);
      
      if (isNaN(podId) || isNaN(experienceId)) {
        return res.status(400).json({ error: "Invalid pod ID or experience ID" });
      }
      
      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found. Please complete your profile." });
      }
      
      const isMember = await storage.isPodMember(podId, user.id);
      if (!isMember) {
        return res.status(403).json({ error: "You must be a member of this pod to remove experiences" });
      }
      
      await storage.removeExperienceFromPod(podId, experienceId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error removing experience from pod:", error);
      res.status(500).json({ error: "Failed to remove experience from pod" });
    }
  });

  app.get("/api/users/:userId/connections", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const connections = await storage.getFamilyConnections(userId);
      res.json(connections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/connection-requests", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await storage.getPendingConnectionRequests(userId);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/connections/:id/accept", requireAuth(), async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      await storage.acceptConnection(connectionId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/connections/:id/decline", requireAuth(), async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      await storage.declineConnection(connectionId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/families/discover", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const families = await storage.getDiscoverableFamilies(user.id, lat, lng);
      res.json(families);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/experiences/nearby", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = req.query.radius ? parseFloat(req.query.radius as string) : 50;
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "lat and lng query parameters are required" });
      }
      
      const experiences = await storage.getExperiencesNearby(lat, lng, radius);
      res.json(experiences);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/families/swipe", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const parsed = insertFamilySwipeSchema.safeParse({ ...req.body, userId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const result = await storage.recordSwipe(parsed.data);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/matches", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const matches = await storage.getMatches(userId);
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/families/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const results = await storage.searchUsers(query);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/activities/feed", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activities = await storage.getActivityFeed(user.id, limit);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/activities/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activities = await storage.getActivitiesForUser(userId, limit);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/experiences/:id/comments", async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const expComments = await storage.getCommentsByExperience(experienceId);
      res.json(expComments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/experiences/:id/rating", async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const rating = await storage.getExperienceRating(experienceId);
      res.json(rating);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/experiences/:id/comments", requireAuth(), async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const parsed = insertCommentSchema.safeParse({ 
        ...req.body, 
        experienceId, 
        userId: user.id 
      });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const comment = await storage.createComment(parsed.data);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/comments/:id", requireAuth(), async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      await storage.deleteComment(commentId, user.id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/follow", requireAuth(), async (req, res) => {
    try {
      const followingId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      if (user.id === followingId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }
      const follow = await storage.followUser(user.id, followingId);
      res.status(201).json(follow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id/follow", requireAuth(), async (req, res) => {
    try {
      const followingId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      await storage.unfollowUser(user.id, followingId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/is-following", requireAuth(), async (req, res) => {
    try {
      const followingId = parseInt(req.params.id);
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const isFollowing = await storage.isFollowing(user.id, followingId);
      res.json({ isFollowing });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/followers", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/following", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/follow-counts", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const counts = await storage.getFollowCounts(userId);
      res.json(counts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/following/experiences", requireAuth(), async (req, res) => {
    try {
      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const experiences = await storage.getExperiencesFromFollowing(user.id);
      res.json(experiences);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/confirmed-trips", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const trips = await storage.getConfirmedTripsByUser(userId);
      res.json(trips);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods/:id/albums", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) {
        return res.status(400).json({ error: "Invalid pod ID" });
      }
      const albums = await storage.getPodAlbums(podId);
      res.json(albums);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/albums", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) {
        return res.status(400).json({ error: "Invalid pod ID" });
      }
      
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const isMember = await storage.isPodMember(podId, user.id);
      if (!isMember) {
        return res.status(403).json({ error: "You must be a pod member to create albums" });
      }
      
      const parsed = insertPodAlbumSchema.safeParse({ ...req.body, podId, createdByUserId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      
      const album = await storage.createPodAlbum(parsed.data);
      res.status(201).json(album);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/albums/:id", requireAuth(), async (req, res) => {
    try {
      const albumId = parseInt(req.params.id);
      if (isNaN(albumId)) {
        return res.status(400).json({ error: "Invalid album ID" });
      }
      
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const album = await storage.getPodAlbumById(albumId);
      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }
      
      if (album.createdByUserId !== user.id) {
        return res.status(403).json({ error: "Only the album creator can delete it" });
      }
      
      await storage.deletePodAlbum(albumId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/albums/:id/photos", async (req, res) => {
    try {
      const albumId = parseInt(req.params.id);
      if (isNaN(albumId)) {
        return res.status(400).json({ error: "Invalid album ID" });
      }
      const photos = await storage.getAlbumPhotos(albumId);
      res.json(photos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/albums/:id/photos", requireAuth(), async (req, res) => {
    try {
      const albumId = parseInt(req.params.id);
      if (isNaN(albumId)) {
        return res.status(400).json({ error: "Invalid album ID" });
      }
      
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const album = await storage.getPodAlbumById(albumId);
      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }
      
      const isMember = await storage.isPodMember(album.podId, user.id);
      if (!isMember) {
        return res.status(403).json({ error: "You must be a pod member to add photos" });
      }
      
      const parsed = insertAlbumPhotoSchema.safeParse({ ...req.body, albumId, uploadedByUserId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      
      const photo = await storage.addPhotoToAlbum(parsed.data);
      res.status(201).json(photo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/photos/:id", requireAuth(), async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      if (isNaN(photoId)) {
        return res.status(400).json({ error: "Invalid photo ID" });
      }
      
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      await storage.deleteAlbumPhoto(photoId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/badges", async (req, res) => {
    try {
      const allBadges = await storage.getAllBadges();
      res.json(allBadges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/badges", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const userBadges = await storage.getUserBadges(userId);
      res.json(userBadges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/check-badges", requireAuth(), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user || user.id !== userId) {
        return res.status(403).json({ error: "Can only check your own badges" });
      }
      
      const newBadges = await storage.checkAndAwardBadges(userId);
      res.json({ newBadges });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Experience check-ins
  app.post("/api/experiences/:id/checkins", requireAuth(), async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      if (isNaN(experienceId)) {
        return res.status(400).json({ error: "Invalid experience ID" });
      }

      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const alreadyCheckedIn = await storage.hasUserCheckedIn(user.id, experienceId);
      if (alreadyCheckedIn) {
        return res.status(400).json({ error: "You've already checked into this experience" });
      }

      const checkin = await storage.createExperienceCheckin({
        experienceId,
        userId: user.id,
        photoUrl: req.body.photoUrl || null,
        review: req.body.review || null,
        rating: req.body.rating || null,
      });

      res.json(checkin);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/experiences/:id/checkins", async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      if (isNaN(experienceId)) {
        return res.status(400).json({ error: "Invalid experience ID" });
      }
      const checkins = await storage.getCheckinsByExperience(experienceId);
      res.json(checkins);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/experiences/:id/checkin-count", async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      if (isNaN(experienceId)) {
        return res.status(400).json({ error: "Invalid experience ID" });
      }
      const count = await storage.getCheckinCount(experienceId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/checkins", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const checkins = await storage.getCheckinsByUser(userId);
      res.json(checkins);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/experiences/:id/has-checkedin", requireAuth(), async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      if (isNaN(experienceId)) {
        return res.status(400).json({ error: "Invalid experience ID" });
      }

      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const hasCheckedIn = await storage.hasUserCheckedIn(user.id, experienceId);
      res.json({ hasCheckedIn });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pods/:id/trips", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) {
        return res.status(400).json({ error: "Invalid pod ID" });
      }
      const trips = await storage.getTripsByPod(podId);
      res.json(trips);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trips", requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const { name, destination, startDate, endDate, podId } = req.body;
      if (!name || !destination || !startDate || !endDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const trip = await storage.createTrip({
        name,
        destination,
        startDate,
        endDate,
        podId: podId || null,
        createdByUserId: user.id,
        status: "draft",
      });
      res.status(201).json(trip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trips/:id/link-pod", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      const { podId } = req.body;
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }
      
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      if (trip.createdByUserId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const updatedTrip = await storage.updateTrip(tripId, { podId });
      res.json(updatedTrip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      
      // For confirmed trips, include locked booking options
      if (trip.status === "confirmed") {
        const itemsWithOptions = await Promise.all(
          trip.items.map(async (item) => {
            if (item.selectedOptionId) {
              const options = await storage.getTripItemOptions(item.id);
              const lockedOption = options.find(opt => opt.id === item.selectedOptionId);
              return { ...item, lockedOption: lockedOption || null };
            }
            return { ...item, lockedOption: null };
          })
        );
        
        // Calculate total estimated cost using numericPriceEstimate
        let totalCost = 0;
        itemsWithOptions.forEach(item => {
          if (item.lockedOption?.numericPriceEstimate) {
            totalCost += item.lockedOption.numericPriceEstimate;
          }
        });
        
        // Calculate service fee (15%)
        const serviceFee = Math.round(totalCost * 0.15);
        
        res.json({
          ...trip,
          items: itemsWithOptions,
          costSummary: {
            total: totalCost,
            serviceFee: serviceFee,
            grandTotal: totalCost + serviceFee,
            formatted: `$${totalCost}`,
            serviceFeeFormatted: `$${serviceFee}`,
            grandTotalFormatted: `$${totalCost + serviceFee}`
          }
        });
        return;
      }
      
      res.json(trip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/trips", requireAuth(), async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) {
        return res.status(400).json({ error: "Invalid pod ID" });
      }

      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const isMember = await storage.isPodMember(podId, user.id);
      if (!isMember) {
        return res.status(403).json({ error: "Not a member of this pod" });
      }

      const { name, destination, startDate, endDate } = req.body;
      if (!name || !destination || !startDate || !endDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const trip = await storage.createTrip({
        podId,
        name,
        destination,
        startDate,
        endDate,
        createdByUserId: user.id,
      });

      res.json(trip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/trips/:id", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }

      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const trip = await storage.updateTrip(tripId, req.body);
      res.json(trip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/trips/:id", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }

      await storage.deleteTrip(tripId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trips/:id/items", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }

      const { dayNumber, time, title, description, itemType, sortOrder, dayTitle, experienceId } = req.body;
      if (dayNumber === undefined || !time || !title || !itemType || sortOrder === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const item = await storage.createTripItem({
        tripId,
        dayNumber,
        dayTitle: dayTitle || null,
        time,
        title,
        description: description || null,
        itemType,
        sortOrder,
        experienceId: experienceId || null,
      });

      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/trip-items/:id", requireAuth(), async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.updateTripItem(itemId, req.body);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/trip-items/:id", requireAuth(), async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      await storage.deleteTripItem(itemId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trips/:id/items/bulk", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }

      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }

      const tripItems = items.map((item: any) => ({
        tripId,
        dayNumber: item.dayNumber,
        dayTitle: item.dayTitle || null,
        time: item.time,
        title: item.title,
        description: item.description || null,
        itemType: item.itemType,
        sortOrder: item.sortOrder,
        experienceId: item.experienceId || null,
      }));

      const createdItems = await storage.bulkCreateTripItems(tripItems);
      res.json(createdItems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/trips/:id/items", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }

      await storage.clearTripItems(tripId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trips/:id/destinations", async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }
      const destinations = await storage.getTripDestinations(tripId);
      res.json(destinations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trips/:id/destinations", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }
      const { destination, startDate, endDate, sortOrder } = req.body;
      if (!destination || !startDate || !endDate) {
        return res.status(400).json({ error: "Destination, start date, and end date are required" });
      }
      const dest = await storage.createTripDestination({
        tripId,
        destination,
        startDate,
        endDate,
        sortOrder: sortOrder ?? 0,
      });
      res.json(dest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/trips/:id/destinations/:destId", requireAuth(), async (req, res) => {
    try {
      const destId = parseInt(req.params.destId);
      if (isNaN(destId)) {
        return res.status(400).json({ error: "Invalid destination ID" });
      }
      const dest = await storage.updateTripDestination(destId, req.body);
      res.json(dest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/trips/:id/destinations/:destId", requireAuth(), async (req, res) => {
    try {
      const destId = parseInt(req.params.destId);
      if (isNaN(destId)) {
        return res.status(400).json({ error: "Invalid destination ID" });
      }
      await storage.deleteTripDestination(destId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/trips/:id/preferences", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }

      const { budgetMin, budgetMax, pace, kidsAgeGroups, tripInterests } = req.body;
      
      const updatedTrip = await storage.updateTrip(tripId, {
        budgetMin: budgetMin || null,
        budgetMax: budgetMax || null,
        pace: pace || null,
        kidsAgeGroups: kidsAgeGroups || null,
        tripInterests: tripInterests || null,
      });
      
      res.json(updatedTrip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trips/:id/reorder", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }

      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }

      for (const item of items) {
        await storage.updateTripItem(item.id, {
          dayNumber: item.dayNumber,
          sortOrder: item.sortOrder,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trips/:id/generate", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" });
      }

      const { userId: clerkUserId } = getAuth(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { budgetMin, budgetMax, pace, kidsAgeGroups, tripInterests } = req.body;
      
      if (budgetMin !== undefined || budgetMax !== undefined || pace || kidsAgeGroups || tripInterests) {
        await storage.updateTrip(tripId, {
          budgetMin: budgetMin || null,
          budgetMax: budgetMax || null,
          pace: pace || null,
          kidsAgeGroups: kidsAgeGroups || null,
          tripInterests: tripInterests || null,
        });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      let familyProfiles: { name: string; kids: string | null; interests: string[] }[] = [];
      let experiencesList: any[] = [];

      if (trip.podId) {
        // Trip is linked to a pod - use pod members' profiles
        const pod = await storage.getPodWithMembers(trip.podId);
        if (!pod) {
          return res.status(404).json({ error: "Pod not found" });
        }

        const podExperiences = await storage.getPodExperiences(trip.podId);
        
        familyProfiles = pod.members.map(m => ({
          name: m.name || "Family",
          kids: m.kids,
          interests: m.interests || [],
        }));

        experiencesList = podExperiences.map(e => ({
          id: e.id,
          title: e.title,
          category: e.category,
          duration: e.duration,
          cost: e.cost,
          ages: e.ages,
          description: e.description,
          locationName: e.locationName,
        }));
      } else {
        // Standalone trip - use trip creator's profile
        const user = await storage.getUserByClerkId(clerkUserId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        familyProfiles = [{
          name: user.name || "Your Family",
          kids: user.kids,
          interests: user.interests || [],
        }];

        // Optionally include creator's saved experiences
        const savedExperiences = await storage.getSavedExperiences(user.id);
        experiencesList = savedExperiences.slice(0, 5).map(e => ({
          id: e.id,
          title: e.title,
          category: e.category,
          duration: e.duration,
          cost: e.cost,
          ages: e.ages,
          description: e.description,
          locationName: e.locationName,
        }));
      }

      // Fetch trip destinations for multi-destination trips
      const tripDestinations = await storage.getTripDestinations(tripId);

      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const budgetSection = (trip.budgetMin || trip.budgetMax) 
        ? `Budget: ${trip.budgetMin ? `$${trip.budgetMin}` : 'flexible'} - ${trip.budgetMax ? `$${trip.budgetMax}` : 'flexible'} total for the trip`
        : '';
      
      const paceSection = trip.pace 
        ? `Pace preference: ${trip.pace} (${trip.pace === 'relaxed' ? 'fewer activities, more downtime' : trip.pace === 'moderate' ? 'balanced mix of activities and rest' : 'action-packed with many activities'})`
        : '';
      
      const kidsSection = trip.kidsAgeGroups?.length 
        ? `Children's age groups to plan for: ${trip.kidsAgeGroups.join(', ')}`
        : '';
      
      const interestsSection = trip.tripInterests?.length 
        ? `Trip interests/themes to prioritize: ${trip.tripInterests.join(', ')}`
        : '';
      
      // Build destinations section for multi-destination trips
      const destinationsSection = tripDestinations.length > 0
        ? `DESTINATIONS (plan activities for each destination on the specified dates):\n${tripDestinations.map((d, i) => 
            `${i + 1}. ${d.destination} (${d.startDate} to ${d.endDate})`
          ).join('\n')}`
        : '';
      
      // Determine destination text for the prompt
      const destinationText = tripDestinations.length > 0
        ? tripDestinations.map(d => d.destination).join(', then ')
        : trip.destination;

      const preferencesBlock = [budgetSection, paceSection, kidsSection, interestsSection, destinationsSection]
        .filter(Boolean)
        .join('\n');

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const prompt = `You are a family trip planner AI. Create a detailed ${numDays}-day itinerary for a family trip to ${destinationText} from ${trip.startDate} to ${trip.endDate}.

${preferencesBlock ? `TRIP PREFERENCES (prioritize these):\n${preferencesBlock}\n` : ''}
Family profiles in this trip:
${JSON.stringify(familyProfiles, null, 2)}

${experiencesList.length > 0 ? `Saved experiences to consider including:
${JSON.stringify(experiencesList, null, 2)}` : ''}

Generate a structured JSON response with:
1. "summary": A 2-3 sentence personalized overview explaining how the itinerary caters to the specified preferences, interests, and children's ages
2. "days": An array of day objects, each containing:
   - "dayNumber": The day number (1, 2, 3, etc.)
   - "dayTitle": A catchy thematic title for that day (e.g., "Tropical Arrival and Beach Exploration")
   - "items": Array of activities for that day, each with:
     - "time": Time in format "HH:MM AM/PM" (e.g., "09:00 AM")
     - "title": Short activity title
     - "description": 1-2 sentence description mentioning which family interests it serves
     - "itemType": One of: "ACTIVITY", "MEAL", "STAY", "TRANSPORT"
     - "sortOrder": Number for ordering (0, 1, 2, etc.)
     ${experiencesList.length > 0 ? '- "experienceId": If this activity matches a saved experience, include its ID' : ''}

Guidelines:
- Include 4-6 activities per day (fewer if pace is "relaxed", more if pace is "active")
- Balance activities with rest time (especially for younger children)
- Include meals at appropriate times
- PRIORITIZE activities matching the specified trip interests
- Make activities age-appropriate for the specified children's age groups
- Keep activity costs within the specified budget range
- Include a mix of activity types
- Start each day with morning activities and end with evening/downtime
${tripDestinations.length > 0 ? `- IMPORTANT: Plan activities in the CORRECT destination based on the dates specified. Each day's activities should be in the destination the family is visiting on that date. Include a "location" field in each item with the destination name.` : ''}

Return ONLY valid JSON, no markdown or explanations.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful family trip planning assistant. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to generate itinerary" });
      }

      let parsed;
      try {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanContent);
      } catch (e) {
        console.error("Failed to parse AI response:", content);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      await storage.clearTripItems(tripId);

      const allItems: any[] = [];
      for (const day of parsed.days) {
        for (const item of day.items) {
          allItems.push({
            tripId,
            dayNumber: day.dayNumber,
            dayTitle: day.dayTitle,
            time: item.time,
            title: item.title,
            description: item.description,
            itemType: item.itemType,
            sortOrder: item.sortOrder,
            experienceId: item.experienceId || null,
          });
        }
      }

      const createdItems = await storage.bulkCreateTripItems(allItems);

      await storage.updateTrip(tripId, { aiSummary: parsed.summary });

      const updatedTrip = await storage.getTripById(tripId);
      res.json(updatedTrip);
    } catch (error: any) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trips/:id/regenerate-day/:dayNumber", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      const dayNumber = parseInt(req.params.dayNumber);
      
      if (isNaN(tripId) || isNaN(dayNumber)) {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Build family profiles from pod members if linked, otherwise use trip creator
      let familyProfiles: Array<{ name: string | null; kids: string | null; interests: string[] }> = [];
      
      if (trip.podId) {
        const pod = await storage.getPodWithMembers(trip.podId);
        if (!pod) {
          return res.status(404).json({ error: "Pod not found" });
        }
        familyProfiles = pod.members.map(m => ({
          name: m.name,
          kids: m.kids,
          interests: m.interests || [],
        }));
      } else {
        // Standalone trip - use the trip creator's profile
        const creator = await storage.getUser(trip.createdByUserId);
        if (creator) {
          familyProfiles = [{
            name: creator.name,
            kids: creator.kids,
            interests: creator.interests || [],
          }];
        }
      }

      const currentDayItems = trip.items.filter(i => i.dayNumber === dayNumber);
      const currentDayTitle = currentDayItems[0]?.dayTitle || `Day ${dayNumber}`;

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const prompt = `Regenerate Day ${dayNumber} of a family trip to ${trip.destination}.

Family profiles:
${JSON.stringify(familyProfiles, null, 2)}

Current day title: "${currentDayTitle}"

Generate a fresh set of activities for this day. Return JSON with:
- "dayTitle": A new catchy thematic title
- "items": Array of 4-6 activities with:
  - "time": Time in "HH:MM AM/PM" format
  - "title": Activity title
  - "description": 1-2 sentence description
  - "itemType": One of: "ACTIVITY", "MEAL", "STAY", "TRANSPORT"
  - "sortOrder": Number for ordering

Make it different from typical tourist activities - suggest unique local experiences.
Return ONLY valid JSON.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a creative family trip planner. Respond with JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to regenerate day" });
      }

      let parsed;
      try {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanContent);
      } catch (e) {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      for (const item of currentDayItems) {
        await storage.deleteTripItem(item.id);
      }

      const newItems = parsed.items.map((item: any) => ({
        tripId,
        dayNumber,
        dayTitle: parsed.dayTitle,
        time: item.time,
        title: item.title,
        description: item.description,
        itemType: item.itemType,
        sortOrder: item.sortOrder,
        experienceId: null,
      }));

      await storage.bulkCreateTripItems(newItems);

      const updatedTrip = await storage.getTripById(tripId);
      res.json(updatedTrip);
    } catch (error: any) {
      console.error("Day regeneration error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ TRIP CONFIRMATION WIZARD ROUTES ============
  
  // Start confirmation wizard for a trip
  app.post("/api/trips/:id/confirm/start", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      const { userId: clerkUserId } = getAuth(req);
      
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const userId = user.id;

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Authorization check: either pod member or trip creator
      if (trip.podId) {
        const isMember = await storage.isPodMember(trip.podId, userId);
        if (!isMember) {
          return res.status(403).json({ error: "You don't have access to this trip" });
        }
      } else if (trip.createdByUserId !== userId) {
        return res.status(403).json({ error: "You don't have access to this trip" });
      }

      // Check if trip is in draft status
      if (trip.status !== "draft") {
        return res.status(400).json({ error: "Trip is already being confirmed or is confirmed" });
      }

      // Update trip status to confirming
      await storage.updateTripStatus(tripId, "confirming");

      // Create or get confirmation session
      let session = await storage.getConfirmationSession(tripId);
      if (!session) {
        session = await storage.createConfirmationSession({
          tripId,
          currentItemIndex: 0,
          requestedByUserId: userId,
        });
      }

      // Get confirmable items
      const items = await storage.getConfirmableItems(tripId);
      
      // Get options for current item if available
      const currentItem = items.length > 0 ? items[session.currentItemIndex] || null : null;
      let currentOptions: any[] = [];
      if (currentItem) {
        currentOptions = await storage.getTripItemOptions(currentItem.id) || [];
      }

      // Calculate safe progress (guard against division by zero)
      const totalItems = items.length;
      const currentIndex = session.currentItemIndex;
      const progress = {
        current: totalItems > 0 ? currentIndex + 1 : 0,
        total: totalItems,
        percentage: totalItems > 0 ? Math.round((currentIndex / totalItems) * 100) : 0,
      };

      res.json({
        session,
        items,
        currentItem,
        currentOptions,
        trip: { ...trip, status: "confirming" },
        totalItems,
        progress,
      });
    } catch (error: any) {
      console.error("Start confirmation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get confirmation session state
  app.get("/api/trips/:id/confirm/session", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      const { userId: clerkUserId } = getAuth(req);
      
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Authorization check: either pod member or trip creator
      if (trip.podId) {
        const isMember = await storage.isPodMember(trip.podId, user.id);
        if (!isMember) {
          return res.status(403).json({ error: "You don't have access to this trip" });
        }
      } else if (trip.createdByUserId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this trip" });
      }

      const session = await storage.getConfirmationSession(tripId);
      if (!session) {
        return res.status(404).json({ error: "No active confirmation session" });
      }

      const items = await storage.getConfirmableItems(tripId);
      
      // Get options for current item if available
      const currentItem = items.length > 0 ? items[session.currentItemIndex] || null : null;
      let currentOptions: any[] = [];
      if (currentItem) {
        currentOptions = await storage.getTripItemOptions(currentItem.id) || [];
      }

      // Calculate safe progress (guard against division by zero)
      const totalItems = items.length;
      const currentIndex = session.currentItemIndex;
      const progress = {
        current: totalItems > 0 ? currentIndex + 1 : 0,
        total: totalItems,
        percentage: totalItems > 0 ? Math.round((currentIndex / totalItems) * 100) : 0,
      };

      res.json({
        session,
        items,
        currentItem,
        currentOptions,
        trip,
        totalItems,
        progress,
      });
    } catch (error: any) {
      console.error("Get session error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate/regenerate options for a trip item
  app.post("/api/trips/:tripId/items/:itemId/options/generate", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const itemId = parseInt(req.params.itemId);
      const { userId: clerkUserId } = getAuth(req);
      
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Authorization check: either pod member or trip creator
      if (trip.podId) {
        const isMember = await storage.isPodMember(trip.podId, user.id);
        if (!isMember) {
          return res.status(403).json({ error: "You don't have access to this trip" });
        }
      } else if (trip.createdByUserId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this trip" });
      }

      const item = trip.items.find(i => i.id === itemId);
      if (!item) {
        return res.status(404).json({ error: "Trip item not found" });
      }

      // Import the booking search service dynamically
      const { generateAndSaveOptions } = await import("./bookingSearchService");
      
      const result = await generateAndSaveOptions(item, trip.destination, {
        startDate: trip.startDate,
        endDate: trip.endDate,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Generate options error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Lock an option for a trip item
  app.post("/api/trips/:tripId/items/:itemId/options/:optionId/lock", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const itemId = parseInt(req.params.itemId);
      const optionId = parseInt(req.params.optionId);
      const { userId: clerkUserId } = getAuth(req);
      
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Authorization check: either pod member or trip creator
      if (trip.podId) {
        const isMember = await storage.isPodMember(trip.podId, user.id);
        if (!isMember) {
          return res.status(403).json({ error: "You don't have access to this trip" });
        }
      } else if (trip.createdByUserId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this trip" });
      }

      // Lock the option
      const lockedOption = await storage.lockTripItemOption(optionId);
      
      // Update the trip item confirmation state
      await storage.updateTripItemConfirmation(itemId, "locked", optionId);

      // Advance to next item (always advance, even past last item to trigger completion)
      const session = await storage.getConfirmationSession(tripId);
      if (session) {
        const nextIndex = session.currentItemIndex + 1;
        await storage.updateConfirmationSession(session.id, {
          currentItemIndex: nextIndex,
        });
      }

      res.json({ 
        success: true, 
        lockedOption,
        message: "Option locked successfully"
      });
    } catch (error: any) {
      console.error("Lock option error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Skip an item (mark as not confirmable)
  app.post("/api/trips/:tripId/items/:itemId/skip", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const itemId = parseInt(req.params.itemId);
      const { userId: clerkUserId } = getAuth(req);
      
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Authorization check: either pod member or trip creator
      if (trip.podId) {
        const isMember = await storage.isPodMember(trip.podId, user.id);
        if (!isMember) {
          return res.status(403).json({ error: "You don't have access to this trip" });
        }
      } else if (trip.createdByUserId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this trip" });
      }

      // Update the trip item confirmation state to skipped
      await storage.updateTripItemConfirmation(itemId, "skipped");

      // Advance to next item
      const session = await storage.getConfirmationSession(tripId);
      if (session) {
        const items = await storage.getConfirmableItems(tripId);
        const nextIndex = session.currentItemIndex + 1;
        
        if (nextIndex < items.length) {
          await storage.updateConfirmationSession(session.id, {
            currentItemIndex: nextIndex,
          });
        }
      }

      res.json({ success: true, message: "Item skipped" });
    } catch (error: any) {
      console.error("Skip item error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Complete the confirmation process
  app.post("/api/trips/:id/confirm/complete", requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      const { userId: clerkUserId } = getAuth(req);
      
      if (!clerkUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserByClerkId(clerkUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Authorization check: either pod member or trip creator
      if (trip.podId) {
        const isMember = await storage.isPodMember(trip.podId, user.id);
        if (!isMember) {
          return res.status(403).json({ error: "You don't have access to this trip" });
        }
      } else if (trip.createdByUserId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this trip" });
      }

      // Update trip status to confirmed
      const updatedTrip = await storage.updateTripStatus(tripId, "confirmed");

      // Mark session as completed
      const session = await storage.getConfirmationSession(tripId);
      if (session) {
        await storage.updateConfirmationSession(session.id, {
          completedAt: new Date(),
        });
      }

      res.json({ 
        success: true, 
        trip: updatedTrip,
        message: "Trip confirmed successfully!" 
      });
    } catch (error: any) {
      console.error("Complete confirmation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ BOOKING ROUTES ============
  
  // Get all booking options (or by trip item)
  app.get('/api/booking-options', async (req, res) => {
    try {
      const tripItemId = req.query.tripItemId ? parseInt(req.query.tripItemId as string) : undefined;
      const options = await storage.getBookingOptions(tripItemId);
      res.json(options);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single booking option
  app.get('/api/booking-options/:id', async (req, res) => {
    try {
      const option = await storage.getBookingOptionById(parseInt(req.params.id));
      if (!option) {
        return res.status(404).json({ error: "Booking option not found" });
      }
      res.json(option);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create booking option (admin)
  app.post('/api/booking-options', requireAuth(), async (req, res) => {
    try {
      const result = insertBookingOptionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromError(result.error).toString() });
      }
      const option = await storage.createBookingOption(result.data);
      res.json(option);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update booking option
  app.patch('/api/booking-options/:id', requireAuth(), async (req, res) => {
    try {
      const option = await storage.updateBookingOption(parseInt(req.params.id), req.body);
      res.json(option);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete booking option
  app.delete('/api/booking-options/:id', requireAuth(), async (req, res) => {
    try {
      await storage.deleteBookingOption(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's cart
  app.get('/api/cart', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const cart = await storage.getCartByUser(user.id);
      res.json(cart || { items: [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add to cart
  app.post('/api/cart/items', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { bookingOptionId, quantity, guestCount, selectedDate, podTripId } = req.body;
      
      const bookingOption = await storage.getBookingOptionById(bookingOptionId);
      if (!bookingOption) {
        return res.status(404).json({ error: "Booking option not found" });
      }

      const cart = await storage.getOrCreateCart(user.id, podTripId);
      
      const cartItem = await storage.addToCart({
        cartId: cart.id,
        bookingOptionId,
        quantity: quantity || 1,
        guestCount: guestCount || 1,
        selectedDate,
        priceSnapshot: bookingOption.priceInCents,
      });

      res.json(cartItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update cart item
  app.patch('/api/cart/items/:id', requireAuth(), async (req, res) => {
    try {
      const item = await storage.updateCartItem(parseInt(req.params.id), req.body);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove from cart
  app.delete('/api/cart/items/:id', requireAuth(), async (req, res) => {
    try {
      await storage.removeFromCart(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create checkout session
  app.post('/api/checkout', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const cart = await storage.getCartByUser(user.id);
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const lineItems = cart.items.map(item => ({
        price_data: {
          currency: item.bookingOption.currency,
          product_data: {
            name: item.bookingOption.name,
            description: item.bookingOption.description || undefined,
            images: item.bookingOption.image ? [item.bookingOption.image] : undefined,
          },
          unit_amount: item.priceSnapshot,
        },
        quantity: item.quantity * item.guestCount,
      }));

      const totalInCents = cart.items.reduce((sum, item) => 
        sum + (item.priceSnapshot * item.quantity * item.guestCount), 0);

      const order = await storage.createOrder({
        userId: user.id,
        cartId: cart.id,
        podTripId: cart.podTripId,
        totalInCents,
        currency: 'usd',
        status: 'pending',
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/checkout/success?order=${order.id}`,
        cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
        metadata: {
          orderId: order.id.toString(),
          userId: user.id.toString(),
        },
      });

      await storage.updateOrder(order.id, { stripeCheckoutSessionId: session.id });

      res.json({ url: session.url, orderId: order.id });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's orders
  app.get('/api/orders', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const orders = await storage.getOrdersByUser(user.id);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single order
  app.get('/api/orders/:id', requireAuth(), async (req, res) => {
    try {
      const order = await storage.getOrderById(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get orders for a pod trip
  app.get('/api/pods/:podId/trips/:tripId/orders', requireAuth(), async (req, res) => {
    try {
      const orders = await storage.getOrdersByPodTrip(parseInt(req.params.tripId));
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complete order (called after successful Stripe payment)
  app.post('/api/orders/:id/complete', requireAuth(), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const cart = await storage.getCartByUser(order.userId);
      if (cart) {
        const orderItemsData = cart.items.map(item => ({
          orderId,
          bookingOptionId: item.bookingOptionId,
          quantity: item.quantity,
          guestCount: item.guestCount,
          selectedDate: item.selectedDate,
          priceInCents: item.priceSnapshot,
          status: 'confirmed' as const,
          confirmationCode: `CONF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        }));

        await storage.createOrderItems(orderItemsData);
        await storage.clearCart(cart.id);
      }

      const updatedOrder = await storage.updateOrder(orderId, {
        status: 'completed',
        completedAt: new Date(),
      });

      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe publishable key endpoint
  app.get('/api/stripe/config', async (req, res) => {
    try {
      const { getStripePublishableKey } = await import('./stripeClient');
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CONCIERGE BOOKING ROUTES ====================

  // Create concierge checkout session for a confirmed trip
  app.post('/api/concierge/checkout', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { tripId, customerNotes } = req.body;
      if (!tripId) {
        return res.status(400).json({ error: "Trip ID is required" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Check if already has concierge request
      const existingRequest = await storage.getConciergeRequestByTrip(tripId);
      if (existingRequest) {
        return res.status(400).json({ error: "Concierge request already exists for this trip" });
      }

      // Get confirmed items with their selected options
      const confirmableItems = await storage.getConfirmableItems(tripId);
      const lockedItems = confirmableItems.filter(item => item.confirmationState === 'locked' && item.selectedOptionId);

      if (lockedItems.length === 0) {
        return res.status(400).json({ error: "No items to book. Please confirm trip items first." });
      }

      // Calculate estimated total from locked options
      let totalEstimatedCents = 0;
      for (const item of lockedItems) {
        if (item.selectedOptionId) {
          const options = await storage.getTripItemOptions(item.id);
          const selectedOption = options.find(o => o.id === item.selectedOptionId);
          if (selectedOption?.priceEstimate) {
            // Parse price estimate (e.g., "$150.50" -> 15050 cents, "$1,250" -> 125000 cents)
            const priceMatch = selectedOption.priceEstimate.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
              const priceStr = priceMatch[0].replace(/,/g, '');
              const priceDollars = parseFloat(priceStr);
              if (!isNaN(priceDollars)) {
                totalEstimatedCents += Math.round(priceDollars * 100);
              }
            }
          }
        }
      }

      // Minimum $50 booking if we couldn't parse any valid prices
      if (totalEstimatedCents === 0) {
        totalEstimatedCents = 5000;
      }

      // Calculate service fee (15%)
      const serviceFeePercent = 15;
      const serviceFeeCents = Math.round(totalEstimatedCents * serviceFeePercent / 100);
      const totalPaidCents = totalEstimatedCents + serviceFeeCents;

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Trip Booking: ${trip.name}`,
                description: `Concierge booking service for ${lockedItems.length} items`,
              },
              unit_amount: totalEstimatedCents,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Concierge Service Fee',
                description: `${serviceFeePercent}% service fee for personal booking concierge`,
              },
              unit_amount: serviceFeeCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/concierge/success?tripId=${tripId}`,
        cancel_url: `${req.protocol}://${req.get('host')}/pods/${trip.podId}/trips/${tripId}`,
        metadata: {
          tripId: tripId.toString(),
          userId: user.id.toString(),
          type: 'concierge',
        },
      });

      // Create concierge request
      const conciergeRequest = await storage.createConciergeRequest({
        tripId,
        userId: user.id,
        status: 'pending_payment',
        totalEstimatedCents,
        serviceFeePercent,
        serviceFeeCents,
        totalPaidCents,
        stripeCheckoutSessionId: session.id,
        customerNotes: customerNotes || null,
      });

      // Create concierge request items for each locked item
      const requestItems = lockedItems.map(item => ({
        conciergeRequestId: conciergeRequest.id,
        tripItemId: item.id,
        selectedOptionId: item.selectedOptionId,
        status: 'pending' as const,
        estimatedPriceCents: null,
      }));

      await storage.createConciergeRequestItems(requestItems);

      res.json({ url: session.url, requestId: conciergeRequest.id });
    } catch (error: any) {
      console.error("Concierge checkout error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Complete concierge request after payment
  app.post('/api/concierge/requests/:id/complete-payment', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const requestId = parseInt(req.params.id);
      const request = await storage.getConciergeRequestById(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Verify the user owns this request
      if (request.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to access this request" });
      }

      // Already completed, return current state (idempotent)
      if (request.status !== 'pending_payment') {
        return res.json(request);
      }

      const updatedRequest = await storage.updateConciergeRequest(requestId, {
        status: 'pending',
      });

      // Update trip status
      await storage.updateTripStatus(request.tripId, 'booking_in_progress');

      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's concierge requests
  app.get('/api/concierge/requests', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const requests = await storage.getConciergeRequestsByUser(user.id);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single concierge request
  app.get('/api/concierge/requests/:id', requireAuth(), async (req, res) => {
    try {
      const request = await storage.getConciergeRequestById(parseInt(req.params.id));
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get concierge request by trip
  app.get('/api/trips/:tripId/concierge', requireAuth(), async (req, res) => {
    try {
      const request = await storage.getConciergeRequestByTrip(parseInt(req.params.tripId));
      res.json(request || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get concierge request items
  app.get('/api/concierge/requests/:id/items', requireAuth(), async (req, res) => {
    try {
      const items = await storage.getConciergeRequestItems(parseInt(req.params.id));
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CONCIERGE BOOKING SESSION ROUTES ====================

  // Create or get concierge booking session
  app.post('/api/concierge/session', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { tripId } = req.body;
      if (!tripId) {
        return res.status(400).json({ error: "tripId is required" });
      }

      // Check if session already exists
      let session = await storage.getConciergeBookingSession(tripId, user.id);
      if (!session) {
        session = await storage.createConciergeBookingSession({
          tripId,
          userId: user.id,
          currentStep: 'flights',
        });
      }

      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get concierge booking session
  app.get('/api/concierge/session/:tripId', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const session = await storage.getConciergeBookingSession(parseInt(req.params.tripId), user.id);
      res.json(session || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update concierge booking session
  app.patch('/api/concierge/session/:tripId', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const session = await storage.getConciergeBookingSession(parseInt(req.params.tripId), user.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const updateData: any = {};
      if (req.body.currentStep !== undefined) updateData.currentStep = req.body.currentStep;
      if (req.body.flightsSkipped !== undefined) updateData.flightsSkipped = req.body.flightsSkipped;
      if (req.body.flightPreferences !== undefined) updateData.flightPreferences = req.body.flightPreferences;
      if (req.body.selectedRestaurantIds !== undefined) updateData.selectedRestaurantIds = req.body.selectedRestaurantIds;
      if (req.body.selectedExcursionIds !== undefined) updateData.selectedExcursionIds = req.body.selectedExcursionIds;
      if (req.body.aiChatComplete !== undefined) updateData.aiChatComplete = req.body.aiChatComplete;
      if (req.body.calendarExported !== undefined) updateData.calendarExported = req.body.calendarExported;
      if (req.body.currentStep === 'complete') updateData.completedAt = new Date();

      const updatedSession = await storage.updateConciergeBookingSession(session.id, updateData);
      res.json(updatedSession);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Categorize trip items for concierge flow
  app.get('/api/concierge/categorize/:tripId', requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      const items = await storage.getTripItems(tripId);
      
      const restaurants = items.filter(item => 
        item.itemType === 'MEAL' || 
        item.itemType === 'RESTAURANT' ||
        item.itemType === 'DINING'
      );
      
      const excursions = items.filter(item => 
        item.itemType === 'ACTIVITY' || 
        item.itemType === 'EXCURSION' ||
        item.itemType === 'TOUR' ||
        item.itemType === 'ATTRACTION'
      );

      // Generate flight info from trip dates
      const flights = [{
        origin: 'Your City',
        destination: trip.destination,
        date: trip.startDate,
      }];

      res.json({ restaurants, excursions, flights });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Concierge Chat
  app.post('/api/concierge/chat/:tripId', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const tripId = parseInt(req.params.tripId);
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      const session = await storage.getConciergeBookingSession(tripId, user.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Save user message
      await storage.createConciergeChatMessage({
        sessionId: session.id,
        role: 'user',
        content: message,
      });

      // Get trip items for context
      const items = await storage.getTripItems(tripId);

      // Generate AI response using Replit AI Integrations
      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });
      
      const systemPrompt = `You are a friendly travel concierge helping a family plan their trip to ${trip.destination} (${trip.startDate} to ${trip.endDate}).

IMPORTANT RULES:
- Keep responses SHORT (2-3 sentences max per suggestion)
- Give only 1-2 suggestions at a time, not a long list
- Use simple formatting, no markdown headers or bullet points
- Be conversational and warm

Their itinerary has ${items.length} activities planned across multiple days.`;

      // Get previous messages for context
      const previousMessages = await storage.getConciergeChatMessages(session.id);
      
      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...previousMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";

      // Save AI response
      await storage.createConciergeChatMessage({
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse,
      });

      // Get all messages for response
      const allMessages = await storage.getConciergeChatMessages(session.id);
      res.json({ messages: allMessages });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get chat history for a trip
  app.get('/api/concierge/chat-history/:tripId', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const tripId = parseInt(req.params.tripId);
      const session = await storage.getConciergeBookingSession(tripId, user.id);
      
      if (!session) {
        return res.json({ messages: [] });
      }

      const messages = await storage.getConciergeChatMessages(session.id);
      res.json({ messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export calendar (generate ICS file or Google Calendar link)
  app.post('/api/concierge/calendar/:tripId', requireAuth(), async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      const items = await storage.getTripItems(tripId);
      
      // Generate ICS content
      const icsEvents = items.map(item => {
        const startDate = new Date(trip.startDate);
        startDate.setDate(startDate.getDate() + item.dayNumber - 1);
        
        // Parse time (e.g., "09:00 AM")
        const timeParts = item.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const meridiem = timeParts[3]?.toUpperCase();
          
          if (meridiem === 'PM' && hours !== 12) hours += 12;
          if (meridiem === 'AM' && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
        }

        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2); // Default 2 hour duration

        const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        return `BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${item.title}
DESCRIPTION:${item.description || ''}
LOCATION:${trip.destination}
END:VEVENT`;
      });

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Podstack//Trip Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${trip.name}
${icsEvents.join('\n')}
END:VCALENDAR`;

      // For now, return the ICS content as a data URL
      const base64Content = Buffer.from(icsContent).toString('base64');
      const dataUrl = `data:text/calendar;base64,${base64Content}`;

      res.json({ 
        url: dataUrl,
        filename: `${trip.name.replace(/\s+/g, '_')}_itinerary.ics`,
        message: "Calendar file ready for download"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== AGENT ROUTES ====================

  // Check if user is an agent
  app.get('/api/agent/status', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ isAgent: user.isAgent || false });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending requests for agents
  app.get('/api/agent/requests/pending', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      const requests = await storage.getPendingConciergeRequests();
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get agent's assigned requests
  app.get('/api/agent/requests/assigned', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      const requests = await storage.getAgentConciergeRequests(user.id);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Claim a request (agent assigns themselves)
  app.post('/api/agent/requests/:id/claim', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      const requestId = parseInt(req.params.id);
      const request = await storage.getConciergeRequestById(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.assignedAgentId && request.assignedAgentId !== user.id) {
        return res.status(400).json({ error: "Request already claimed by another agent" });
      }

      const updatedRequest = await storage.updateConciergeRequest(requestId, {
        assignedAgentId: user.id,
        status: 'in_progress',
      });

      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update request item (agent marks as booked, adds confirmation, etc.)
  app.patch('/api/agent/requests/:requestId/items/:itemId', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      const { status, confirmationCode, bookingReference, providerName, actualPriceCents, agentNotes } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (confirmationCode) updateData.confirmationCode = confirmationCode;
      if (bookingReference) updateData.bookingReference = bookingReference;
      if (providerName) updateData.providerName = providerName;
      if (actualPriceCents !== undefined) updateData.actualPriceCents = actualPriceCents;
      if (agentNotes) updateData.agentNotes = agentNotes;
      if (status === 'booked') updateData.bookedAt = new Date();

      const item = await storage.updateConciergeRequestItem(parseInt(req.params.itemId), updateData);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add agent notes to request
  app.patch('/api/agent/requests/:id/notes', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      const { agentNotes } = req.body;
      const request = await storage.updateConciergeRequest(parseInt(req.params.id), { agentNotes });
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complete request (all items booked)
  app.post('/api/agent/requests/:id/complete', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      const requestId = parseInt(req.params.id);
      const request = await storage.getConciergeRequestById(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Verify all items are booked
      const items = await storage.getConciergeRequestItems(requestId);
      const unbookedItems = items.filter(item => item.status !== 'booked' && item.status !== 'skipped');
      
      if (unbookedItems.length > 0) {
        return res.status(400).json({ 
          error: `${unbookedItems.length} items still pending. Complete all items before marking request as complete.` 
        });
      }

      const updatedRequest = await storage.updateConciergeRequest(requestId, {
        status: 'completed',
        completedAt: new Date(),
      });

      // Update trip status
      await storage.updateTripStatus(request.tripId, 'booked');

      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get manual booking items that require agent intervention (items with status 'pending' that need manual booking)
  app.get('/api/agent/manual-bookings', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      // Get all concierge request items that are pending
      const bookings = await db.select()
        .from(conciergeRequestItems)
        .innerJoin(conciergeRequests, eq(conciergeRequestItems.conciergeRequestId, conciergeRequests.id))
        .innerJoin(tripItems, eq(conciergeRequestItems.tripItemId, tripItems.id))
        .where(eq(conciergeRequestItems.status, 'pending'))
        .orderBy(desc(conciergeRequestItems.createdAt));

      const enrichedBookings = await Promise.all(bookings.map(async (b) => {
        const request = b.concierge_requests;
        const tripItem = b.trip_items;
        const trip = await storage.getTripById(request.tripId);
        const bookingUser = await storage.getUser(request.userId);
        
        // Determine if requires manual booking based on item type
        const requiresManualBooking = tripItem.itemType === 'MEAL' || tripItem.itemType === 'ACTIVITY';
        
        return {
          id: b.concierge_request_items.id,
          tripItemId: tripItem.id,
          sessionId: request.id,
          itemType: tripItem.itemType || 'ACTIVITY',
          itemName: tripItem.title,
          requiresManualBooking,
          openTableAvailable: false,
          bookingUrl: null,
          bookingNotes: b.concierge_request_items.agentNotes,
          status: b.concierge_request_items.status,
          tripItem: {
            id: tripItem.id,
            title: tripItem.title,
            description: tripItem.description,
            time: tripItem.time,
          },
          session: {
            tripId: request.tripId,
            userId: request.userId,
            trip: trip ? { name: trip.name, destination: trip.destination } : undefined,
            user: bookingUser ? { name: bookingUser.name, email: bookingUser.email } : undefined,
          },
        };
      }));

      res.json(enrichedBookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update manual booking status
  app.patch('/api/agent/manual-bookings/:id', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      const { status, bookingNotes, confirmationNumber } = req.body;
      
      const updateData: any = { status };
      if (bookingNotes) updateData.agentNotes = bookingNotes;
      if (confirmationNumber) updateData.confirmationCode = confirmationNumber;
      if (status === 'completed') updateData.bookedAt = new Date();

      const [updated] = await db.update(conciergeRequestItems)
        .set(updateData)
        .where(eq(conciergeRequestItems.id, parseInt(req.params.id)))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get AI chat conversations for agent review
  app.get('/api/agent/chat-conversations', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      // Get all sessions that have chat messages
      const sessions = await db.select()
        .from(conciergeBookingSessions)
        .innerJoin(conciergeChatMessages, eq(conciergeBookingSessions.id, conciergeChatMessages.sessionId));

      // Group by session and count messages
      const sessionMap = new Map<number, {
        sessionId: number;
        tripId: number;
        userId: number;
        messageCount: number;
        lastMessageAt: Date;
        aiSuggestionsCount: number;
      }>();

      for (const row of sessions) {
        const session = row.concierge_booking_sessions;
        const message = row.concierge_chat_messages;
        
        if (!sessionMap.has(session.id)) {
          sessionMap.set(session.id, {
            sessionId: session.id,
            tripId: session.tripId,
            userId: session.userId,
            messageCount: 0,
            lastMessageAt: message.createdAt,
            aiSuggestionsCount: 0,
          });
        }
        
        const entry = sessionMap.get(session.id)!;
        entry.messageCount++;
        if (message.role === 'assistant') {
          entry.aiSuggestionsCount++;
        }
        if (message.createdAt > entry.lastMessageAt) {
          entry.lastMessageAt = message.createdAt;
        }
      }

      // Enrich with trip and user info
      const conversations = await Promise.all(
        Array.from(sessionMap.values()).map(async (entry) => {
          const trip = await storage.getTripById(entry.tripId);
          const chatUser = await storage.getUser(entry.userId);
          return {
            ...entry,
            tripName: trip?.name || 'Unknown Trip',
            userName: chatUser?.name || null,
            lastMessageAt: entry.lastMessageAt.toISOString(),
          };
        })
      );

      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get chat messages for a specific session (agent view)
  app.get('/api/agent/chat/:sessionId', requireAuth(), async (req, res) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAgent) {
        return res.status(403).json({ error: "Not authorized as agent" });
      }

      const sessionId = parseInt(req.params.sessionId);
      const messages = await storage.getConciergeChatMessages(sessionId);
      
      // Get session info
      const [session] = await db.select()
        .from(conciergeBookingSessions)
        .where(eq(conciergeBookingSessions.id, sessionId));

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const trip = await storage.getTripById(session.tripId);
      const chatUser = await storage.getUser(session.userId);

      res.json({
        session: {
          ...session,
          trip,
          user: chatUser,
        },
        messages,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ADMIN ROUTES ============

  // Admin middleware to check if user is admin
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const auth = getAuth(req);
      if (!auth?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.getUserByClerkId(auth.userId);
      if (!user || !user.isAdmin) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      req.adminUser = user;
      next();
    } catch (error) {
      res.status(500).json({ error: "Authentication error" });
      return;
    }
  };

  // Admin dashboard stats
  app.get('/api/admin/stats', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allTrips = await db.select().from(podTrips);
      const allOrders = await db.select().from(orders);
      const allPods = await db.select().from(pods);
      const pendingConcierge = await db.select().from(conciergeRequests).where(eq(conciergeRequests.status, 'pending'));
      const allBookingMeta = await db.select().from(tripItemBookingMeta);
      const pendingManualBookings = allBookingMeta.filter(b => b.requiresManualBooking === true);

      const totalRevenue = allOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.totalInCents || 0), 0);

      const recentUsers = allUsers
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5)
        .map(u => ({
          id: u.id,
          name: u.name || u.firstName,
          email: u.email,
          createdAt: u.createdAt,
        }));

      const recentTrips = allTrips
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          name: t.name,
          destination: t.destination,
          status: t.status,
          createdAt: t.createdAt,
        }));

      res.json({
        totalUsers: allUsers.length,
        totalTrips: allTrips.length,
        totalOrders: allOrders.length,
        totalRevenue,
        pendingConcierge: pendingConcierge.length,
        activePods: allPods.length,
        recentUsers,
        recentTrips,
        pendingBookings: pendingManualBookings.slice(0, 5).map(b => ({
          id: b.id,
          tripItemId: b.tripItemId,
          bookingPlatform: b.bookingPlatform,
          createdAt: b.createdAt,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin users list
  app.get('/api/admin/users', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const { search = '', page = '1', role = 'all' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const pageSize = 20;

      let allUsers = await db.select().from(users);

      // Filter by role
      if (role === 'admin') {
        allUsers = allUsers.filter(u => u.isAdmin);
      } else if (role === 'agent') {
        allUsers = allUsers.filter(u => u.isAgent);
      } else if (role === 'user') {
        allUsers = allUsers.filter(u => !u.isAdmin && !u.isAgent);
      }

      // Search
      if (search) {
        const searchLower = (search as string).toLowerCase();
        allUsers = allUsers.filter(u => 
          (u.name?.toLowerCase().includes(searchLower)) ||
          (u.email?.toLowerCase().includes(searchLower)) ||
          (u.firstName?.toLowerCase().includes(searchLower)) ||
          (u.lastName?.toLowerCase().includes(searchLower))
        );
      }

      const total = allUsers.length;
      const pages = Math.ceil(total / pageSize);
      const paginatedUsers = allUsers
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice((pageNum - 1) * pageSize, pageNum * pageSize);

      res.json({ users: paginatedUsers, total, pages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user permissions
  app.patch('/api/admin/users/:userId', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { isAdmin, isAgent, adminRole } = req.body;

      await db.update(users)
        .set({ isAdmin, isAgent, adminRole })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin trips list
  app.get('/api/admin/trips', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const { search = '', page = '1', status = 'all' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const pageSize = 20;

      let allTrips = await db.select().from(podTrips);

      // Filter by status
      if (status !== 'all') {
        allTrips = allTrips.filter(t => t.status === status);
      }

      // Search
      if (search) {
        const searchLower = (search as string).toLowerCase();
        allTrips = allTrips.filter(t => 
          t.name?.toLowerCase().includes(searchLower) ||
          t.destination?.toLowerCase().includes(searchLower)
        );
      }

      const total = allTrips.length;
      const pages = Math.ceil(total / pageSize);
      const paginatedTrips = allTrips
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice((pageNum - 1) * pageSize, pageNum * pageSize);

      // Enrich with user and concierge info
      const enrichedTrips = await Promise.all(paginatedTrips.map(async (trip) => {
        const tripUser = await storage.getUser(trip.createdByUserId || 0);
        const items = await storage.getTripItems(trip.id);
        const [conciergeRequest] = await db.select().from(conciergeRequests).where(eq(conciergeRequests.tripId, trip.id));
        
        return {
          ...trip,
          itemCount: items.length,
          user: tripUser ? { id: tripUser.id, name: tripUser.name, email: tripUser.email } : null,
          conciergeRequest: conciergeRequest ? { id: conciergeRequest.id, status: conciergeRequest.status } : null,
        };
      }));

      res.json({ trips: enrichedTrips, total, pages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin orders list
  app.get('/api/admin/orders', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const { search = '', page = '1' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const pageSize = 20;

      let allOrders = await db.select().from(orders);

      const total = allOrders.length;
      const pages = Math.ceil(total / pageSize);
      const paginatedOrders = allOrders
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice((pageNum - 1) * pageSize, pageNum * pageSize);

      const enrichedOrders = await Promise.all(paginatedOrders.map(async (order) => {
        const orderUser = await storage.getUser(order.userId || 0);
        const orderItemsData = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        
        return {
          ...order,
          user: orderUser ? { name: orderUser.name, email: orderUser.email } : null,
          items: orderItemsData,
        };
      }));

      res.json({ orders: enrichedOrders, total, pages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin manual bookings list
  app.get('/api/admin/manual-bookings', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const { search = '', page = '1' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const pageSize = 20;

      let allBookings = await db.select().from(tripItemBookingMeta);

      const total = allBookings.length;
      const pages = Math.ceil(total / pageSize);
      const paginatedBookings = allBookings
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice((pageNum - 1) * pageSize, pageNum * pageSize);

      const enrichedBookings = await Promise.all(paginatedBookings.map(async (booking) => {
        // Get the trip item to find the trip
        const [tripItem] = await db.select().from(tripItems).where(eq(tripItems.id, booking.tripItemId));
        let sessionInfo: any = { tripId: 0, userId: 0 };
        if (tripItem) {
          const trip = await storage.getTripById(tripItem.tripId);
          sessionInfo = {
            tripId: tripItem.tripId,
            trip: trip ? { name: trip.name, destination: trip.destination } : null,
          };
        }
        
        return {
          ...booking,
          tripItem: tripItem ? { id: tripItem.id, title: tripItem.title, itemType: tripItem.itemType } : null,
          session: sessionInfo,
        };
      }));

      res.json({ bookings: enrichedBookings, total, pages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update manual booking (admin)
  app.patch('/api/admin/manual-bookings/:id', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { reservationDate, reservationTime, partySize, specialRequests } = req.body;

      await db.update(tripItemBookingMeta)
        .set({ reservationDate, reservationTime, partySize, specialRequests })
        .where(eq(tripItemBookingMeta.id, bookingId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin experiences list
  app.get('/api/admin/experiences', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const { search = '', page = '1' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const pageSize = 20;

      let allExperiences = await db.select().from(experiences);

      if (search) {
        const searchLower = (search as string).toLowerCase();
        allExperiences = allExperiences.filter(e => 
          e.title?.toLowerCase().includes(searchLower) ||
          e.locationName?.toLowerCase().includes(searchLower)
        );
      }

      const total = allExperiences.length;
      const pages = Math.ceil(total / pageSize);
      const paginatedExperiences = allExperiences
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice((pageNum - 1) * pageSize, pageNum * pageSize);

      const enrichedExperiences = await Promise.all(paginatedExperiences.map(async (exp) => {
        const expUser = await storage.getUser(exp.userId);
        return {
          ...exp,
          user: expUser ? { name: expUser.name, email: expUser.email } : null,
        };
      }));

      res.json({ experiences: enrichedExperiences, total, pages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete experience (admin)
  app.delete('/api/admin/experiences/:id', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const expId = parseInt(req.params.id);
      
      // Remove all related records first to avoid foreign key violations
      await db.delete(savedExperiences).where(eq(savedExperiences.experienceId, expId));
      await db.delete(comments).where(eq(comments.experienceId, expId));
      await db.delete(podExperiences).where(eq(podExperiences.experienceId, expId));
      
      // Clear experience references from messages (set to null instead of delete)
      await db.update(messages).set({ sharedExperienceId: null }).where(eq(messages.sharedExperienceId, expId));
      
      // Clear experience references from trip items (set to null instead of delete)
      await db.update(tripItems).set({ experienceId: null }).where(eq(tripItems.experienceId, expId));
      
      // Now delete the experience
      await db.delete(experiences).where(eq(experiences.id, expId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Feature experience (admin)
  app.post('/api/admin/experiences/:id/feature', requireAuth(), requireAdmin, async (req, res) => {
    try {
      res.json({ success: true, message: "Featured experiences not implemented yet" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin pods list
  app.get('/api/admin/pods', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const { search = '', page = '1' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const pageSize = 20;

      let allPods = await db.select().from(pods);

      if (search) {
        const searchLower = (search as string).toLowerCase();
        allPods = allPods.filter(p => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
        );
      }

      const total = allPods.length;
      const pages = Math.ceil(total / pageSize);
      const paginatedPods = allPods
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice((pageNum - 1) * pageSize, pageNum * pageSize);

      const enrichedPods = await Promise.all(paginatedPods.map(async (pod) => {
        const podMessages = await db.select().from(messages).where(eq(messages.podId, pod.id));
        const creator = pod.creatorId ? await storage.getUser(pod.creatorId) : null;
        
        return {
          ...pod,
          messageCount: podMessages.length,
          creator: creator ? { id: creator.id, name: creator.name, email: creator.email } : null,
        };
      }));

      res.json({ pods: enrichedPods, total, pages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update pod (admin)
  app.patch('/api/admin/pods/:id', requireAuth(), requireAdmin, async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const { isPublic } = req.body;

      await db.update(pods)
        .set({ isPublic })
        .where(eq(pods.id, podId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
