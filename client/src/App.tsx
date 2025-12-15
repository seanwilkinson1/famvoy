import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav } from "@/components/layout/BottomNav";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
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
import Cart from "@/pages/Cart";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel from "@/pages/CheckoutCancel";
import { useClerkAuth } from "@/hooks/useAuth";
import { setAuthTokenGetter } from "@/lib/api";

function AuthenticatedRouter() {
  const { user, isLoading, needsOnboarding } = useClerkAuth();
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-soft-beige flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-warm-teal border-t-transparent animate-spin" />
      </div>
    );
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background shadow-2xl overflow-hidden relative flex flex-col">
      <PWAInstallBanner />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/explore" component={Explore} />
        <Route path="/pods" component={Pods} />
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
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </div>
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
