import {
  Building2, CreditCard, Users2, UserPlus, CalendarDays, Rocket,
} from "lucide-react";

export const STEPS = [
  { id: "basics", label: "Gym Basics", icon: Building2, description: "Set up your gym profile" },
  { id: "plans", label: "Membership Plans", icon: CreditCard, description: "Create your pricing" },
  { id: "staff", label: "Staff & Coaches", icon: Users2, description: "Build your team" },
  { id: "members", label: "Members", icon: UserPlus, description: "Add your members" },
  { id: "schedule", label: "Schedule", icon: CalendarDays, description: "Create your first classes" },
  { id: "finish", label: "Launch", icon: Rocket, description: "You're ready to go" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
  "Pacific/Honolulu", "Europe/London", "Europe/Berlin", "Australia/Sydney",
];

export interface OnboardingState {
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

export interface StepProps {
  gymId: number;
  onComplete: () => void;
  onSkip: () => void;
  onBack?: () => void;
  isComplete: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function apiFetch(path: string, options?: RequestInit) {
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
