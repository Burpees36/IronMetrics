import {
  Database, Building2, Rocket, CreditCard, Mail,
} from "lucide-react";

export const STEPS = [
  { id: "gym_details", label: "Business Details", icon: Building2, description: "Your business profile" },
  { id: "connect_billing", label: "Connect Billing", icon: CreditCard, description: "Set up Stripe" },
  { id: "connect_data", label: "Import Members", icon: Database, description: "Import your members" },
  { id: "email_branding", label: "Email Branding", icon: Mail, description: "Outbound email setup" },
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
    members: number;
  };
  gymName?: string;
  gymTimezone?: string;
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
