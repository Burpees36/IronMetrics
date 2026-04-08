import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  BarChart3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Share2,
} from "lucide-react";
import { getSectionTypeInfo, SectionData, type SectionType } from "./SectionEditor";
import type { ProgrammingDayWithSections } from "@workspace/api-client-react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PREVIEW_LINES = 3;

interface DayCardProps {
  day: ProgrammingDayWithSections;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onTogglePublish?: () => void;
  onDelete?: () => void;
  onShareDay?: () => void;
  isStaff: boolean;
  animationDelay?: number;
}

function sectionTypeToUiType(sectionType: string): SectionType {
  const map: Record<string, SectionType> = {
    warmup: "warmup",
    strength: "strength",
    conditioning: "conditioning",
    skill: "skill",
    cooldown: "cooldown",
    wod: "conditioning",
    accessory: "accessory",
    custom: "custom",
  };
  return map[sectionType] ?? "conditioning";
}

export function DayCard({
  day,
  onEdit,
  onDuplicate,
  onTogglePublish,
  onDelete,
  onShareDay,
  isStaff,
  animationDelay = 0,
}: DayCardProps) {
  const formattedDate = new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const [expanded, setExpanded] = useState(false);
  const scoredSections = day.sections.filter((s) => s.resultTrackingEnabled).length;

  const hasOverflow = day.sections.some((s) => {
    if (!s.instructions) return false;
    return s.instructions.split("\n").length > PREVIEW_LINES;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 transition-colors"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-foreground truncate">
                {day.title}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  day.status === "published"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                }`}
              >
                {day.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          {isStaff && (
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {day.status === "published" && onShareDay && (
                <button
                  onClick={onShareDay}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                  title="Share programming"
                >
                  <Share2 className="h-4 w-4 text-primary" />
                </button>
              )}
              <button
                onClick={onTogglePublish}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                title={day.status === "published" ? "Unpublish" : "Publish"}
              >
                {day.status === "published" ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-primary" />
                )}
              </button>
              <button
                onClick={onDuplicate}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                title="Duplicate day"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={onEdit}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                title="Edit"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={onDelete}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                title="Delete day"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {day.sections.map((section, i) => {
            const uiType = sectionTypeToUiType(section.sectionType);
            const typeInfo = getSectionTypeInfo(uiType);
            const letter = LETTERS[i] || String(i + 1);
            const lines = section.instructions ? section.instructions.split("\n") : [];
            const isTruncated = !expanded && lines.length > PREVIEW_LINES;
            const displayText = isTruncated
              ? lines.slice(0, PREVIEW_LINES).join("\n")
              : section.instructions || "";

            return (
              <div key={section.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded flex items-center justify-center bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                    {letter}
                  </span>
                  <span className={`${typeInfo.color} shrink-0`}>{typeInfo.icon}</span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {section.title}
                  </span>
                  {section.resultTrackingEnabled && (
                    <BarChart3 className="h-3 w-3 text-primary shrink-0 ml-auto" />
                  )}
                </div>
                {displayText && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed pl-7">
                    {displayText}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 pt-3 mt-3 border-t border-border text-xs text-muted-foreground">
          <span>{day.sections.length} section{day.sections.length !== 1 ? "s" : ""}</span>
          {scoredSections > 0 && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              {scoredSections} scored
            </span>
          )}
          {hasOverflow && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {expanded ? (
                <>
                  Show less
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Show more
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
