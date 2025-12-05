import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Pods from "@/pages/Pods";
import Create from "@/pages/Create";
import Profile from "@/pages/Profile";
import ExperienceDetails from "@/pages/ExperienceDetails";
import PodDetails from "@/pages/PodDetails";

function AuthenticatedRouter() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background shadow-2xl overflow-hidden relative">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/explore" component={Explore} />
        <Route path="/pods" component={Pods} />
        <Route path="/create" component={Create} />
        <Route path="/profile" component={Profile} />
        <Route path="/experience/:id" component={ExperienceDetails} />
        <Route path="/pod/:id" component={PodDetails} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-soft-beige flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-warm-teal border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
