import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertExperienceSchema, insertPodSchema, insertMessageSchema, insertSavedExperienceSchema, insertFamilySwipeSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Experiences
  app.get("/api/experiences", async (req, res) => {
    try {
      const allExperiences = await storage.getExperiences();
      res.json(allExperiences);
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
      res.json(experience);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/experiences", async (req, res) => {
    try {
      const parsed = insertExperienceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const experience = await storage.createExperience(parsed.data);
      res.status(201).json(experience);
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

  app.post("/api/experiences/:id/save", async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const parsed = insertSavedExperienceSchema.safeParse({ 
        userId: req.body.userId,
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

  app.delete("/api/experiences/:id/save", async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const userId = parseInt(req.body.userId);
      await storage.unsaveExperience(userId, experienceId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pods
  app.get("/api/pods", async (req, res) => {
    try {
      const allPods = await storage.getPods();
      res.json(allPods);
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

  app.post("/api/pods", async (req, res) => {
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

  app.get("/api/users/:userId/pods", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userPods = await storage.getPodsByUser(userId);
      res.json(userPods);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/members", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const userId = req.body.userId;
      await storage.addPodMember(podId, userId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Messages
  app.get("/api/pods/:id/messages", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const podMessages = await storage.getMessages(podId);
      res.json(podMessages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pods/:id/messages", async (req, res) => {
    try {
      const podId = parseInt(req.params.id);
      const parsed = insertMessageSchema.safeParse({ ...req.body, podId });
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }
      const message = await storage.createMessage(parsed.data);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Current User
  app.get("/api/users/me", async (req, res) => {
    try {
      const user = await storage.getUser(1);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Family Connections
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

  app.post("/api/connections/:id/accept", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      await storage.acceptConnection(connectionId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/connections/:id/decline", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      await storage.declineConnection(connectionId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Discover & Match Families
  app.get("/api/families/discover", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;
      const families = await storage.getDiscoverableFamilies(userId);
      res.json(families);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/families/swipe", async (req, res) => {
    try {
      const parsed = insertFamilySwipeSchema.safeParse(req.body);
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

  return httpServer;
}
