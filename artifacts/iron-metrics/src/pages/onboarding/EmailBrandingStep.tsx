import React, { useState, useEffect, useMemo } from "react";
import { Loader2, Mail, CheckCircle2, AlertCircle, ChevronRight, ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { StepCard } from "./StepCard";
import { apiFetch } from "./types";
import type { StepProps } from "./types";

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

export function EmailBrandingStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ fromName: "", fromEmail: "" });

  useEffect(() => {
    apiFetch(`/api/gyms/${gymId}`).then((data) => {
      setForm({
        fromName: data.fromName || data.name || "",
        fromEmail: data.fromEmail || "",
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gymId]);

  const domainWarning = useMemo(() => getDomainWarning(form.fromEmail), [form.fromEmail]);

  const handleSave = async () => {
    if (form.fromEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.fromEmail)) {
        toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fromName: form.fromName || null,
          fromEmail: form.fromEmail || null,
        }),
      });
      toast({ title: "Email settings saved" });
      onComplete();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  const isConfigured = !!form.fromEmail;

  return (
    <StepCard
      title="Email Branding"
      description="Configure how outbound emails appear to your members. The AI Operator and automations will use these settings."
      onSkip={onSkip}
      onBack={onBack}
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Why does this matter?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Emails sent from unverified domains often land in spam. To make sure your members actually receive emails, use a domain you own and verify it with your email provider.
                If you skip this step, emails will be sent from a default ForgeOS address.
              </p>
              <a
                href="https://resend.com/docs/dashboard/domains/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2 font-medium"
              >
                How to verify your domain <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="onb-fromName">From Name</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="onb-fromName"
                className="pl-10"
                value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                placeholder='e.g. "Coach Mike" or "Iron Haven CrossFit"'
              />
            </div>
            <p className="text-xs text-muted-foreground">The name members will see in their inbox.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-fromEmail">From Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="onb-fromEmail"
                type="email"
                className="pl-10"
                value={form.fromEmail}
                onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                placeholder="e.g. mike@ironhavencrossfit.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">Use a domain you own and have verified with your email provider.</p>
          </div>
        </div>

        {domainWarning && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400">{domainWarning}</p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          {isConfigured && !domainWarning ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Email sender configured
            </span>
          ) : isConfigured && domainWarning ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-500">
              <AlertCircle className="h-3.5 w-3.5" />
              Email sender set — verify your domain for best delivery
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              No custom sender — emails will come from ForgeOS
            </span>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save & Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </StepCard>
  );
}
