import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav } from "@/components/layout/BottomNav";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Pods from "@/pages/Pods";
import Create from "@/pages/Create";
import Profile from "@/pages/Profile";
import ExperienceDetails from "@/pages/ExperienceDetails";
import PodDetails from "@/pages/PodDetails";

function Router() {
  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Mobile App Shell */}
      <div className="mx-auto min-h-screen max-w-md bg-background shadow-2xl overflow-hidden relative">
        <Router />
        <BottomNav />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
