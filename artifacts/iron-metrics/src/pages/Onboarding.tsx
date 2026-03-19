import React, { useState, useEffect, useCallback } from "react";
import { useGym } from "@/store/GymContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, CreditCard, Users2, UserPlus, CalendarDays, Rocket,
  Check, ChevronRight, ChevronLeft, SkipForward, Loader2,
  ArrowRight, Plus, Upload, Clock, MapPin, Mail, Phone, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImportMembersDialog } from "@/components/members/ImportMembersDialog";

const API_BASE = import.meta.env.VITE_API_URL || "";

const STEPS = [
  { id: "basics", label: "Gym Basics", icon: Building2, description: "Set up your gym profile" },
  { id: "plans", label: "Membership Plans", icon: CreditCard, description: "Create your pricing" },
  { id: "staff", label: "Staff & Coaches", icon: Users2, description: "Build your team" },
  { id: "members", label: "Members", icon: UserPlus, description: "Add your members" },
  { id: "schedule", label: "Schedule", icon: CalendarDays, description: "Create your first classes" },
  { id: "finish", label: "Launch", icon: Rocket, description: "You're ready to go" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
  "Pacific/Honolulu", "Europe/London", "Europe/Berlin", "Australia/Sydney",
];

interface OnboardingState {
  currentStep: string;
  completedSteps: string[];
  skippedSteps: string[];
  isComplete: boolean;
  stepStatus: Record<string, boolean>;
  steps: string[];
  counts?: {
    plans: number;
    staff: number;
    members: number;
    upcomingClasses: number;
  };
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || "Request failed");
  }
  return res.json();
}

export function Onboarding() {
  const { activeGymId } = useGym();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>("basics");

  const fetchOnboarding = useCallback(async () => {
    if (!activeGymId) return;
    try {
      const data = await apiFetch(`/api/gyms/${activeGymId}/onboarding`);
      setState(data);
      if (data.isComplete) {
        setActiveStep("finish");
      } else {
        setActiveStep(data.currentStep as StepId);
      }
    } catch (e) {
      console.error("Failed to fetch onboarding state", e);
    } finally {
      setLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => { fetchOnboarding(); }, [fetchOnboarding]);

  const updateStep = async (action: string, step?: string): Promise<boolean> => {
    if (!activeGymId) return false;
    try {
      const data = await apiFetch(`/api/gyms/${activeGymId}/onboarding`, {
        method: "PATCH",
        body: JSON.stringify({ action, step }),
      });
      setState(data);
      return true;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      return false;
    }
  };

  const handleComplete = async (step: StepId) => {
    const ok = await updateStep("complete_step", step);
    if (!ok) return;
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) {
      setActiveStep(STEPS[idx + 1].id);
    }
  };

  const handleSkip = async (step: StepId) => {
    const ok = await updateStep("skip_step", step);
    if (!ok) return;
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) {
      setActiveStep(STEPS[idx + 1].id);
    }
  };

  const handleBack = () => {
    const idx = STEPS.findIndex((s) => s.id === activeStep);
    if (idx > 0) setActiveStep(STEPS[idx - 1].id);
  };

  const handleFinish = async () => {
    const ok = await updateStep("finish");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/gyms/${activeGymId}/platform-billing`, {
        credentials: "include",
      });
      if (res.ok) {
        const billing = await res.json();
        const hasPlan = billing.isBetaAccess || (billing.subscriptionTier && billing.subscriptionTier !== "none");
        if (!hasPlan) {
          setLocation("/plan-selection");
          return;
        }
      }
    } catch (_) {}

    setLocation("/dashboard");
  };

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const stepIdx = STEPS.findIndex((s) => s.id === activeStep);
  const progress = state ? ((state.completedSteps.length + state.skippedSteps.length) / (STEPS.length - 1)) * 100 : 0;
  const isStepComplete = (id: string) => state?.completedSteps.includes(id) || state?.stepStatus[id] || false;
  const isStepSkipped = (id: string) => state?.skippedSteps.includes(id) || false;

  return (
    <div className="min-h-[80vh] pb-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Set Up Your Gym
            </h1>
            <p className="text-muted-foreground">
              Let's get everything configured so you can start managing your gym. This takes about 5 minutes.
            </p>
          </motion.div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-1 mb-3">
            {STEPS.map((step, i) => {
              const complete = isStepComplete(step.id);
              const skipped = isStepSkipped(step.id);
              const active = step.id === activeStep;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => {
                      setActiveStep(step.id);
                      updateStep("go_to_step", step.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : complete
                        ? "bg-green-500/10 text-green-400 hover:bg-green-500/15"
                        : skipped
                        ? "bg-muted/50 text-muted-foreground hover:bg-muted"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                      complete ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className="hidden md:inline">{step.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 max-w-6 ${complete ? "bg-green-500/50" : "bg-border"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="h-1 bg-card rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeStep === "basics" && (
              <BasicsStep
                gymId={activeGymId}
                onComplete={() => handleComplete("basics")}
                onSkip={() => handleSkip("basics")}
                isComplete={isStepComplete("basics")}
              />
            )}
            {activeStep === "plans" && (
              <PlansStep
                gymId={activeGymId}
                onComplete={() => handleComplete("plans")}
                onSkip={() => handleSkip("plans")}
                onBack={handleBack}
                isComplete={isStepComplete("plans")}
              />
            )}
            {activeStep === "staff" && (
              <StaffStep
                gymId={activeGymId}
                onComplete={() => handleComplete("staff")}
                onSkip={() => handleSkip("staff")}
                onBack={handleBack}
                isComplete={isStepComplete("staff")}
              />
            )}
            {activeStep === "members" && (
              <MembersStep
                gymId={activeGymId}
                onComplete={() => handleComplete("members")}
                onSkip={() => handleSkip("members")}
                onBack={handleBack}
                isComplete={isStepComplete("members")}
              />
            )}
            {activeStep === "schedule" && (
              <ScheduleStep
                gymId={activeGymId}
                onComplete={() => handleComplete("schedule")}
                onSkip={() => handleSkip("schedule")}
                onBack={handleBack}
                isComplete={isStepComplete("schedule")}
              />
            )}
            {activeStep === "finish" && (
              <FinishStep
                state={state}
                onFinish={handleFinish}
                onBack={handleBack}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

interface StepProps {
  gymId: number;
  onComplete: () => void;
  onSkip: () => void;
  onBack?: () => void;
  isComplete: boolean;
}

function StepCard({ children, title, description, onSkip, onBack, skipLabel }: {
  children: React.ReactNode;
  title: string;
  description: string;
  onSkip?: () => void;
  onBack?: () => void;
  skipLabel?: string;
}) {
  return (
    <Card className="p-6 md:p-8 bg-card border-border">
      <div className="mb-6">
        <h2 className="text-xl font-display font-semibold text-foreground mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <div>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
        </div>
        <div>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              <SkipForward className="h-4 w-4 mr-1" /> {skipLabel || "Skip for now"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function BasicsStep({ gymId, onComplete, onSkip, isComplete }: StepProps) {
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", timezone: "America/New_York",
    address: "", city: "", state: "", zip: "", website: "",
  });

  useEffect(() => {
    apiFetch(`/api/gyms/${gymId}`).then((data) => {
      setGym(data);
      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        timezone: data.timezone || "America/New_York",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
        website: data.website || "",
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gymId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Gym name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      toast({ title: "Gym profile saved" });
      onComplete();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Welcome! Let's set up your gym." description="Start with the basics — your name, location, and how members can reach you." onSkip={onSkip}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Gym Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CrossFit Iron Forge" />
        </div>
        <div>
          <Label>Contact Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@yourgym.com" />
          </div>
        </div>
        <div>
          <Label>Phone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
          </div>
        </div>
        <div>
          <Label>Timezone</Label>
          <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Website</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://yourgym.com" />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" />
          </div>
        </div>
        <div>
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Seattle" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>State</Label>
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="WA" />
          </div>
          <div>
            <Label>ZIP</Label>
            <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="98101" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save & Continue <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </StepCard>
  );
}

function PlansStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", price: "", billingInterval: "monthly", description: "",
  });

  const fetchPlans = async () => {
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/plans`);
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, [gymId]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}/plans`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: form.price,
          gymId,
        }),
      });
      toast({ title: "Plan created" });
      setShowForm(false);
      setForm({ name: "", price: "", billingInterval: "monthly", description: "" });
      await fetchPlans();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Membership Plans" description="Set up your pricing so members know what's available. You can always add more later." onSkip={onSkip} onBack={onBack}>
      {plans.length > 0 && (
        <div className="space-y-3 mb-6">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between bg-background/50 rounded-xl p-4 border border-border">
              <div>
                <p className="font-medium text-foreground">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{plan.description || "No description"}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">${parseFloat(plan.price).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">/{plan.billingInterval}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {plans.length === 0 && !showForm && (
        <div className="text-center py-8 bg-background/30 rounded-xl border border-dashed border-border">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No membership plans yet. Create your first one.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Plan
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Plan Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Unlimited Monthly" />
            </div>
            <div>
              <Label>Price *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="149.00" />
            </div>
            <div>
              <Label>Billing Interval</Label>
              <Select value={form.billingInterval} onValueChange={(v) => setForm({ ...form, billingInterval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Access to all classes" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Plan
            </Button>
          </div>
        </div>
      )}

      {plans.length > 0 && !showForm && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Another
          </Button>
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </StepCard>
  );
}

function StaffStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", role: "coach",
  });

  const fetchStaff = async () => {
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/staff`);
      setStaff(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, [gymId]);

  const handleInvite = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}/staff`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast({ title: "Staff member added" });
      setShowForm(false);
      setForm({ firstName: "", lastName: "", email: "", role: "coach" });
      await fetchStaff();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  const ROLE_LABELS: Record<string, string> = {
    gym_owner: "Owner", admin: "Admin", coach: "Coach", front_desk: "Front Desk", analyst: "Analyst",
  };

  return (
    <StepCard title="Your Team" description="Add your coaches and staff. They can be invited to log in later." onSkip={onSkip} onBack={onBack}>
      {staff.length > 0 && (
        <div className="space-y-3 mb-6">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-4 bg-background/50 rounded-xl p-4 border border-border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {s.firstName[0]}{s.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{s.firstName} {s.lastName}</p>
                <p className="text-sm text-muted-foreground">{s.email}</p>
              </div>
              <Badge variant="secondary">{ROLE_LABELS[s.role] || s.role}</Badge>
            </div>
          ))}
        </div>
      )}

      {staff.length <= 1 && !showForm && (
        <div className="text-center py-8 bg-background/30 rounded-xl border border-dashed border-border mb-4">
          <Users2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            {staff.length === 1 ? "It's just you so far. Add your coaches and staff." : "Add your team members."}
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff Member
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Sarah" />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Johnson" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sarah@yourgym.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="front_desk">Front Desk</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Staff
            </Button>
          </div>
        </div>
      )}

      {staff.length > 1 && !showForm && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Another
          </Button>
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {staff.length <= 1 && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </StepCard>
  );
}

function MembersStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", status: "active",
  });

  const fetchMembers = async () => {
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/members?limit=1`);
      setMemberCount(Array.isArray(data) ? data.length : data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [gymId]);

  const handleAddMember = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}/members`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          joinDate: new Date().toISOString().split("T")[0],
        }),
      });
      toast({ title: "Member added" });
      setShowAddForm(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", status: "active" });
      await fetchMembers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Add Your Members" description="Bring your member list into Iron Metrics. You can import from a CSV or add members one at a time." onSkip={onSkip} onBack={onBack}>
      {memberCount > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 mb-6 flex items-center gap-4">
          <div className="h-10 w-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="font-medium text-green-400">Members found</p>
            <p className="text-sm text-muted-foreground">You already have members in the system.</p>
          </div>
        </div>
      )}

      {memberCount === 0 && !showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setImportOpen(true)}
            className="bg-background/50 border border-border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
          >
            <Upload className="h-8 w-8 text-primary mb-3" />
            <p className="font-medium text-foreground mb-1">Import from CSV</p>
            <p className="text-sm text-muted-foreground">Upload a spreadsheet with your member list. Supports common formats.</p>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-background/50 border border-border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
          >
            <UserPlus className="h-8 w-8 text-primary mb-3" />
            <p className="font-medium text-foreground mb-1">Add Manually</p>
            <p className="text-sm text-muted-foreground">Enter member details one at a time. Good for small teams.</p>
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="John" />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@email.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Member
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        {memberCount > 0 && (
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <ImportMembersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => {
          fetchMembers();
        }}
      />
    </StepCard>
  );
}

function ScheduleStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const { toast } = useToast();

  const getNextWeekday = (dayOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + ((dayOffset - d.getDay() + 7) % 7 || 7));
    return d;
  };

  const [form, setForm] = useState({
    name: "CrossFit WOD", type: "crossfit",
    startHour: "09", startMin: "00",
    duration: "60", capacity: "20", coachId: "",
    dayOfWeek: "1",
  });

  const fetchData = async () => {
    try {
      const now = new Date();
      const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const [classData, staffData] = await Promise.all([
        apiFetch(`/api/gyms/${gymId}/classes?startDate=${now.toISOString()}&endDate=${twoWeeks.toISOString()}`),
        apiFetch(`/api/gyms/${gymId}/staff`),
      ]);
      setClasses(classData);
      setStaff(staffData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [gymId]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Class name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const day = getNextWeekday(parseInt(form.dayOfWeek));
      day.setHours(parseInt(form.startHour), parseInt(form.startMin), 0, 0);
      const endTime = new Date(day.getTime() + parseInt(form.duration) * 60000);

      await apiFetch(`/api/gyms/${gymId}/classes`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          startTime: day.toISOString(),
          endTime: endTime.toISOString(),
          capacity: parseInt(form.capacity),
          coachId: form.coachId ? parseInt(form.coachId) : undefined,
        }),
      });
      toast({ title: "Class created" });
      setShowForm(false);
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Your First Schedule" description="Create a few classes so your members have something to sign up for." onSkip={onSkip} onBack={onBack}>
      {classes.length > 0 && (
        <div className="space-y-3 mb-6">
          {classes.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-background/50 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(c.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at{" "}
                    {new Date(c.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{c.enrolled}/{c.capacity} spots</p>
                {c.coachName && <p className="text-xs text-muted-foreground">{c.coachName}</p>}
              </div>
            </div>
          ))}
          {classes.length > 5 && (
            <p className="text-sm text-muted-foreground text-center">...and {classes.length - 5} more</p>
          )}
        </div>
      )}

      {classes.length === 0 && !showForm && (
        <div className="text-center py-8 bg-background/30 rounded-xl border border-dashed border-border mb-4">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No upcoming classes yet. Let's schedule your first one.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Class
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Class Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CrossFit WOD" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crossfit">CrossFit</SelectItem>
                  <SelectItem value="open_gym">Open Gym</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                  <SelectItem value="foundations">Foundations</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Day</Label>
              <Select value={form.dayOfWeek} onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <div className="flex gap-1">
                  <Select value={form.startHour} onValueChange={(v) => setForm({ ...form, startHour: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                        <SelectItem key={h} value={h}>{parseInt(h) > 12 ? `${parseInt(h) - 12} PM` : parseInt(h) === 0 ? "12 AM" : parseInt(h) === 12 ? "12 PM" : `${parseInt(h)} AM`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.startMin} onValueChange={(v) => setForm({ ...form, startMin: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="00">:00</SelectItem>
                      <SelectItem value="15">:15</SelectItem>
                      <SelectItem value="30">:30</SelectItem>
                      <SelectItem value="45">:45</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Duration</Label>
                <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="20" />
            </div>
            {staff.length > 0 && (
              <div>
                <Label>Coach</Label>
                <Select value={form.coachId} onValueChange={(v) => setForm({ ...form, coachId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                  <SelectContent>
                    {staff.filter(s => ["coach", "gym_owner", "admin"].includes(s.role)).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Class
            </Button>
          </div>
        </div>
      )}

      {classes.length > 0 && !showForm && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Another
          </Button>
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </StepCard>
  );
}

function FinishStep({ state, onFinish, onBack }: {
  state: OnboardingState | null;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [, setLocation] = useLocation();
  const counts = state?.counts;

  const summaryItems = [
    { label: "Gym Profile", complete: state?.stepStatus?.basics, icon: Building2 },
    { label: "Membership Plans", complete: state?.stepStatus?.plans, count: counts?.plans, icon: CreditCard },
    { label: "Staff & Coaches", complete: state?.stepStatus?.staff, count: counts?.staff, icon: Users2 },
    { label: "Members", complete: state?.stepStatus?.members, count: counts?.members, icon: UserPlus },
    { label: "Schedule", complete: state?.stepStatus?.schedule, count: counts?.upcomingClasses, icon: CalendarDays },
  ];

  return (
    <Card className="p-6 md:p-8 bg-card border-border">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="h-16 w-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Rocket className="h-8 w-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">You're All Set!</h2>
        <p className="text-muted-foreground">Here's a summary of what's been configured. You can always come back and adjust things later.</p>
      </div>

      <div className="space-y-3 mb-8">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex items-center gap-4 bg-background/50 rounded-xl p-4 border border-border">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              item.complete ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
            }`}>
              {item.complete ? <Check className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
            </div>
            <span className="flex-1 text-foreground">{item.label}</span>
            {item.count !== undefined && (
              <Badge variant="secondary">{item.count} {item.count === 1 ? "item" : "items"}</Badge>
            )}
            {item.complete ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Complete</Badge>
            ) : (
              <Badge variant="secondary">Skipped</Badge>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          className="w-full"
          onClick={() => {
            onFinish();
          }}
        >
          Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            onFinish();
            setTimeout(() => setLocation("/schedule"), 100);
          }}
        >
          <CalendarDays className="h-4 w-4 mr-2" /> View Schedule
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            onFinish();
            setTimeout(() => setLocation("/members"), 100);
          }}
        >
          <Users2 className="h-4 w-4 mr-2" /> View Members
        </Button>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Go Back
        </Button>
      </div>
    </Card>
  );
}
