import type { Experience, Pod, Message, User, FamilyConnection } from "@shared/schema";

const API_BASE = "/api";

let getAuthToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  getAuthToken = getter;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  
  return fetch(url, { ...options, headers });
}

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
    
    search: async (query: string): Promise<Experience[]> => {
      const res = await fetch(`${API_BASE}/experiences/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search experiences");
      return res.json();
    },
    
    create: async (data: any): Promise<Experience> => {
      const res = await fetchWithAuth(`${API_BASE}/experiences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create experience");
      return res.json();
    },
    
    save: async (id: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/experiences/${id}/save`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to save experience");
    },
    
    unsave: async (id: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/experiences/${id}/save`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unsave experience");
    },
  },
  
  users: {
    getMe: async (): Promise<User> => {
      const res = await fetchWithAuth(`${API_BASE}/users/me`);
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
    
    getConnections: async (userId: number): Promise<Array<FamilyConnection & { connectedUser: User }>> => {
      const res = await fetch(`${API_BASE}/users/${userId}/connections`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      return res.json();
    },
    
    getMatches: async (userId: number): Promise<User[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/matches`);
      if (!res.ok) throw new Error("Failed to fetch matches");
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
    
    getDetails: async (id: number): Promise<{ pod: Pod; members: User[] }> => {
      const res = await fetch(`${API_BASE}/pods/${id}/details`);
      if (!res.ok) throw new Error("Failed to fetch pod details");
      return res.json();
    },
    
    create: async (data: { name: string; description: string }): Promise<Pod> => {
      const res = await fetchWithAuth(`${API_BASE}/pods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create pod");
      return res.json();
    },
    
    createDirect: async (otherUserId: number): Promise<Pod> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId }),
      });
      if (!res.ok) throw new Error("Failed to create direct pod");
      return res.json();
    },
    
    join: async (podId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/members`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to join pod");
    },
    
    getMessages: async (podId: number): Promise<Array<Message & { user: User }>> => {
      const res = await fetch(`${API_BASE}/pods/${podId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    
    sendMessage: async (podId: number, content: string): Promise<Message> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
  },
  
  families: {
    discover: async (lat?: number, lng?: number): Promise<(User & { distance?: number })[]> => {
      const params = new URLSearchParams();
      if (lat !== undefined && lng !== undefined) {
        params.set('lat', lat.toString());
        params.set('lng', lng.toString());
      }
      const url = params.toString() 
        ? `${API_BASE}/families/discover?${params}` 
        : `${API_BASE}/families/discover`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error("Failed to discover families");
      return res.json();
    },
    
    getNearby: async (lat: number, lng: number, radius?: number): Promise<(Experience & { distance: number })[]> => {
      const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString() });
      if (radius) params.set('radius', radius.toString());
      const res = await fetch(`${API_BASE}/experiences/nearby?${params}`);
      if (!res.ok) throw new Error("Failed to fetch nearby experiences");
      return res.json();
    },
    
    swipe: async (swipedUserId: number, liked: boolean): Promise<{ matched: boolean; podId?: number }> => {
      const res = await fetchWithAuth(`${API_BASE}/families/swipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swipedUserId, liked }),
      });
      if (!res.ok) throw new Error("Failed to record swipe");
      return res.json();
    },
    
    search: async (query: string): Promise<User[]> => {
      const res = await fetch(`${API_BASE}/families/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search families");
      return res.json();
    },
  },
};
