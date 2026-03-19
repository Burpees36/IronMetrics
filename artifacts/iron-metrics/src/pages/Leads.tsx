import { useState, useMemo } from "react";
import { useGym } from "@/store/GymContext";
import { useListLeads, useUpdateLead, getListLeadsQueryKey, getGetLeadInsightsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Search, Plus, Target, BarChart3, AlertTriangle, CalendarClock, Globe } from "lucide-react";
import { PipelineBoard } from "@/components/leads/PipelineBoard";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { SummaryStrip } from "@/components/leads/SummaryStrip";
import { SalesInsightsPanel } from "@/components/leads/SalesInsightsPanel";
import { ConvertLeadDialog } from "@/components/leads/ConvertLeadDialog";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import { LeadCaptureSettings } from "@/components/leads/LeadCaptureSettings";
import { computeStale, isFollowUpOverdue, PIPELINE_STAGES, STAGE_CONFIG } from "@/components/leads/lead-utils";

type FilterType = "all" | "stale" | "needs_follow_up" | string;

export function Leads() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [convertLead, setConvertLead] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showCaptureSettings, setShowCaptureSettings] = useState(false);

  const { data: leads, isLoading } = useListLeads(activeGymId as number, { search: search || undefined }, {
    query: { enabled: !!activeGymId, queryKey: getListLeadsQueryKey(activeGymId as number, { search: search || undefined }) }
  });

  const updateLeadMutation = useUpdateLead();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey(activeGymId as number) });
    queryClient.invalidateQueries({ queryKey: getGetLeadInsightsQueryKey(activeGymId as number) });
  };

  const stats = useMemo(() => {
    if (!leads) return { totalActive: 0, staleCount: 0, needsFollowUp: 0, conversionsThisMonth: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let staleCount = 0;
    let needsFollowUp = 0;
    let conversionsThisMonth = 0;
    let totalActive = 0;

    for (const lead of leads) {
      if (lead.stage !== "converted" && lead.stage !== "lost") totalActive++;
      if (computeStale(lead)) staleCount++;
      if (isFollowUpOverdue(lead)) needsFollowUp++;
      if (lead.stage === "converted" && lead.convertedAt && new Date(lead.convertedAt) >= monthStart) {
        conversionsThisMonth++;
      }
    }
    return { totalActive, staleCount, needsFollowUp, conversionsThisMonth };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads as any[];
    if (filter === "stale") result = result.filter(l => computeStale(l));
    else if (filter === "needs_follow_up") result = result.filter(l => isFollowUpOverdue(l));
    else if (filter !== "all" && PIPELINE_STAGES.includes(filter as any)) {
      if (filter === "scheduled") {
        result = result.filter(l => l.stage === "scheduled" || l.stage === "trial");
      } else {
        result = result.filter(l => l.stage === filter);
      }
    }
    return result;
  }, [leads, filter]);

  const handleMoveStage = (lead: any, newStage: string) => {
    if (!activeGymId) return;
    updateLeadMutation.mutate(
      { gymId: activeGymId, leadId: lead.id, data: { stage: newStage as any } },
      {
        onSuccess: () => {
          toast({ title: "Stage updated", description: `${lead.firstName} moved to ${STAGE_CONFIG[newStage]?.label || newStage}.` });
          invalidateAll();
          if (drawerOpen && selectedLead?.id === lead.id) {
            setSelectedLead({ ...lead, stage: newStage });
          }
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update stage." });
        },
      }
    );
  };

  const handleSelectLead = (lead: any) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const handleLogContact = (lead: any) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view leads.</p>
      </div>
    );
  }

  if (showCaptureSettings) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto py-2">
          <LeadCaptureSettings onClose={() => setShowCaptureSettings(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary/15 rounded-xl flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Sales Pipeline</h1>
            <p className="text-xs text-muted-foreground">Track, follow up, and convert leads.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <button
            onClick={() => setShowCaptureSettings(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
          >
            <Globe className="h-4 w-4" />
            <span>Lead Capture</span>
          </button>
          <button
            onClick={() => setShowInsights(!showInsights)}
            className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${showInsights ? "bg-primary/15 border-primary/40 text-primary shadow-sm shadow-primary/10" : "bg-card border-border text-muted-foreground hover:text-primary hover:border-primary/30"}`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Insights</span>
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
        </div>
      </header>

      <SummaryStrip {...stats} />

      <div className="flex gap-2 flex-wrap shrink-0">
        {[
          { key: "all", label: "All Pipeline" },
          ...PIPELINE_STAGES.map(s => ({ key: s, label: STAGE_CONFIG[s].label })),
          { key: "stale", label: `Stale${stats.staleCount ? ` (${stats.staleCount})` : ""}`, icon: AlertTriangle },
          { key: "needs_follow_up", label: `Follow-up Due${stats.needsFollowUp ? ` (${stats.needsFollowUp})` : ""}`, icon: CalendarClock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as FilterType)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === key
                ? key === "stale" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : key === "needs_follow_up" ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                : STAGE_CONFIG[key]
                  ? `${STAGE_CONFIG[key].bgClass} ${STAGE_CONFIG[key].color} border ${STAGE_CONFIG[key].borderClass}`
                  : "bg-primary/15 text-primary border border-primary/30"
                : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
            }`}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : filteredLeads.length === 0 && filter !== "all" ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No leads match this filter.</p>
              <button onClick={() => setFilter("all")} className="text-xs text-primary hover:text-primary/80 transition-colors">
                Show all leads
              </button>
            </div>
          ) : leads && leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Target className="h-8 w-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No leads yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Add your first lead to start tracking your sales pipeline.
              </p>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add First Lead
              </button>
            </div>
          ) : (
            <PipelineBoard
              leads={filteredLeads}
              onSelectLead={handleSelectLead}
              onMoveStage={handleMoveStage}
              onConvert={(lead) => setConvertLead(lead)}
              onLogContact={handleLogContact}
            />
          )}
        </div>

        {showInsights && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="shrink-0 hidden lg:block overflow-y-auto"
          >
            <SalesInsightsPanel gymId={activeGymId} />
          </motion.div>
        )}
      </div>

      <LeadDetailDrawer
        lead={selectedLead}
        gymId={activeGymId}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedLead(null); }}
        onMoveStage={(lead, stage) => { handleMoveStage(lead, stage); setDrawerOpen(false); setSelectedLead(null); }}
        onConvert={(lead) => { setDrawerOpen(false); setConvertLead(lead); }}
        onInvalidate={invalidateAll}
      />

      <ConvertLeadDialog
        lead={convertLead}
        gymId={activeGymId}
        open={!!convertLead}
        onClose={() => setConvertLead(null)}
        onInvalidate={invalidateAll}
      />

      <AddLeadDialog
        gymId={activeGymId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}
