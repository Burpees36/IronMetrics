import { motion } from "framer-motion";
import { PIPELINE_STAGES, STAGE_CONFIG, getLeadsByStage } from "./lead-utils";
import { LeadCard } from "./LeadCard";

interface PipelineBoardProps {
  leads: any[];
  onSelectLead: (lead: any) => void;
  onMoveStage: (lead: any, stage: string) => void;
  onConvert: (lead: any) => void;
  onLogContact: (lead: any) => void;
}

export function PipelineBoard({ leads, onSelectLead, onMoveStage, onConvert, onLogContact }: PipelineBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar flex-1 min-h-0">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = getLeadsByStage(leads, stage);
        const config = STAGE_CONFIG[stage];
        return (
          <div
            key={stage}
            className="flex flex-col min-w-[260px] w-[260px] shrink-0"
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`h-2 w-2 rounded-full ${config.dotClass}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {stageLeads.length}
              </span>
            </div>
            <div className={`flex-1 rounded-xl border border-border/50 bg-[hsl(220,20%,9%)] p-2 space-y-2 overflow-y-auto custom-scrollbar`}>
              {stageLeads.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
                  No leads
                </div>
              ) : (
                stageLeads.map((lead, i) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    index={i}
                    onSelect={onSelectLead}
                    onMoveStage={onMoveStage}
                    onConvert={onConvert}
                    onLogContact={onLogContact}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
