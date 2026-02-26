import { Switch, Route, useLocation } from "wouter";
import { useEffect, useCallback, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import NotFound from "@/pages/not-found";
import { useClerkAuth } from "@/hooks/useAuth";
import { setAuthTokenGetter } from "@/lib/api";

// Lazy-loaded page components for code splitting
const Landing = lazy(() => import("@/pages/Landing"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Home = lazy(() => import("@/pages/Home"));
const Explore = lazy(() => import("@/pages/Explore"));
const Pods = lazy(() => import("@/pages/Pods"));
const Create = lazy(() => import("@/pages/Create"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const FamilyProfile = lazy(() => import("@/pages/FamilyProfile"));
const ExperienceDetails = lazy(() => import("@/pages/ExperienceDetails"));
const PodDetails = lazy(() => import("@/pages/PodDetails"));
const TripDetails = lazy(() => import("@/pages/TripDetails"));
const TripConfirmWizard = lazy(() => import("@/pages/TripConfirmWizard"));
const Trips = lazy(() => import("@/pages/Trips"));
const Chat = lazy(() => import("@/pages/Chat"));
const ConversationDetail = lazy(() => import("@/pages/ConversationDetail"));
const Cart = lazy(() => import("@/pages/Cart"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("@/pages/CheckoutCancel"));
const AgentDashboard = lazy(() => import("@/pages/AgentDashboard"));
const AgentRequestDetails = lazy(() => import("@/pages/AgentRequestDetails"));
const ConciergeSuccess = lazy(() => import("@/pages/ConciergeSuccess"));
const ConciergeBookingWizard = lazy(() => import("@/pages/ConciergeBookingWizard"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminTrips = lazy(() => import("@/pages/admin/AdminTrips"));
const AdminBookings = lazy(() => import("@/pages/admin/AdminBookings"));
const AdminContent = lazy(() => import("@/pages/admin/AdminContent"));
const AdminPods = lazy(() => import("@/pages/admin/AdminPods"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-soft-beige flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-warm-teal border-t-transparent animate-spin" />
    </div>
  );
}

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
      <Suspense fallback={<PageLoader />}>
        <Onboarding />
      </Suspense>
    );
  }

  const isExplorePage = location === "/explore";
  const isConversationPage = location.startsWith("/conversation/");
  const isAdminPage = location.startsWith("/admin");

  // Admin pages have their own layout
  if (isAdminPage) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/trips" component={AdminTrips} />
          <Route path="/admin/bookings" component={AdminBookings} />
          <Route path="/admin/content" component={AdminContent} />
          <Route path="/admin/pods" component={AdminPods} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col mx-auto w-full max-w-md md:max-w-none bg-background shadow-2xl md:shadow-none overflow-hidden relative">
        {showHeader && <TopHeader />}
        <PWAInstallBanner />
        <Suspense fallback={<PageLoader />}>
          {isExplorePage ? (
            <Explore />
          ) : isConversationPage ? (
            <ConversationDetail />
          ) : (
            <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-auto pb-24 md:pb-6">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/pods" component={Pods} />
                <Route path="/trips" component={Trips} />
                <Route path="/chat" component={Chat} />
                <Route path="/create" component={Create} />
                <Route path="/profile" component={Profile} />
                <Route path="/settings" component={Settings} />
                <Route path="/experience/:id" component={ExperienceDetails} />
                <Route path="/pod/:id" component={PodDetails} />
                <Route path="/trip/:id" component={TripDetails} />
                <Route path="/trip/:id/confirm" component={TripConfirmWizard} />
                <Route path="/trip/:id/concierge" component={ConciergeBookingWizard} />
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
        </Suspense>
        {location === "/" && <FloatingActionButton />}
        {!isConversationPage && <BottomNav />}
      </div>
    </div>
  );
}

function Router() {
  return (
    <>
      <SignedOut>
        <Suspense fallback={<PageLoader />}>
          <Landing />
        </Suspense>
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
