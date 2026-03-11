import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useListMembers } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Loader2, Search, Plus, Filter, MoreHorizontal, UserCircle } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

export function Members() {
  const { activeGymId } = useGym();
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  
  const { data, isLoading } = useListMembers(activeGymId as number, { search }, {
    query: { enabled: !!activeGymId, placeholderData: (prev) => prev }
  });

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col">
      <header className="flex flex-col gap-3 md:gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Directory</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your gym's member base.</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button className="p-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Filter members">
              <Filter className="h-5 w-5 text-muted-foreground" />
            </button>
            <button className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 min-h-[44px]">
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Member</span>
            </button>
          </div>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search members..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all min-h-[44px]"
          />
        </div>
      </header>

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {isLoading && !data ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : isMobile ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
            {data?.members.map((member, i) => (
              <motion.div 
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="p-4 active:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full overflow-hidden flex items-center justify-center shrink-0">
                    {member.profileImageUrl ? (
                      <img src={member.profileImageUrl} alt={member.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground truncate">{member.firstName} {member.lastName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                        member.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        member.status === 'inactive' ? 'bg-muted text-muted-foreground border-border' :
                        member.status === 'hold' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                      {member.riskTier ? (
                        <span className={`flex items-center gap-1 text-[10px] font-semibold shrink-0 ${
                          member.riskTier === 'critical' ? 'text-red-500' :
                          member.riskTier === 'high' ? 'text-orange-500' :
                          member.riskTier === 'healthy' ? 'text-emerald-500' : 'text-yellow-500'
                        }`}>
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                          {member.riskTier.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button className="p-2 text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Actions for ${member.firstName} ${member.lastName}`}>
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
            {data?.members.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No members found matching your search.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold">Member</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Membership</th>
                  <th className="px-6 py-4 font-semibold">Risk Tier</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.members.map((member, i) => (
                  <motion.tr 
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-full overflow-hidden flex items-center justify-center">
                          {member.profileImageUrl ? (
                            <img src={member.profileImageUrl} alt={member.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{member.firstName} {member.lastName}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        member.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        member.status === 'inactive' ? 'bg-muted text-muted-foreground border-border' :
                        member.status === 'hold' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {member.membershipType || "None"}
                    </td>
                    <td className="px-6 py-4">
                       {member.riskTier ? (
                         <span className={`flex items-center gap-1.5 text-xs font-semibold ${
                            member.riskTier === 'critical' ? 'text-red-500' :
                            member.riskTier === 'high' ? 'text-orange-500' :
                            member.riskTier === 'healthy' ? 'text-emerald-500' : 'text-yellow-500'
                         }`}>
                           <div className={`h-2 w-2 rounded-full bg-current`} />
                           {member.riskTier.toUpperCase()}
                         </span>
                       ) : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100" aria-label={`Actions for ${member.firstName} ${member.lastName}`}>
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {data?.members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No members found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="p-3 md:p-4 border-t border-border bg-muted/10 text-xs text-muted-foreground flex justify-between items-center shrink-0">
            <span>Showing {data.members.length} of {data.total} members</span>
          </div>
        )}
      </div>
    </div>
  );
}
