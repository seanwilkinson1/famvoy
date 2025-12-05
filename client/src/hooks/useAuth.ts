import { useQuery } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/clerk-react";
import type { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useClerkAuth() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  const { data, isLoading: isQueryLoading, error } = useQuery<User | { needsOnboarding: boolean } | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (res.status === 404) {
        const data = await res.json();
        if (data.needsOnboarding) {
          return { needsOnboarding: true };
        }
      }
      
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      
      return res.json();
    },
    enabled: isLoaded && isSignedIn,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = data && 'id' in data ? data : null;
  const needsOnboarding = data && 'needsOnboarding' in data && data.needsOnboarding;

  return {
    user,
    isLoading: !isLoaded || (isSignedIn && isQueryLoading),
    isAuthenticated: isSignedIn && !!user,
    needsOnboarding,
    error,
  };
}
