import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  BarChart3,
} from "lucide-react";
import { getSectionTypeInfo, SectionData } from "./SectionEditor";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface DayCardProps {
  date: string;
  title: string;
  status: "draft" | "published";
  sections: SectionData[];
  resultCount: number;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onTogglePublish?: () => void;
  isStaff: boolean;
  animationDelay?: number;
}

function truncateLines(text: string, maxLines: number): string {
  const lines = text.split("\n").slice(0, maxLines);
  return lines.join("\n");
}

export function DayCard({
  date,
  title,
  status,
  sections,
  resultCount,
  onEdit,
  onDuplicate,
  onTogglePublish,
  isStaff,
  animationDelay = 0,
}: DayCardProps) {
  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const scoredSections = sections.filter((s) => s.trackResults).length;

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
                {title}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  status === "published"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          {isStaff && (
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={onTogglePublish}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                title={status === "published" ? "Unpublish" : "Publish"}
              >
                {status === "published" ? (
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
            </div>
          )}
        </div>

        <div className="space-y-3">
          {sections.map((section, i) => {
            const typeInfo = getSectionTypeInfo(section.type);
            const letter = LETTERS[i] || String(i + 1);
            const contentPreview = section.instructions
              ? truncateLines(section.instructions, 3)
              : "";

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
                  {section.trackResults && (
                    <BarChart3 className="h-3 w-3 text-primary shrink-0 ml-auto" />
                  )}
                </div>
                {contentPreview && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed pl-7 line-clamp-3">
                    {contentPreview}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 pt-3 mt-3 border-t border-border text-xs text-muted-foreground">
          <span>{sections.length} section{sections.length !== 1 ? "s" : ""}</span>
          {scoredSections > 0 && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              {scoredSections} scored
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {resultCount} results
          </span>
        </div>
      </div>
    </motion.div>
  );
}
