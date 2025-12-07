import type { Experience, Pod, Message, User, FamilyConnection, Comment } from "@shared/schema";

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
  upload: {
    image: async (file: File): Promise<string> => {
      const uploadRes = await fetchWithAuth(`${API_BASE}/objects/upload`, {
        method: 'POST',
      });
      
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({ error: 'Failed to get upload URL' }));
        throw new Error(errorData.error || 'Failed to get upload URL');
      }
      
      const { uploadURL } = await uploadRes.json();
      
      const putRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!putRes.ok) {
        throw new Error('Failed to upload file to storage');
      }
      
      const confirmRes = await fetchWithAuth(`${API_BASE}/objects/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadURL }),
      });
      
      if (!confirmRes.ok) {
        const errorData = await confirmRes.json().catch(() => ({ error: 'Failed to confirm upload' }));
        throw new Error(errorData.error || 'Failed to confirm upload');
      }
      
      const { objectPath } = await confirmRes.json();
      return objectPath;
    },
  },
  
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
    
    discover: async (): Promise<Pod[]> => {
      const res = await fetch(`${API_BASE}/pods/discover`);
      if (!res.ok) throw new Error("Failed to discover pods");
      return res.json();
    },
    
    search: async (query: string): Promise<Pod[]> => {
      const res = await fetch(`${API_BASE}/pods/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search pods");
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
    
    createGroup: async (data: { name: string; description: string; category?: string; image?: string }): Promise<Pod> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create group pod");
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
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/join`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to join pod");
    },
    
    leave: async (podId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/leave`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to leave pod");
    },
    
    getMessages: async (podId: number): Promise<Array<Message & { user: User }>> => {
      const res = await fetch(`${API_BASE}/pods/${podId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    
    sendMessage: async (podId: number, data: { content: string; messageType?: string; imageUrl?: string; sharedExperienceId?: number }): Promise<Message> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    
    getExperiences: async (podId: number): Promise<Experience[]> => {
      const res = await fetch(`${API_BASE}/pods/${podId}/experiences`);
      if (!res.ok) throw new Error("Failed to fetch pod experiences");
      return res.json();
    },
    
    addExperience: async (podId: number, experienceId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/experiences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to add experience" }));
        throw new Error(error.error || "Failed to add experience to pod");
      }
    },
    
    removeExperience: async (podId: number, experienceId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/experiences/${experienceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove experience from pod");
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
  
  activities: {
    getFeed: async (limit?: number): Promise<any[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const res = await fetchWithAuth(`${API_BASE}/activities/feed${params}`);
      if (!res.ok) throw new Error("Failed to fetch activity feed");
      return res.json();
    },
    
    getByUser: async (userId: number, limit?: number): Promise<any[]> => {
      const params = limit ? `?limit=${limit}` : "";
      const res = await fetch(`${API_BASE}/activities/user/${userId}${params}`);
      if (!res.ok) throw new Error("Failed to fetch user activities");
      return res.json();
    },
  },
  
  comments: {
    getByExperience: async (experienceId: number): Promise<(Comment & { user: User })[]> => {
      const res = await fetch(`${API_BASE}/experiences/${experienceId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    
    create: async (experienceId: number, data: { content: string; rating?: number }): Promise<Comment> => {
      const res = await fetchWithAuth(`${API_BASE}/experiences/${experienceId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      return res.json();
    },
    
    delete: async (commentId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
    },
    
    getRating: async (experienceId: number): Promise<{ average: number; count: number }> => {
      const res = await fetch(`${API_BASE}/experiences/${experienceId}/rating`);
      if (!res.ok) throw new Error("Failed to fetch rating");
      return res.json();
    },
  },
  
  follows: {
    follow: async (userId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/users/${userId}/follow`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to follow user");
    },
    
    unfollow: async (userId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/users/${userId}/follow`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unfollow user");
    },
    
    isFollowing: async (userId: number): Promise<boolean> => {
      const res = await fetchWithAuth(`${API_BASE}/users/${userId}/is-following`);
      if (!res.ok) throw new Error("Failed to check follow status");
      const data = await res.json();
      return data.isFollowing;
    },
    
    getFollowers: async (userId: number): Promise<User[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/followers`);
      if (!res.ok) throw new Error("Failed to fetch followers");
      return res.json();
    },
    
    getFollowing: async (userId: number): Promise<User[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/following`);
      if (!res.ok) throw new Error("Failed to fetch following");
      return res.json();
    },
    
    getCounts: async (userId: number): Promise<{ followers: number; following: number }> => {
      const res = await fetch(`${API_BASE}/users/${userId}/follow-counts`);
      if (!res.ok) throw new Error("Failed to fetch follow counts");
      return res.json();
    },
  },
  
  albums: {
    getByPod: async (podId: number): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/pods/${podId}/albums`);
      if (!res.ok) throw new Error("Failed to fetch albums");
      return res.json();
    },
    
    create: async (podId: number, data: { name: string; description?: string }): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create album");
      return res.json();
    },
    
    delete: async (albumId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/albums/${albumId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete album");
    },
    
    getPhotos: async (albumId: number): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/albums/${albumId}/photos`);
      if (!res.ok) throw new Error("Failed to fetch photos");
      return res.json();
    },
    
    addPhoto: async (albumId: number, data: { photoUrl: string; caption?: string }): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/albums/${albumId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add photo");
      return res.json();
    },
    
    deletePhoto: async (photoId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
  },
  
  badges: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/badges`);
      if (!res.ok) throw new Error("Failed to fetch badges");
      return res.json();
    },
    
    getByUser: async (userId: number): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/badges`);
      if (!res.ok) throw new Error("Failed to fetch user badges");
      return res.json();
    },
    
    checkAndAward: async (userId: number): Promise<{ newBadges: any[] }> => {
      const res = await fetchWithAuth(`${API_BASE}/users/${userId}/check-badges`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to check badges");
      return res.json();
    },
  },

  checkins: {
    create: async (experienceId: number, data: { photoUrl?: string; review?: string; rating?: number }): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/experiences/${experienceId}/checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to check in");
      }
      return res.json();
    },

    getByExperience: async (experienceId: number): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/experiences/${experienceId}/checkins`);
      if (!res.ok) throw new Error("Failed to fetch check-ins");
      return res.json();
    },

    getCount: async (experienceId: number): Promise<number> => {
      const res = await fetch(`${API_BASE}/experiences/${experienceId}/checkin-count`);
      if (!res.ok) throw new Error("Failed to fetch check-in count");
      const data = await res.json();
      return data.count;
    },

    getByUser: async (userId: number): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/users/${userId}/checkins`);
      if (!res.ok) throw new Error("Failed to fetch user check-ins");
      return res.json();
    },

    hasCheckedIn: async (experienceId: number): Promise<boolean> => {
      const res = await fetchWithAuth(`${API_BASE}/experiences/${experienceId}/has-checkedin`);
      if (!res.ok) throw new Error("Failed to check status");
      const data = await res.json();
      return data.hasCheckedIn;
    },
  },

  trips: {
    getByPod: async (podId: number): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/pods/${podId}/trips`);
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },

    getById: async (tripId: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },

    create: async (podId: number, data: { name: string; destination: string; startDate: string; endDate: string }): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/pods/${podId}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create trip");
      return res.json();
    },

    update: async (tripId: number, data: Partial<{ name: string; destination: string; startDate: string; endDate: string; aiSummary: string }>): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update trip");
      return res.json();
    },

    delete: async (tripId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/trips/${tripId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete trip");
    },

    generate: async (tripId: number): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/trips/${tripId}/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to generate itinerary" }));
        throw new Error(error.error || "Failed to generate itinerary");
      }
      return res.json();
    },

    regenerateDay: async (tripId: number, dayNumber: number): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/trips/${tripId}/regenerate-day/${dayNumber}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to regenerate day");
      return res.json();
    },

    addItem: async (tripId: number, data: { dayNumber: number; time: string; title: string; description?: string; itemType: string; sortOrder: number; dayTitle?: string; experienceId?: number }): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/trips/${tripId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add item");
      return res.json();
    },

    updateItem: async (itemId: number, data: Partial<{ time: string; title: string; description: string; itemType: string; sortOrder: number }>): Promise<any> => {
      const res = await fetchWithAuth(`${API_BASE}/trip-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },

    deleteItem: async (itemId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/trip-items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");
    },

    bulkAddItems: async (tripId: number, items: any[]): Promise<any[]> => {
      const res = await fetchWithAuth(`${API_BASE}/trips/${tripId}/items/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed to add items");
      return res.json();
    },

    clearItems: async (tripId: number): Promise<void> => {
      const res = await fetchWithAuth(`${API_BASE}/trips/${tripId}/items`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear items");
    },
  },
};
