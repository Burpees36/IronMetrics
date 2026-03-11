import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useListLeads } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Loader2, Search, Plus, Target, Phone, Mail, Calendar, MoreHorizontal } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  trial_scheduled: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  trial_completed: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  negotiating: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  converted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  lost: "bg-destructive/10 text-destructive border-destructive/20",
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  trial_scheduled: "Trial Scheduled",
  trial_completed: "Trial Completed",
  negotiating: "Negotiating",
  converted: "Converted",
  lost: "Lost",
};

export function Leads() {
  const { activeGymId } = useGym();
  const [search, setSearch] = useState("");

  const { data: leads, isLoading } = useListLeads(activeGymId as number, { search: search || undefined }, {
    query: { enabled: !!activeGymId }
  });

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view leads.</p>
      </div>
    );
  }

  const stageCounts: Record<string, number> = {};
  if (leads) {
    for (const lead of leads) {
      stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Lead Pipeline</h1>
          </div>
          <p className="text-muted-foreground mt-1">Track and convert prospective members.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
        </div>
      </header>

      {leads && leads.length > 0 && (
        <div className="flex flex-wrap gap-3 shrink-0">
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div key={stage} className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${STAGE_COLORS[stage] || 'bg-muted text-muted-foreground border-border'}`}>
              {STAGE_LABELS[stage] || stage}: {count}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold">Lead</th>
                  <th className="px-6 py-4 font-semibold">Stage</th>
                  <th className="px-6 py-4 font-semibold">Source</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads?.map((lead: any, i: number) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-foreground">{lead.firstName} {lead.lastName}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STAGE_COLORS[lead.stage] || 'bg-muted text-muted-foreground border-border'}`}>
                        {STAGE_LABELS[lead.stage] || lead.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground capitalize">{lead.source || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {lead.phone && <Phone className="h-4 w-4 text-muted-foreground" />}
                        {lead.email && <Mail className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {leads?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {leads && (
          <div className="p-4 border-t border-border bg-muted/10 text-xs text-muted-foreground shrink-0">
            <span>Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
