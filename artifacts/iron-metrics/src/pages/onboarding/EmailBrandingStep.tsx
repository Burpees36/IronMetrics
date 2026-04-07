import React, { useState, useEffect } from "react";
import { Loader2, Mail, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { StepCard } from "./StepCard";
import { apiFetch } from "./types";
import type { StepProps } from "./types";

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
            <p className="text-xs text-muted-foreground">Must be a verified domain on your email provider.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          {isConfigured ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Email sender configured
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              No email sender configured yet
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
