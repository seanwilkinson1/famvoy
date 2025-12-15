import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import multer from "multer";
import express from "express";
import { clerkMiddleware, getAuth, requireAuth, clerkClient } from "@clerk/express";
import { storage } from "./storage";
import { insertExperienceSchema, insertPodSchema, insertMessageSchema, insertSavedExperienceSchema, insertFamilySwipeSchema, insertCommentSchema, insertPodAlbumSchema, insertAlbumPhotoSchema, insertFamilyMemberSchema, insertBookingOptionSchema, insertCartItemSchema } from "@shared/schema";
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

  app.get("/api/experiences", async (req, res) => {
    try {
      const allExperiences = await storage.getExperiences();
      
      const experienceIds = allExperiences.map(exp => exp.id);
      const userIds = [...new Set(allExperiences.map(exp => exp.userId))];
      
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
        
        // Calculate total estimated cost
        let totalMinCost = 0;
        let totalMaxCost = 0;
        itemsWithOptions.forEach(item => {
          if (item.lockedOption?.priceEstimate) {
            const priceStr = item.lockedOption.priceEstimate;
            const matches = priceStr.match(/\$?(\d+)(?:-(\d+))?/);
            if (matches) {
              const min = parseInt(matches[1]) || 0;
              const max = parseInt(matches[2]) || min;
              totalMinCost += min;
              totalMaxCost += max;
            }
          }
        });
        
        res.json({
          ...trip,
          items: itemsWithOptions,
          costSummary: {
            min: totalMinCost,
            max: totalMaxCost,
            formatted: totalMinCost === totalMaxCost 
              ? `$${totalMinCost}`
              : `$${totalMinCost} - $${totalMaxCost}`
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

      const pod = await storage.getPodWithMembers(trip.podId);
      if (!pod) {
        return res.status(404).json({ error: "Pod not found" });
      }

      const podExperiences = await storage.getPodExperiences(trip.podId);
      
      // Fetch trip destinations for multi-destination trips
      const tripDestinations = await storage.getTripDestinations(tripId);

      const familyProfiles = pod.members.map(m => ({
        name: m.name,
        kids: m.kids,
        interests: m.interests || [],
      }));

      const podExperiencesList = podExperiences.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        duration: e.duration,
        cost: e.cost,
        ages: e.ages,
        description: e.description,
        locationName: e.locationName,
      }));

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

${podExperiencesList.length > 0 ? `The families have saved these experiences to consider including:
${JSON.stringify(podExperiencesList, null, 2)}` : ''}

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
     ${podExperiencesList.length > 0 ? '- "experienceId": If this activity matches a saved pod experience, include its ID' : ''}

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

      const pod = await storage.getPodWithMembers(trip.podId);
      if (!pod) {
        return res.status(404).json({ error: "Pod not found" });
      }

      const familyProfiles = pod.members.map(m => ({
        name: m.name,
        kids: m.kids,
        interests: m.interests || [],
      }));

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

      // Authorization check: ensure user is a member of the trip's pod
      const isMember = await storage.isPodMember(trip.podId, userId);
      if (!isMember) {
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

      // Authorization check
      const isMember = await storage.isPodMember(trip.podId, user.id);
      if (!isMember) {
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

      // Authorization check
      const isMember = await storage.isPodMember(trip.podId, user.id);
      if (!isMember) {
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

      // Authorization check
      const isMember = await storage.isPodMember(trip.podId, user.id);
      if (!isMember) {
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

      // Authorization check
      const isMember = await storage.isPodMember(trip.podId, user.id);
      if (!isMember) {
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

      // Authorization check
      const isMember = await storage.isPodMember(trip.podId, user.id);
      if (!isMember) {
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

  return httpServer;
}
