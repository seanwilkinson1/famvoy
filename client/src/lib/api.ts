import type { Experience, Pod, Message, User } from "@shared/schema";

const API_BASE = "/api";

export const api = {
  experiences: {
    getAll: async (): Promise<Experience[]> => {
      const res = await fetch(`${API_BASE}/experiences`);
      if (!res.ok) throw new Error("Failed to fetch experiences");
      return res.json();
    },
    
    getById: async (id: number): Promise<Experience> => {
      const res = await fetch(`${API_BASE}/experiences/${id}`);
      if (!res.ok) throw new Error("Failed to fetch experience");
      return res.json();
    },
    
    create: async (data: any): Promise<Experience> => {
      const res = await fetch(`${API_BASE}/experiences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create experience");
      return res.json();
    },
    
    save: async (id: number, userId: number): Promise<void> => {
      const res = await fetch(`${API_BASE}/experiences/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to save experience");
    },
    
    unsave: async (id: number, userId: number): Promise<void> => {
      const res = await fetch(`${API_BASE}/experiences/${id}/save`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to unsave experience");
    },
  },
  
  users: {
    getMe: async (): Promise<User> => {
      const res = await fetch(`${API_BASE}/users/me`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    
    getExperiences: async (userId: number): Promise<Experience[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/experiences`);
      if (!res.ok) throw new Error("Failed to fetch user experiences");
      return res.json();
    },
    
    getSavedExperiences: async (userId: number): Promise<Experience[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/saved-experiences`);
      if (!res.ok) throw new Error("Failed to fetch saved experiences");
      return res.json();
    },
    
    getPods: async (userId: number): Promise<Pod[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/pods`);
      if (!res.ok) throw new Error("Failed to fetch user pods");
      return res.json();
    },
  },
  
  pods: {
    getAll: async (): Promise<Pod[]> => {
      const res = await fetch(`${API_BASE}/pods`);
      if (!res.ok) throw new Error("Failed to fetch pods");
      return res.json();
    },
    
    getById: async (id: number): Promise<Pod> => {
      const res = await fetch(`${API_BASE}/pods/${id}`);
      if (!res.ok) throw new Error("Failed to fetch pod");
      return res.json();
    },
    
    create: async (data: { name: string; description: string }): Promise<Pod> => {
      const res = await fetch(`${API_BASE}/pods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create pod");
      return res.json();
    },
    
    getMessages: async (podId: number): Promise<Array<Message & { user: User }>> => {
      const res = await fetch(`${API_BASE}/pods/${podId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    
    sendMessage: async (podId: number, userId: number, content: string): Promise<Message> => {
      const res = await fetch(`${API_BASE}/pods/${podId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
  },
};
