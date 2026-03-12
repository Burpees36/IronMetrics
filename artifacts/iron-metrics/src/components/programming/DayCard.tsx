import React from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  Dumbbell,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getSectionTypeInfo, SectionData } from "./SectionEditor";

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
  const [expanded, setExpanded] = React.useState(false);
  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const totalMovements = sections.reduce(
    (acc, s) => acc + s.movements.length,
    0
  );
  const scoredSections = sections.filter((s) => s.trackResults).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 transition-colors"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-foreground truncate">
                {title}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                title={
                  status === "published" ? "Unpublish" : "Publish"
                }
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

        <div className="space-y-2 mb-3">
          {sections.slice(0, expanded ? sections.length : 3).map((section) => {
            const typeInfo = getSectionTypeInfo(section.type);
            return (
              <div
                key={section.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50"
              >
                <span className={typeInfo.color}>{typeInfo.icon}</span>
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {section.title}
                </span>
                {section.movements.length > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {section.movements.length}
                  </span>
                )}
                {section.timeCap && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {section.timeCap}m
                  </span>
                )}
                {section.trackResults && (
                  <BarChart3 className="h-3 w-3 text-primary" />
                )}
              </div>
            );
          })}
        </div>

        {sections.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> +{sections.length - 3} more
                sections
              </>
            )}
          </button>
        )}

        <div className="flex items-center gap-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Dumbbell className="h-3.5 w-3.5" />
            {totalMovements} movements
          </span>
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
