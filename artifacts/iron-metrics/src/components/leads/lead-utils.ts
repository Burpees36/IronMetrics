import type { Lead } from "@workspace/api-client-react";

export const PIPELINE_STAGES = ["new", "contacted", "scheduled", "converted", "lost"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_CONFIG: Record<string, {
  label: string;
  color: string;
  bgClass: string;
  dotClass: string;
  borderClass: string;
}> = {
  new: {
    label: "New",
    color: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    dotClass: "bg-blue-500 dark:bg-blue-400",
    borderClass: "border-blue-500/20",
  },
  contacted: {
    label: "Contacted",
    color: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    dotClass: "bg-amber-500 dark:bg-amber-400",
    borderClass: "border-amber-500/20",
  },
  scheduled: {
    label: "Intro Scheduled",
    color: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    dotClass: "bg-purple-500 dark:bg-purple-400",
    borderClass: "border-purple-500/20",
  },
  trial: {
    label: "Intro Scheduled",
    color: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    dotClass: "bg-purple-500 dark:bg-purple-400",
    borderClass: "border-purple-500/20",
  },
  converted: {
    label: "Converted",
    color: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
    borderClass: "border-emerald-500/20",
  },
  lost: {
    label: "Lost",
    color: "text-red-500/60 dark:text-red-400/60",
    bgClass: "bg-red-500/5",
    dotClass: "bg-red-500/50 dark:bg-red-400/50",
    borderClass: "border-red-500/10",
  },
};

export const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "social_media", label: "Social Media" },
  { value: "google", label: "Google" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

export function computeStale(lead: any): boolean {
  if (lead.stage === "converted" || lead.stage === "lost") return false;
  const now = new Date();
  const created = new Date(lead.createdAt);
  const lastContact = lead.lastContactDate ? new Date(lead.lastContactDate) : null;
  const hoursSinceAction = lastContact
    ? (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60)
    : (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (lead.stage === "new" && !lastContact && hoursSinceAction > 24) return true;
  if (lead.stage === "contacted" && hoursSinceAction > 72) return true;
  if ((lead.stage === "scheduled" || lead.stage === "trial") && lead.nextFollowUpDate) {
    const followUp = new Date(lead.nextFollowUpDate + "T00:00:00");
    if (now > followUp) return true;
  }
  if ((lead.stage === "scheduled" || lead.stage === "trial") && !lead.nextFollowUpDate && hoursSinceAction > 72) return true;
  return false;
}

export function timeInStage(lead: any): string {
  const lastContact = lead.lastContactDate ? new Date(lead.lastContactDate) : null;
  const stageStart = lastContact || new Date(lead.createdAt);
  const now = new Date();
  const hours = Math.floor((now.getTime() - stageStart.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays}d`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isFollowUpOverdue(lead: any): boolean {
  if (!lead.nextFollowUpDate || lead.stage === "converted" || lead.stage === "lost") return false;
  const followUp = new Date(lead.nextFollowUpDate + "T00:00:00");
  return new Date() > followUp;
}

export function getLeadsByStage(leads: any[], stage: string): any[] {
  if (stage === "scheduled") {
    return leads.filter(l => l.stage === "scheduled" || l.stage === "trial");
  }
  return leads.filter(l => l.stage === stage);
}
