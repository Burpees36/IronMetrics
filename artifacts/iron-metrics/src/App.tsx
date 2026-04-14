import React, { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useAuth } from "@clerk/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";

import { GymProvider, useGym } from "@/store/GymContext";
import { ThemeProvider } from "@/store/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { LandingPage } from "@/pages/LandingPage";
import { GymSelect } from "@/pages/GymSelect";
import { Dashboard } from "@/pages/Dashboard";
import { AiInsights } from "@/pages/AiInsights";
import { Members } from "@/pages/Members";
import { Schedule } from "@/pages/Schedule";
import { Leads } from "@/pages/Leads";
import { Billing } from "@/pages/Billing";
import { Workouts } from "@/pages/Workouts";
import { Resources } from "@/pages/Resources";
import { MemberDetail } from "@/pages/MemberDetail";
import { Settings } from "@/pages/Settings";
import { Onboarding } from "@/pages/Onboarding";
import { UpdatePayment } from "@/pages/UpdatePayment";
import { LeadCapture } from "@/pages/LeadCapture";
import { PublicWod } from "@/pages/PublicWod";
import { Retention } from "@/pages/Retention";
import { LeadSequences } from "@/pages/LeadSequences";
import { Finances } from "@/pages/Finances";
import { PlanSelection } from "@/pages/PlanSelection";
import { TierGate } from "@/components/TierGate";

function RedirectTo({ to }: { to: string }) {
  const [, setLoc] = useLocation();
  React.useEffect(() => setLoc(to), [to, setLoc]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ONBOARDING_EXEMPT = new Set(["/onboarding", "/select-gym", "/plan-selection", "/settings"]);

function ProtectedRoute({ component: Component }: { component: React.ElementType }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { activeGymId, setActiveGymId, isGymLoading, onboardingComplete, isOnboardingLoading, onboardingFetchFailed, subscriptionTier, isBetaAccess } = useGym();
  const [location, setLocation] = useLocation();

  const needsPlan = subscriptionTier === "none" && !isBetaAccess;

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  React.useEffect(() => {
    if (isLoaded && isSignedIn && !isGymLoading && !activeGymId && location !== "/select-gym") {
      setLocation("/select-gym");
    }
  }, [isLoaded, isSignedIn, isGymLoading, activeGymId, location, setLocation]);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !activeGymId || ONBOARDING_EXEMPT.has(location)) {
      return;
    }
    if (onboardingFetchFailed) {
      setActiveGymId(null);
      setLocation("/select-gym");
      return;
    }
    if (onboardingComplete === false) {
      setLocation("/onboarding");
      return;
    }
    if (onboardingComplete === true && needsPlan && location !== "/plan-selection") {
      setLocation("/plan-selection");
    }
  }, [isLoaded, isSignedIn, activeGymId, location, setLocation, setActiveGymId, onboardingComplete, onboardingFetchFailed, needsPlan]);

  if (!isLoaded || isGymLoading) return null;
  if (!isSignedIn) return null;
  if (isOnboardingLoading) return null;
  if (!activeGymId) return null;
  if (!ONBOARDING_EXEMPT.has(location) && onboardingComplete === false) return null;
  if (!ONBOARDING_EXEMPT.has(location) && needsPlan) return null;

  return (
    <AppLayout>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </AppLayout>
  );
}

function Router() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <Switch>
      <Route path="/sign-in/:rest*">
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <SignIn routing="path" path={`${BASE}/sign-in`} signUpUrl={`${BASE}/sign-up`} fallbackRedirectUrl={`${BASE}/dashboard`} />
        </div>
      </Route>
      <Route path="/sign-in">
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <SignIn routing="path" path={`${BASE}/sign-in`} signUpUrl={`${BASE}/sign-up`} fallbackRedirectUrl={`${BASE}/dashboard`} />
        </div>
      </Route>
      <Route path="/sign-up/:rest*">
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <SignUp routing="path" path={`${BASE}/sign-up`} signInUrl={`${BASE}/sign-in`} fallbackRedirectUrl={`${BASE}/select-gym`} />
        </div>
      </Route>
      <Route path="/sign-up">
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <SignUp routing="path" path={`${BASE}/sign-up`} signInUrl={`${BASE}/sign-in`} fallbackRedirectUrl={`${BASE}/select-gym`} />
        </div>
      </Route>
      <Route path="/login">{() => <RedirectTo to="/sign-in" />}</Route>
      <Route path="/select-gym" component={GymSelect} />
      <Route path="/update-payment" component={UpdatePayment} />
      <Route path="/join/:gymSlug" component={LeadCapture} />
      <Route path="/wod/:gymSlug" component={PublicWod} />
      
      <Route path="/">
        {isSignedIn ? (
          <ProtectedRoute component={() => {
             const [, setLoc] = useLocation();
             React.useEffect(() => setLoc("/dashboard"), []);
             return null;
          }} />
        ) : (
          <LandingPage />
        )}
      </Route>
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/ai-insights" component={() => <ProtectedRoute component={AiInsights} />} />
      <Route path="/intelligence" component={() => <RedirectTo to="/ai-insights" />} />
      <Route path="/ai-operator" component={() => <RedirectTo to="/ai-insights" />} />
      <Route path="/members/:memberId" component={() => <ProtectedRoute component={() => <TierGate routeGroup="members" feature="Member Management" requiredTier="growth"><MemberDetail /></TierGate>} />} />
      <Route path="/members" component={() => <ProtectedRoute component={() => <TierGate routeGroup="members" feature="Member Management" requiredTier="growth"><Members /></TierGate>} />} />
      <Route path="/schedule" component={() => <ProtectedRoute component={() => <TierGate routeGroup="schedule" feature="Scheduling" requiredTier="growth"><Schedule /></TierGate>} />} />
      <Route path="/leads" component={() => <ProtectedRoute component={() => <TierGate routeGroup="leads" feature="Leads Pipeline" requiredTier="growth"><Leads /></TierGate>} />} />
      <Route path="/lead-sequences" component={() => <ProtectedRoute component={() => <TierGate routeGroup="leads" feature="Lead Sequences" requiredTier="growth"><LeadSequences /></TierGate>} />} />
      <Route path="/retention" component={() => <ProtectedRoute component={Retention} />} />
      <Route path="/billing" component={() => <ProtectedRoute component={Billing} />} />
      <Route path="/finances" component={() => <ProtectedRoute component={Finances} />} />
      <Route path="/workouts" component={() => <ProtectedRoute component={() => <TierGate routeGroup="workouts" feature="Workouts & Programming" requiredTier="insights"><Workouts /></TierGate>} />} />
      <Route path="/resources" component={() => <ProtectedRoute component={Resources} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/onboarding" component={() => <ProtectedRoute component={Onboarding} />} />
      <Route path="/plan-selection" component={() => <ProtectedRoute component={PlanSelection} />} />
      
      <Route path="/:rest*">
        {() => <NotFound />}
      </Route>
    </Switch>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const prevUserId = useRef(userId);

  useEffect(() => {
    if (prevUserId.current !== userId) {
      qc.clear();
      prevUserId.current = userId;
    }
  }, [userId, qc]);

  return null;
}

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ClerkQueryClientCacheInvalidator />
          <GymProvider>
            <TooltipProvider>
              <WouterRouter base={BASE}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </GymProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}

export default App;
