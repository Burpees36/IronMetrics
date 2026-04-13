import React from "react";
import { useUser } from "@clerk/react";
import { motion } from "framer-motion";
import { Shield, Key, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SecuritySettings() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Account Information</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Your login identity and session details.</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
            <div>
              <p className="text-sm font-medium">Display Name</p>
              <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || "—"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
            <div>
              <p className="text-sm font-medium">Auth Provider</p>
              <p className="text-sm text-muted-foreground">Clerk (Email / Social Login)</p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Connected</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
            <div>
              <p className="text-sm font-medium">Session Status</p>
              <p className="text-sm text-muted-foreground">You are currently signed in.</p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Access Controls</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Security policies for your gym.</p>

        <div className="space-y-3">
          {[
            { label: "Staff invitations", desc: "Only owners and admins can invite new staff members.", icon: Key },
            { label: "Billing access", desc: "Only gym owners can manage billing and subscription settings.", icon: Shield },
            { label: "Ownership transfer", desc: "Ownership can only be transferred by the current owner.", icon: User },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background">
              <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Add an extra layer of security to your account.</p>
        <div className="p-4 rounded-xl border border-dashed border-border bg-background text-center">
          <p className="text-sm text-muted-foreground">2FA can be managed through your Clerk account settings.</p>
        </div>
      </motion.div>
    </div>
  );
}
