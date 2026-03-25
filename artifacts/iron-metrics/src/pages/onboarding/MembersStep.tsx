import React, { useState, useEffect } from "react";
import { Loader2, UserPlus, Upload, Check, ChevronRight, Zap, RefreshCw, CheckCircle2, XCircle, Users, AlertCircle, ExternalLink, Key, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImportMembersDialog } from "@/components/members/ImportMembersDialog";
import { StepCard } from "./StepCard";
import { apiFetch } from "./types";
import type { StepProps } from "./types";
import { motion, AnimatePresence } from "framer-motion";

type WodifyState = "idle" | "entering-key" | "validating" | "validated" | "syncing" | "complete" | "error";

export function MembersStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [hasWodifyApiKey, setHasWodifyApiKey] = useState(false);
  const [wodifyState, setWodifyState] = useState<WodifyState>("idle");
  const [wodifyApiKey, setWodifyApiKey] = useState("");
  const [wodifyError, setWodifyError] = useState("");
  const [wodifyClientCount, setWodifyClientCount] = useState(0);
  const [wodifySyncResult, setWodifySyncResult] = useState<{
    created: number; updated: number; totalClients: number; errored: number;
  } | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", status: "active",
  });

  const fetchMembers = async () => {
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/members?limit=1`);
      setMemberCount(Array.isArray(data) ? data.length : data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [gymId]);

  useEffect(() => {
    apiFetch(`/api/gyms/${gymId}/integrations/wodify/sync-status`)
      .then(data => setHasWodifyApiKey(!!data.hasApiKey))
      .catch(() => {});
  }, [gymId]);

  const handleValidateKey = async () => {
    if (!wodifyApiKey.trim()) return;
    setWodifyState("validating");
    setWodifyError("");
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/integrations/wodify/validate-key`, {
        method: "POST",
        body: JSON.stringify({ apiKey: wodifyApiKey.trim() }),
      });
      if (!data.valid) {
        setWodifyState("error");
        setWodifyError("Invalid API key. Please check and try again.");
        return;
      }
      setWodifyClientCount(data.clientCount || 0);
      setHasWodifyApiKey(true);
      setWodifyState("validated");
    } catch (err: any) {
      setWodifyState("error");
      setWodifyError(err.message || "Failed to validate API key");
    }
  };

  const handleWodifySync = async () => {
    setWodifyState("syncing");
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/integrations/wodify/sync`, {
        method: "POST",
      });
      setWodifySyncResult(data);
      setWodifyState("complete");
      await fetchMembers();
    } catch (err: any) {
      setWodifyState("error");
      setWodifyError(err.message || "Sync failed");
    }
  };

  const handleAddMember = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}/members`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          joinDate: new Date().toISOString().split("T")[0],
        }),
      });
      toast({ title: "Member added" });
      setShowAddForm(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", status: "active" });
      await fetchMembers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Add Your Members" description="Bring your member list into Iron Metrics. You can sync from Wodify, import from a CSV, or add members one at a time." onSkip={onSkip} onBack={onBack}>
      {memberCount > 0 && wodifyState !== "complete" && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 mb-6 flex items-center gap-4">
          <div className="h-10 w-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="font-medium text-green-400">Members found</p>
            <p className="text-sm text-muted-foreground">You already have members in the system.</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {wodifyState !== "idle" && wodifyState !== "complete" && (
          <motion.div key="wodify-flow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6">
            {wodifyState === "entering-key" || wodifyState === "error" ? (
              <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-foreground">Connect Wodify</h4>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Wodify API Key</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="password"
                        value={wodifyApiKey}
                        onChange={(e) => setWodifyApiKey(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleValidateKey()}
                        placeholder="Paste your API key"
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                        autoFocus
                      />
                    </div>
                    <Button onClick={handleValidateKey} disabled={!wodifyApiKey.trim()}>
                      Connect <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
                {wodifyError && (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-destructive font-medium">{wodifyError}</p>
                      <a href="https://help.wodify.com/docs/api-access" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1">
                        Where to find your API key <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
                <button onClick={() => { setWodifyState("idle"); setWodifyApiKey(""); setWodifyError(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            ) : wodifyState === "validating" ? (
              <div className="bg-background/30 rounded-xl p-8 border border-border flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm font-medium">Connecting to Wodify...</p>
              </div>
            ) : wodifyState === "validated" ? (
              <div className="bg-background/30 rounded-xl p-5 border border-border space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-400">Connected to Wodify</p>
                    <p className="text-xs text-muted-foreground">Found {wodifyClientCount} clients</p>
                  </div>
                </div>
                <Button onClick={handleWodifySync} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" /> Sync Members Now
                </Button>
              </div>
            ) : wodifyState === "syncing" ? (
              <div className="bg-background/30 rounded-xl p-8 border border-border flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-medium">Syncing your data from Wodify...</p>
                <p className="text-xs text-muted-foreground">This may take a minute for large gyms</p>
              </div>
            ) : null}
          </motion.div>
        )}

        {wodifyState === "complete" && wodifySyncResult && (
          <motion.div key="wodify-complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-400">Wodify Sync Complete</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{wodifySyncResult.created}</p>
                  <p className="text-[10px] text-muted-foreground">New Members</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{wodifySyncResult.updated}</p>
                  <p className="text-[10px] text-muted-foreground">Updated</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{wodifySyncResult.totalClients}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {memberCount === 0 && wodifyState === "idle" && !showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {hasWodifyApiKey ? (
            <button
              onClick={handleWodifySync}
              className="bg-gradient-to-br from-emerald-500/10 via-background/50 to-primary/5 border border-emerald-500/20 rounded-xl p-6 hover:border-emerald-500/40 transition-all text-left group"
            >
              <Zap className="h-8 w-8 text-emerald-400 mb-3" />
              <p className="font-medium text-foreground mb-1">Sync from Wodify</p>
              <p className="text-sm text-muted-foreground">Pull members directly from your connected Wodify account.</p>
            </button>
          ) : (
            <button
              onClick={() => setWodifyState("entering-key")}
              className="bg-gradient-to-br from-emerald-500/10 via-background/50 to-primary/5 border border-emerald-500/20 rounded-xl p-6 hover:border-emerald-500/40 transition-all text-left group"
            >
              <Zap className="h-8 w-8 text-emerald-400 mb-3" />
              <p className="font-medium text-foreground mb-1">Connect Wodify</p>
              <p className="text-sm text-muted-foreground">Sync members directly with your Wodify API key.</p>
            </button>
          )}
          <button
            onClick={() => setImportOpen(true)}
            className="bg-background/50 border border-border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
          >
            <Upload className="h-8 w-8 text-primary mb-3" />
            <p className="font-medium text-foreground mb-1">Import from CSV</p>
            <p className="text-sm text-muted-foreground">Upload a spreadsheet with your member list.</p>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-background/50 border border-border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
          >
            <UserPlus className="h-8 w-8 text-primary mb-3" />
            <p className="font-medium text-foreground mb-1">Add Manually</p>
            <p className="text-sm text-muted-foreground">Enter member details one at a time.</p>
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="John" />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@email.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Member
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        {(memberCount > 0 || wodifyState === "complete") && (
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <ImportMembersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => {
          fetchMembers();
        }}
      />
    </StepCard>
  );
}
