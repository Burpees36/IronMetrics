import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, Clock, MoreHorizontal, ArrowRight, UserCheck, X, Phone, MessageSquare, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { STAGE_CONFIG, PIPELINE_STAGES, computeStale, timeInStage, formatRelativeDate, isFollowUpOverdue } from "./lead-utils";

interface LeadCardProps {
  lead: any;
  index: number;
  onSelect: (lead: any) => void;
  onMoveStage: (lead: any, stage: string) => void;
  onConvert: (lead: any) => void;
  onLogContact: (lead: any) => void;
}

export function LeadCard({ lead, index, onSelect, onMoveStage, onConvert, onLogContact }: LeadCardProps) {
  const isStale = computeStale(lead);
  const time = timeInStage(lead);
  const overdue = isFollowUpOverdue(lead);
  const isTerminal = lead.stage === "converted" || lead.stage === "lost";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => onSelect(lead)}
      className={`group relative bg-card dark:bg-[hsl(220,20%,11%)] border rounded-xl px-3.5 py-3 cursor-pointer transition-all hover:border-primary/30 hover:bg-muted/50 dark:hover:bg-[hsl(220,20%,13%)] ${
        isStale ? "border-amber-500/30" : "border-border"
      } ${lead.stage === "lost" ? "opacity-60" : ""}`}
    >
      {isStale && (
        <div className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-card dark:border-[hsl(220,20%,11%)]" />
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-foreground truncate">
            {lead.firstName} {lead.lastName}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs">
                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                Move Stage
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {PIPELINE_STAGES.filter(s => s !== lead.stage && !(s === "scheduled" && lead.stage === "trial")).map(stage => (
                  <DropdownMenuItem key={stage} className="text-xs" onClick={() => onMoveStage(lead, stage)}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${STAGE_CONFIG[stage]?.dotClass}`} />
                    {STAGE_CONFIG[stage]?.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem className="text-xs" onClick={() => onLogContact(lead)}>
              <Phone className="h-3.5 w-3.5 mr-2" />
              Log Contact
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!isTerminal && (
              <DropdownMenuItem className="text-xs" onClick={() => onConvert(lead)}>
                <UserCheck className="h-3.5 w-3.5 mr-2" />
                Convert to Member
              </DropdownMenuItem>
            )}
            {lead.stage !== "lost" && !isTerminal && (
              <DropdownMenuItem className="text-xs text-destructive focus:text-destructive" onClick={() => onMoveStage(lead, "lost")}>
                <X className="h-3.5 w-3.5 mr-2" />
                Mark as Lost
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
        {lead.source && (
          <span className="capitalize">{lead.source?.replace("_", " ")}</span>
        )}
        <span className="flex items-center gap-0.5">
          <Clock className="h-3 w-3" />
          {time}
        </span>
      </div>

      {(lead.nextFollowUpDate || isStale) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {lead.nextFollowUpDate && (
            <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${
              overdue
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            }`}>
              <CalendarClock className="h-3 w-3" />
              {formatRelativeDate(lead.nextFollowUpDate)}
            </span>
          )}
          {isStale && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Stale
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
