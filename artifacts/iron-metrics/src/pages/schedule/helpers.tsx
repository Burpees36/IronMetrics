import React from "react";

export const CLASS_TYPE_COLORS: Record<string, { solidBg: string; solidHover: string; accent: string; dot: string }> = {
  regular: { solidBg: "#1e5a8a", solidHover: "#22679e", accent: "#38bdf8", dot: "bg-sky-400" },
  personal_training: { solidBg: "#7a2481", solidHover: "#8e2b96", accent: "#e879f9", dot: "bg-fuchsia-400" },
  intro: { solidBg: "#3d6b1e", solidHover: "#477c24", accent: "#a3e635", dot: "bg-lime-400" },
  specialty: { solidBg: "#8a4a12", solidHover: "#9e5515", accent: "#fb923c", dot: "bg-orange-400" },
  open_gym: { solidBg: "#1a5e5e", solidHover: "#1f6e6e", accent: "#2dd4bf", dot: "bg-teal-400" },
};

export function getClassColors(type: string) {
  return CLASS_TYPE_COLORS[type] || CLASS_TYPE_COLORS.regular;
}

export const HOUR_HEIGHT = 64;
export const CALENDAR_START_HOUR = 5;
export const CALENDAR_END_HOUR = 22;

export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  personal_training: "Personal Training",
  intro: "Intro",
  specialty: "Specialty",
  open_gym: "Open Gym",
};

export function to24Hour(hour: string, amPm: string): number {
  let h = parseInt(hour, 10);
  if (amPm === "AM" && h === 12) h = 0;
  if (amPm === "PM" && h !== 12) h += 12;
  return h;
}

export function from24Hour(h: number): { hour: string; amPm: string } {
  if (h === 0) return { hour: "12", amPm: "AM" };
  if (h < 12) return { hour: String(h), amPm: "AM" };
  if (h === 12) return { hour: "12", amPm: "PM" };
  return { hour: String(h - 12), amPm: "PM" };
}

export function OccupancyBadge({ enrolled, capacity, waitlistCount }: { enrolled: number; capacity: number; waitlistCount?: number }) {
  const pct = capacity > 0 ? (enrolled / capacity) * 100 : 0;
  const isFull = enrolled >= capacity;
  const hasWaitlist = (waitlistCount || 0) > 0;

  if (hasWaitlist) return <span className="text-[9px] font-bold text-orange-400 bg-orange-400/15 px-1.5 py-0.5 rounded-full">WAITLIST</span>;
  if (isFull) return <span className="text-[9px] font-bold text-red-400 bg-red-400/15 px-1.5 py-0.5 rounded-full">FULL</span>;
  if (pct >= 80) return <span className="text-[9px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">{enrolled}/{capacity}</span>;
  return <span className="text-[9px] text-white/50 tabular-nums">{enrolled}/{capacity}</span>;
}

export function AttendanceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    reserved: { label: "Reserved", cls: "bg-sky-400/15 text-sky-400 border-sky-400/30" },
    checked_in: { label: "Checked In", cls: "bg-green-400/15 text-green-400 border-green-400/30" },
    present: { label: "Present", cls: "bg-green-400/15 text-green-400 border-green-400/30" },
    no_show: { label: "No Show", cls: "bg-red-400/15 text-red-400 border-red-400/30" },
    cancelled: { label: "Cancelled", cls: "bg-zinc-400/15 text-zinc-400 border-zinc-400/30" },
    waitlisted: { label: "Waitlisted", cls: "bg-orange-400/15 text-orange-400 border-orange-400/30" },
  };
  const c = config[status] || config.reserved;
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${c.cls}`}>{c.label}</span>;
}
