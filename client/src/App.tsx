import { Switch, Route, useLocation } from "wouter";
import { useEffect, useCallback } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { GoogleMapsProvider } from "@/components/shared/GoogleMapsProvider";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Pods from "@/pages/Pods";
import Create from "@/pages/Create";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import FamilyProfile from "@/pages/FamilyProfile";
import ExperienceDetails from "@/pages/ExperienceDetails";
import PodDetails from "@/pages/PodDetails";
import TripDetails from "@/pages/TripDetails";
import TripConfirmWizard from "@/pages/TripConfirmWizard";
import Trips from "@/pages/Trips";
import Chat from "@/pages/Chat";
import ConversationDetail from "@/pages/ConversationDetail";
import Cart from "@/pages/Cart";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel from "@/pages/CheckoutCancel";
import AgentDashboard from "@/pages/AgentDashboard";
import AgentRequestDetails from "@/pages/AgentRequestDetails";
import ConciergeSuccess from "@/pages/ConciergeSuccess";
import { useClerkAuth } from "@/hooks/useAuth";
import { setAuthTokenGetter } from "@/lib/api";

function AuthenticatedRouter() {
  const { user, isLoading, needsOnboarding } = useClerkAuth();
  const { getToken } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, []);

  // Only show header on home page (SeaPeople style)
  const showHeader = location === "/";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-soft-beige flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-warm-teal border-t-transparent animate-spin" />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <GoogleMapsProvider>
        <Onboarding />
      </GoogleMapsProvider>
    );
  }

  const isExplorePage = location === "/explore";

  return (
    <GoogleMapsProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col mx-auto w-full max-w-md md:max-w-none bg-background shadow-2xl md:shadow-none overflow-hidden relative">
          {showHeader && <TopHeader />}
          <PWAInstallBanner />
          {isExplorePage ? (
            <Explore />
          ) : (
            <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-auto pb-24 md:pb-6">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/pods" component={Pods} />
                <Route path="/trips" component={Trips} />
                <Route path="/chat" component={Chat} />
                <Route path="/conversation/:id" component={ConversationDetail} />
                <Route path="/create" component={Create} />
                <Route path="/profile" component={Profile} />
                <Route path="/settings" component={Settings} />
                <Route path="/experience/:id" component={ExperienceDetails} />
                <Route path="/pod/:id" component={PodDetails} />
                <Route path="/trip/:id" component={TripDetails} />
                <Route path="/trip/:id/confirm" component={TripConfirmWizard} />
                <Route path="/family/:id" component={FamilyProfile} />
                <Route path="/cart" component={Cart} />
                <Route path="/checkout/success" component={CheckoutSuccess} />
                <Route path="/checkout/cancel" component={CheckoutCancel} />
                <Route path="/concierge/success" component={ConciergeSuccess} />
                <Route path="/agent" component={AgentDashboard} />
                <Route path="/agent/request/:id" component={AgentRequestDetails} />
                <Route component={NotFound} />
              </Switch>
            </PullToRefresh>
          )}
          {location === "/" && <FloatingActionButton />}
          <BottomNav />
        </div>
      </div>
    </GoogleMapsProvider>
  );
}

function Router() {
  return (
    <>
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <AuthenticatedRouter />
      </SignedIn>
    </>
  );
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
