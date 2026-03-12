import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";

import { GymProvider, useGym } from "@/store/GymContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { LandingPage } from "@/pages/LandingPage";
import { Login } from "@/pages/Login";
import { GymSelect } from "@/pages/GymSelect";
import { Dashboard } from "@/pages/Dashboard";
import { Intelligence } from "@/pages/Intelligence";
import { Members } from "@/pages/Members";
import { Schedule } from "@/pages/Schedule";
import { AiOperator } from "@/pages/AiOperator";
import { Leads } from "@/pages/Leads";
import { Billing } from "@/pages/Billing";
import { Workouts } from "@/pages/Workouts";
import { Resources } from "@/pages/Resources";
import { MemberDetail } from "@/pages/MemberDetail";
import { Settings } from "@/pages/Settings";

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
  const { activeGymId } = useGym();
  const [location, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !activeGymId && location !== "/select-gym") {
      setLocation("/select-gym");
    }
  }, [isLoading, isAuthenticated, activeGymId, location, setLocation]);

  if (isLoading) return null;
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
      <Route path="/intelligence" component={() => <ProtectedRoute component={Intelligence} />} />
      <Route path="/members/:memberId" component={() => <ProtectedRoute component={MemberDetail} />} />
      <Route path="/members" component={() => <ProtectedRoute component={Members} />} />
      <Route path="/schedule" component={() => <ProtectedRoute component={Schedule} />} />
      <Route path="/ai-operator" component={() => <ProtectedRoute component={AiOperator} />} />
      <Route path="/leads" component={() => <ProtectedRoute component={Leads} />} />
      <Route path="/billing" component={() => <ProtectedRoute component={Billing} />} />
      <Route path="/workouts" component={() => <ProtectedRoute component={Workouts} />} />
      <Route path="/resources" component={() => <ProtectedRoute component={Resources} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      
      <Route path="/:rest*">
        {() => <NotFound />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
