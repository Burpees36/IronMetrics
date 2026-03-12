import React from "react";
import { motion } from "framer-motion";
import { CreditCard, Receipt, ArrowUpRight, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BillingSettings() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Current Plan</h3>
            </div>
            <p className="text-sm text-muted-foreground">Your subscription and billing details.</p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Pro</Badge>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-background">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
            <p className="text-sm font-semibold text-emerald-500">Active</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Billing Cycle</p>
            <p className="text-sm font-semibold text-foreground">Monthly</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next Renewal</p>
            <p className="text-sm font-semibold text-foreground">—</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors text-sm font-medium">
            <ArrowUpRight className="h-4 w-4" />
            Manage Subscription
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Payment Method</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Manage how you pay for your subscription.</p>
        <div className="p-4 rounded-xl border border-dashed border-border bg-background text-center">
          <p className="text-sm text-muted-foreground">Payment method management will be available through Stripe integration.</p>
          <button className="mt-3 text-sm text-primary hover:underline">Set Up Payment Method</button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Billing History</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">View past invoices and receipts.</p>
        <div className="p-6 rounded-xl border border-dashed border-border bg-background text-center">
          <p className="text-sm text-muted-foreground">No billing history available yet.</p>
        </div>
      </motion.div>
    </div>
  );
}
