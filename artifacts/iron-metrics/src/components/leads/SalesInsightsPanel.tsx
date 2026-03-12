import { useGetLeadInsights, getGetLeadInsightsQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { STAGE_CONFIG } from "./lead-utils";

interface SalesInsightsPanelProps {
  gymId: number;
}

export function SalesInsightsPanel({ gymId }: SalesInsightsPanelProps) {
  const { data: insights } = useGetLeadInsights(gymId, {
    query: { enabled: !!gymId }
  });

  if (!insights) return null;

  const funnelStages = ["new", "contacted", "scheduled", "converted"];
  const maxCount = Math.max(...funnelStages.map(s => (insights.stageCounts as any)?.[s] || 0), 1);

  const callouts: string[] = [];
  if (insights.bottleneckStage && insights.bottleneckCount > 0) {
    const label = STAGE_CONFIG[insights.bottleneckStage]?.label || insights.bottleneckStage;
    callouts.push(`Most leads are stuck at "${label}"`);
  }
  if (insights.staleCount > 0) {
    callouts.push(`${insights.staleCount} lead${insights.staleCount > 1 ? "s" : ""} need${insights.staleCount === 1 ? "s" : ""} attention`);
  }
  if (insights.needsFollowUp > 0) {
    callouts.push(`${insights.needsFollowUp} follow-up${insights.needsFollowUp > 1 ? "s" : ""} due today`);
  }
  const topSource = insights.sourcePerformance?.find((s: any) => s.rate > 0);
  if (topSource) {
    callouts.push(`${topSource.source.replace("_", " ")} converts best (${topSource.rate}%)`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Sales Insights</h3>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Funnel</div>
        {funnelStages.map(stage => {
          const count = (insights.stageCounts as any)?.[stage] || 0;
          const config = STAGE_CONFIG[stage];
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={stage} className="flex items-center gap-2">
              <span className={`text-[11px] w-24 truncate ${config?.color || "text-muted-foreground"}`}>
                {config?.label || stage}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`h-full rounded-full ${config?.dotClass || "bg-muted"}`}
                  style={{ opacity: 0.7 }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>

      {insights.sourcePerformance && insights.sourcePerformance.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Source Performance</div>
          {insights.sourcePerformance.slice(0, 4).map((s: any) => (
            <div key={s.source} className="flex items-center justify-between text-xs">
              <span className="capitalize text-foreground">{s.source.replace("_", " ")}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{s.total} leads</span>
                {s.converted > 0 && (
                  <span className="text-emerald-400">{s.rate}% conv.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {callouts.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {callouts.map((callout, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              {callout}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
