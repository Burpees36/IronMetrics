import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Shield, Loader2 } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface RiskMember {
  memberId: number;
  memberName: string;
  riskTier: string;
  riskScore: number;
  daysSinceLastVisit: number | null;
  revenueAtRisk: number;
}

const tierConfig: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", label: "Critical" },
  high: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", label: "High" },
  medium: { bg: "bg-yellow-500/10 border-yellow-500/20", text: "text-yellow-400", label: "Medium" },
};

export function AtRiskMembersCard({ gymId }: { gymId: number }) {
  const [members, setMembers] = useState<RiskMember[]>([]);
  const [allAtRisk, setAllAtRisk] = useState<RiskMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/gyms/${gymId}/intelligence/risk-radar`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : data.members || [];
        const atRisk = list.filter((m: RiskMember) => m.riskTier === "critical" || m.riskTier === "high");
        setAllAtRisk(atRisk);
        setMembers(atRisk.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gymId]);

  const totalRevAtRisk = allAtRisk.reduce((s, m) => s + (m.revenueAtRisk || 0), 0);
  const totalCount = allAtRisk.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl shadow-sm flex flex-col"
    >
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">At-Risk Members</h3>
              {totalCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                  {totalCount}
                </span>
              )}
            </div>
            {totalRevAtRisk > 0 && (
              <p className="text-[10px] text-muted-foreground">${totalRevAtRisk.toLocaleString()}/mo revenue at risk</p>
            )}
          </div>
        </div>
        <Link href="/members?filter=at-risk">
          <span className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-0.5">
            Risk Radar
            <ChevronRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-foreground">All clear</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">No high-risk members right now</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {members.map((m) => {
              const config = tierConfig[m.riskTier] || tierConfig.high;
              return (
                <Link key={m.memberId} href={`/members/${m.memberId}`}>
                  <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground truncate">{m.memberName}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {m.daysSinceLastVisit != null && (
                          <span className="text-[10px] text-muted-foreground">
                            {m.daysSinceLastVisit === 0 ? "Visited today" : `${m.daysSinceLastVisit}d since last visit`}
                          </span>
                        )}
                        {m.revenueAtRisk > 0 && (
                          <span className="text-[10px] text-red-400">${m.revenueAtRisk.toFixed(0)}/mo</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </Link>
              );
            })}
            {totalCount > 5 && (
              <Link href="/members?filter=at-risk">
                <div className="px-4 py-2.5 text-center hover:bg-muted/20 transition-colors cursor-pointer">
                  <span className="text-[11px] font-medium text-primary">
                    View all {totalCount} at-risk members →
                  </span>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
