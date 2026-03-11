import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useGetIntelligenceOverview } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Activity, ShieldAlert, Sparkles, TrendingUp, Zap, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export function Intelligence() {
  const { activeGymId } = useGym();
  const [activeTab, setActiveTab] = useState<"rsi" | "radar" | "interventions">("rsi");
  
  const { data: intel, isLoading, isError, error } = useGetIntelligenceOverview(activeGymId as number, {
    query: { enabled: !!activeGymId, retry: 2, staleTime: 30000 }
  });

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view intelligence data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !intel) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Unable to load intelligence data</h3>
          <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const { rsi, topRisks, topInterventions, revenueForecast } = intel;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Intelligence Hub</h1>
          </div>
          <p className="text-muted-foreground">AI-powered insights and retention stability metrics.</p>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-border">
        {(["rsi", "radar", "interventions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "rsi" && "RSI Score"}
            {tab === "radar" && "Risk Radar"}
            {tab === "interventions" && "Interventions"}
            {activeTab === tab && (
              <motion.div layoutId="intel-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "rsi" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">Retention Stability Index</h2>
                <div className="relative">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted" />
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" 
                      strokeDasharray={`${(rsi.score / 100) * 502} 502`} className="text-primary drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-5xl font-display font-bold text-foreground">{rsi.score.toFixed(1)}</span>
                    <span className={`text-sm font-bold mt-1 px-3 py-0.5 rounded-full ${
                      rsi.band === 'Strong' ? 'bg-emerald-500/20 text-emerald-500' :
                      rsi.band === 'Moderate' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-destructive/20 text-destructive'
                    }`}>{rsi.band}</span>
                  </div>
                </div>
                <p className="mt-6 text-sm text-muted-foreground max-w-xs">{rsi.insight}</p>
              </div>

              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-6">Index Composition</h3>
                <div className="space-y-6">
                  {rsi.breakdown.map((item: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-foreground">{item.metric}</span>
                        <span className="text-muted-foreground">Weight: {item.weight}%</span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${item.normalized}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className={`h-full ${item.normalized > 70 ? 'bg-emerald-500' : item.normalized > 40 ? 'bg-yellow-500' : 'bg-destructive'}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "radar" && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">At-Risk Members</h3>
                  <p className="text-sm text-muted-foreground">Members with high probability of churn.</p>
                </div>
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg font-bold text-lg">
                  ${topRisks.reduce((acc: number, r: any) => acc + r.revenueAtRisk, 0).toLocaleString()} at risk
                </div>
              </div>
              {topRisks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-medium">Member</th>
                        <th className="px-6 py-4 font-medium">Risk Score</th>
                        <th className="px-6 py-4 font-medium">Tier</th>
                        <th className="px-6 py-4 font-medium">Rev at Risk</th>
                        <th className="px-6 py-4 font-medium">Signals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topRisks.map((risk: any) => (
                        <tr key={risk.memberId} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">{risk.memberName}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-destructive" style={{width: `${risk.riskScore}%`}} />
                              </div>
                              <span className="font-mono text-xs">{risk.riskScore}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                              risk.riskTier === 'critical' ? 'bg-red-500/20 text-red-500' :
                              risk.riskTier === 'high' ? 'bg-orange-500/20 text-orange-500' :
                              'bg-yellow-500/20 text-yellow-500'
                            }`}>{risk.riskTier}</span>
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">${risk.revenueAtRisk}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {risk.signals.slice(0, 2).map((sig: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">{sig}</span>
                              ))}
                              {risk.signals.length > 2 && <span className="px-2 py-0.5 text-[10px] text-muted-foreground">+{risk.signals.length - 2}</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <ShieldAlert className="h-12 w-12 text-emerald-500/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No High-Risk Members</h3>
                  <p className="text-muted-foreground text-sm mt-1">All members are within healthy engagement levels.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "interventions" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topInterventions.length > 0 ? topInterventions.map((inv: any, i: number) => (
                <motion.div 
                  key={inv.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors shadow-sm flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wide">
                      {inv.category}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded bg-muted ${
                      inv.urgency === 'immediate' ? 'text-destructive' : 'text-foreground'
                    }`}>
                      {inv.urgency.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{inv.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6 flex-1">{inv.description}</p>
                  
                  <div className="space-y-2 mb-6">
                    {inv.actions.map((action: string, j: number) => (
                      <div key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-foreground font-medium rounded-xl transition-colors border border-white/10">
                    Execute Intervention
                  </button>
                </motion.div>
              )) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No interventions recommended at this time.</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BrainCircuit(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/></svg>
}
