import React from "react";
import { useGym } from "@/store/GymContext";
import { useListMembershipPlans, useListSubscriptions } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Loader2, CreditCard, DollarSign, Users, TrendingUp } from "lucide-react";

export function Billing() {
  const { activeGymId } = useGym();

  const { data: plans, isLoading: plansLoading } = useListMembershipPlans(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: subscriptions, isLoading: subsLoading } = useListSubscriptions(activeGymId as number, {}, {
    query: { enabled: !!activeGymId }
  });

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view billing.</p>
      </div>
    );
  }

  const isLoading = plansLoading || subsLoading;

  const activeSubs = subscriptions?.filter((s: any) => s.status === "active") ?? [];
  const mrr = activeSubs.reduce((sum: number, s: any) => sum + (typeof s.amount === 'number' ? s.amount : parseFloat(s.amount || '0')), 0);
  const arr = mrr * 12;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Billing</h1>
        </div>
        <p className="text-muted-foreground mt-1">Plans, subscriptions, and revenue.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</span>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">${mrr.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">ARR: ${arr.toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Active Subscriptions</span>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{activeSubs.length}</p>
          <p className="text-xs text-muted-foreground mt-1">of {subscriptions?.length ?? 0} total</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Avg Revenue/Member</span>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">${activeSubs.length > 0 ? Math.round(mrr / activeSubs.length) : 0}</p>
          <p className="text-xs text-muted-foreground mt-1">per month</p>
        </motion.div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Membership Plans</h3>
          <p className="text-sm text-muted-foreground">Active plans and member counts.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Plan Name</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Interval</th>
                <th className="px-6 py-4 font-semibold">Active Members</th>
                <th className="px-6 py-4 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans?.map((plan: any, i: number) => (
                <motion.tr
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-foreground">{plan.name}</td>
                  <td className="px-6 py-4 text-foreground">${plan.price}</td>
                  <td className="px-6 py-4 text-muted-foreground capitalize">{plan.interval || "monthly"}</td>
                  <td className="px-6 py-4 text-foreground">{plan.memberCount}</td>
                  <td className="px-6 py-4 text-foreground font-medium">${(plan.memberCount * plan.price).toLocaleString()}</td>
                </motion.tr>
              ))}
              {(!plans || plans.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No plans configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Member</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscriptions?.slice(0, 20).map((sub: any, i: number) => (
                <motion.tr
                  key={sub.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-foreground">{sub.memberName}</td>
                  <td className="px-6 py-4 text-muted-foreground">{sub.planName}</td>
                  <td className="px-6 py-4 text-foreground">${typeof sub.amount === 'number' ? sub.amount : parseFloat(sub.amount || '0')}/mo</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      sub.status === 'past_due' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      'bg-muted text-muted-foreground border-border'
                    }`}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
