import React from "react";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";

interface DateNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: "day" | "week";
  onViewModeChange: (mode: "day" | "week") => void;
}

function formatDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - ((day + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatWeekRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export function DateNavigation({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
}: DateNavigationProps) {
  const goToToday = () => onDateChange(new Date());

  const navigate = (direction: number) => {
    const d = new Date(selectedDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() + direction);
    } else {
      d.setDate(d.getDate() + direction * 7);
    }
    onDateChange(d);
  };

  const weekRange = getWeekRange(selectedDate);
  const isToday = (() => {
    const today = new Date();
    return (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    );
  })();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="min-w-[180px] text-center">
          {viewMode === "day" ? (
            <div>
              <p className="text-sm font-semibold text-foreground">
                {formatDate(selectedDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFullDate(selectedDate)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">
                Week View
              </p>
              <p className="text-xs text-muted-foreground">
                {formatWeekRange(weekRange.start, weekRange.end)}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate(1)}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {!isToday && (
          <button
            onClick={goToToday}
            className="px-3 h-9 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Today
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => onViewModeChange("day")}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            viewMode === "day"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {viewMode === "day" && (
            <motion.div
              layoutId="viewModeIndicator"
              className="absolute inset-0 bg-background rounded-md shadow-sm border border-border"
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            />
          )}
          <Calendar className="h-3.5 w-3.5 relative z-10" />
          <span className="relative z-10">Day</span>
        </button>
        <button
          onClick={() => onViewModeChange("week")}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            viewMode === "week"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {viewMode === "week" && (
            <motion.div
              layoutId="viewModeIndicator"
              className="absolute inset-0 bg-background rounded-md shadow-sm border border-border"
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            />
          )}
          <LayoutGrid className="h-3.5 w-3.5 relative z-10" />
          <span className="relative z-10">Week</span>
        </button>
      </div>
    </div>
  );
}
