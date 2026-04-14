import React, { useState, useEffect, useMemo } from "react";
import { useGetGym, useUpdateGym, getGetGymQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Save, Mail, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KNOWN_FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "live.com", "msn.com", "me.com", "comcast.net", "att.net",
];

function getDomainWarning(email: string): string | null {
  if (!email) return null;
  const match = email.match(/@([^@\s]+)$/);
  if (!match) return null;
  const domain = match[1].toLowerCase();
  if (KNOWN_FREE_EMAIL_DOMAINS.includes(domain)) {
    return `Free email providers like ${domain} cannot be verified as a sending domain. Use a domain you own (e.g., you@yourbusiness.com) for reliable delivery.`;
  }
  return null;
}

interface Props {
  gymId: number;
}

export function EmailSettings({ gymId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: gym, isLoading } = useGetGym(gymId, { query: { enabled: !!gymId } });
  const updateMutation = useUpdateGym();

  const [form, setForm] = useState({ fromName: "", fromEmail: "" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (gym) {
      setForm({ fromName: gym.fromName || "", fromEmail: gym.fromEmail || "" });
      setDirty(false);
    }
  }, [gym]);

  const domainWarning = useMemo(() => getDomainWarning(form.fromEmail), [form.fromEmail]);

  const update = (field: string, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    if (form.fromEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.fromEmail)) {
        toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
        return;
      }
    }
    updateMutation.mutate(
      { gymId, data: { fromName: form.fromName || null, fromEmail: form.fromEmail || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(gymId) });
          toast({ title: "Email Settings Saved", description: "Your outbound email settings have been updated." });
          setDirty(false);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || error?.message || "Failed to save.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const isConfigured = !!form.fromEmail;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Outbound Email Identity</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Configure how outbound emails appear to your members. Emails sent from the AI Operator and automations will use these settings.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fromName">From Name</Label>
            <Input id="fromName" value={form.fromName} onChange={e => update("fromName", e.target.value)} placeholder='e.g. "Coach Mike" or "Iron Haven CrossFit"' />
            <p className="text-xs text-muted-foreground">The name members will see in their inbox.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromEmail">From Email</Label>
            <Input id="fromEmail" type="email" value={form.fromEmail} onChange={e => update("fromEmail", e.target.value)} placeholder="e.g. mike@ironhavencrossfit.com" />
            <p className="text-xs text-muted-foreground">
              Use a domain you own and have verified with your email provider.{" "}
              <a href="https://resend.com/docs/dashboard/domains/introduction" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:text-primary/80">
                Learn more <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </p>
          </div>
        </div>

        {domainWarning && (
          <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400">{domainWarning}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {isConfigured && !domainWarning ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Email sender configured
              </span>
            ) : isConfigured && domainWarning ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Verify your domain for best delivery
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                No custom sender — emails sent from ForgeOS
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || !dirty}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Email Settings
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-1">Notification Defaults</h3>
        <p className="text-sm text-muted-foreground mb-4">Default communication preferences for automations.</p>
        <div className="space-y-3">
          {[
            { label: "AI Operator outbound emails", desc: "Emails generated by the AI Operator for re-engagement, follow-ups, etc.", status: isConfigured },
            { label: "Staff invite notifications", desc: "Email sent when new staff are invited to the platform.", status: true },
            { label: "Billing notifications", desc: "Payment receipts and subscription updates.", status: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <span className={`text-xs font-medium ${item.status ? "text-emerald-500" : "text-muted-foreground"}`}>
                {item.status ? "Enabled" : "Not configured"}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
