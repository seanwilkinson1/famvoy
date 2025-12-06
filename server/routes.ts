import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import multer from "multer";
import express from "express";
import { clerkMiddleware, getAuth, requireAuth } from "@clerk/express";
import { storage } from "./storage";
import { insertExperienceSchema, insertPodSchema, insertMessageSchema, insertSavedExperienceSchema, insertFamilySwipeSchema, insertCommentSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

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

  app.get('/api/auth/user', requireAuth(), async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found", needsOnboarding: true });
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
      
      const user = await storage.upsertUser({
        clerkId: userId,
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
      const user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
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

  app.get("/api/experiences", async (req, res) => {
    try {
      const allExperiences = await storage.getExperiences();
      
      const experiencesWithCreators = await Promise.all(
        allExperiences.map(async (exp) => {
          const creator = await storage.getUser(exp.userId);
          return {
            ...exp,
            creator: creator ? {
              id: creator.id,
              name: creator.name,
              avatar: creator.avatar,
            } : null
          };
        })
      );
      
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

  app.get("/api/pods/:id/experiences", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      if (isNaN(podId)) {
        return res.status(400).json({ error: "Invalid pod ID" });
      }
      const experiencesWithCreators = await storage.getPodExperiencesWithCreators(podId);
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

  return httpServer;
}
