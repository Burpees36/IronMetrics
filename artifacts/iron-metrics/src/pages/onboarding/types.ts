import {
  Database, Building2, Rocket, Mail,
} from "lucide-react";

export const STEPS = [
  { id: "gym_details", label: "Business Details", icon: Building2, description: "Your business profile" },
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

async function getClerkToken(): Promise<string | null> {
  try {
    const clerk = (window as Record<string, unknown>).Clerk as
      | { session?: { getToken: () => Promise<string | null> } }
      | undefined;
    if (clerk?.session) {
      return await clerk.session.getToken();
    }
  } catch {}
  return null;
}

export async function apiFetch(path: string, options?: RequestInit) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getClerkToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const existingHeaders = options?.headers;
  if (existingHeaders) {
    new Headers(existingHeaders).forEach((v, k) => { headers[k] = v; });
  }
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || "Request failed");
  }
  return res.json();
}
