import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";

import { GymProvider, useGym } from "@/store/GymContext";
import { ThemeProvider } from "@/store/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { LandingPage } from "@/pages/LandingPage";
import { Login } from "@/pages/Login";
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
import { Retention } from "@/pages/Retention";
import { LeadSequences } from "@/pages/LeadSequences";
import { PlanSelection } from "@/pages/PlanSelection";
import { TierGate } from "@/components/TierGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ElementType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { activeGymId, isGymLoading } = useGym();
  const [location, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isGymLoading && !activeGymId && location !== "/select-gym") {
      setLocation("/select-gym");
    }
  }, [isLoading, isAuthenticated, isGymLoading, activeGymId, location, setLocation]);

  if (isLoading || isGymLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <AppLayout>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </AppLayout>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/select-gym" component={GymSelect} />
      <Route path="/update-payment" component={UpdatePayment} />
      <Route path="/join/:gymSlug" component={LeadCapture} />
      
      {/* Protected Routes */}
      <Route path="/">
        {isAuthenticated ? (
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
      <Route path="/intelligence">{() => { const [, setLoc] = useLocation(); React.useEffect(() => setLoc("/ai-insights"), []); return null; }}</Route>
      <Route path="/ai-operator">{() => { const [, setLoc] = useLocation(); React.useEffect(() => setLoc("/ai-insights"), []); return null; }}</Route>
      <Route path="/members/:memberId" component={() => <ProtectedRoute component={() => <TierGate routeGroup="members" feature="Member Management" requiredTier="growth"><MemberDetail /></TierGate>} />} />
      <Route path="/members" component={() => <ProtectedRoute component={() => <TierGate routeGroup="members" feature="Member Management" requiredTier="growth"><Members /></TierGate>} />} />
      <Route path="/schedule" component={() => <ProtectedRoute component={() => <TierGate routeGroup="schedule" feature="Scheduling" requiredTier="growth"><Schedule /></TierGate>} />} />
      <Route path="/leads" component={() => <ProtectedRoute component={() => <TierGate routeGroup="leads" feature="Leads Pipeline" requiredTier="growth"><Leads /></TierGate>} />} />
      <Route path="/lead-sequences" component={() => <ProtectedRoute component={() => <TierGate routeGroup="leads" feature="Lead Sequences" requiredTier="growth"><LeadSequences /></TierGate>} />} />
      <Route path="/retention" component={() => <ProtectedRoute component={Retention} />} />
      <Route path="/billing" component={() => <ProtectedRoute component={Billing} />} />
      <Route path="/workouts" component={() => <ProtectedRoute component={() => <TierGate routeGroup="workouts" feature="Workouts & Programming" requiredTier="growth"><Workouts /></TierGate>} />} />
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

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <GymProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </GymProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
