import { useState, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Copy, ExternalLink, Check, Loader2, Settings2,
  ToggleLeft, ToggleRight, Eye, Users, TrendingUp, ArrowLeft
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface LeadCaptureConfig {
  gymId: number;
  isEnabled: boolean;
  headline: string | null;
  subheadline: string | null;
  ctaButtonText: string | null;
  successMessage: string | null;
  disclaimerText: string | null;
  showPhone: boolean;
  showAddress: boolean;
  phoneRequired: boolean;
  showInterests: boolean;
  showConsent: boolean;
  consentText: string | null;
  sourceLabel: string;
  campaignTag: string | null;
  defaultStage: string;
  autoAssignStaffId: number | null;
  slug: string | null;
}

interface Analytics {
  total: number;
  last7Days: number;
  last30Days: number;
  converted: number;
  recentLeads: Array<{ id: number; firstName: string; lastName: string; email: string; stage: string; createdAt: string }>;
}

export function LeadCaptureSettings({ onClose }: { onClose: () => void }) {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LeadCaptureConfig | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "form" | "settings">("overview");

  useEffect(() => {
    if (!activeGymId) return;
    Promise.all([
      fetch(`${API_BASE}/api/gyms/${activeGymId}/lead-capture-config`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/gyms/${activeGymId}/lead-capture-analytics`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([cfg, ana]) => {
      if (cfg) setConfig(cfg);
      if (ana) setAnalytics(ana);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeGymId]);

  const publicUrl = config?.slug
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/join/${config.slug}`
    : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!activeGymId || !config) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/gyms/${activeGymId}/lead-capture-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        toast({ title: "Settings saved" });
      } else {
        toast({ title: "Error", description: "Failed to save settings" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    if (!config) return;
    const updated = { ...config, isEnabled: !config.isEnabled };
    setConfig(updated);
    if (!activeGymId) return;
    try {
      await fetch(`${API_BASE}/api/gyms/${activeGymId}/lead-capture-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updated),
      });
      toast({ title: updated.isEnabled ? "Form enabled" : "Form disabled" });
    } catch {
      toast({ title: "Error", description: "Failed to update" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Eye },
    { key: "form" as const, label: "Form Setup", icon: Settings2 },
    { key: "settings" as const, label: "Attribution", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="h-9 w-9 bg-emerald-500/15 rounded-xl flex items-center justify-center">
          <Globe className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Lead Capture Form</h2>
          <p className="text-xs text-muted-foreground">Manage your public signup form</p>
        </div>
        <button
          onClick={toggleEnabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            config?.isEnabled
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted/30 text-muted-foreground"
          }`}
        >
          {config?.isEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          {config?.isEnabled ? "Live" : "Disabled"}
        </button>
      </div>

      {publicUrl && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-2">Public Form URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-foreground bg-muted/30 px-3 py-2 rounded-lg truncate">
              {publicUrl}
            </code>
            <button
              onClick={copyUrl}
              className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              title="Copy URL"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </div>
      )}

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Submissions", value: analytics.total },
            { label: "Last 7 Days", value: analytics.last7Days },
            { label: "Last 30 Days", value: analytics.last30Days },
            { label: "Converted", value: analytics.converted },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-muted/20 p-1 rounded-lg">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {analytics && analytics.recentLeads.length > 0 ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-medium text-foreground">Recent Form Submissions</h3>
                </div>
                <div className="divide-y divide-border">
                  {analytics.recentLeads.map(lead => (
                    <div key={lead.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{lead.firstName} {lead.lastName}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          lead.stage === "new" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                          lead.stage === "converted" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                          "bg-muted/30 text-muted-foreground"
                        }`}>{lead.stage}</span>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No form submissions yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Share your form URL to start collecting leads.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "form" && config && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Form Copy</h3>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Headline</label>
                <input
                  value={config.headline || ""}
                  onChange={(e) => setConfig({ ...config, headline: e.target.value || null })}
                  placeholder="Start your fitness journey today"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Subheadline</label>
                <input
                  value={config.subheadline || ""}
                  onChange={(e) => setConfig({ ...config, subheadline: e.target.value || null })}
                  placeholder="Fill out the form below and we'll reach out..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Button Text</label>
                <input
                  value={config.ctaButtonText || ""}
                  onChange={(e) => setConfig({ ...config, ctaButtonText: e.target.value || null })}
                  placeholder="Get Started"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Success Message</label>
                <input
                  value={config.successMessage || ""}
                  onChange={(e) => setConfig({ ...config, successMessage: e.target.value || null })}
                  placeholder="Thank you! We'll be in touch soon."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Disclaimer Text</label>
                <textarea
                  value={config.disclaimerText || ""}
                  onChange={(e) => setConfig({ ...config, disclaimerText: e.target.value || null })}
                  placeholder="By submitting this form, you agree to be contacted..."
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">Field Visibility</h3>
              {[
                { key: "showPhone" as const, label: "Phone field" },
                { key: "phoneRequired" as const, label: "Phone required" },
                { key: "showInterests" as const, label: "Interests / goals field" },
                { key: "showAddress" as const, label: "Show gym address" },
                { key: "showConsent" as const, label: "Consent checkbox" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{label}</span>
                  <button
                    onClick={() => setConfig({ ...config, [key]: !config[key] })}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      config[key] ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      config[key] ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </label>
              ))}
              {config.showConsent && (
                <div className="pt-2">
                  <label className="block text-xs text-muted-foreground mb-1">Consent text</label>
                  <input
                    value={config.consentText || ""}
                    onChange={(e) => setConfig({ ...config, consentText: e.target.value || null })}
                    placeholder="I agree to receive communications..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </motion.div>
        )}

        {activeTab === "settings" && config && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Attribution & Defaults</h3>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Source Label</label>
                <input
                  value={config.sourceLabel}
                  onChange={(e) => setConfig({ ...config, sourceLabel: e.target.value || "website" })}
                  placeholder="website"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Campaign Tag</label>
                <input
                  value={config.campaignTag || ""}
                  onChange={(e) => setConfig({ ...config, campaignTag: e.target.value || null })}
                  placeholder="spring-2026-promo"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Default Pipeline Stage</label>
                <select
                  value={config.defaultStage}
                  onChange={(e) => setConfig({ ...config, defaultStage: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
