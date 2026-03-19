import { useState, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Copy, ExternalLink, Check, Loader2, Settings2,
  ToggleLeft, ToggleRight, Eye, Users, TrendingUp, ArrowLeft,
  Sparkles, Share2, Palette, BarChart3, HelpCircle, X, Smartphone
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

function GettingStartedGuide({ publicUrl, onCopy, copied, onPreview, onDismiss }: {
  publicUrl: string;
  onCopy: () => void;
  copied: boolean;
  onPreview: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-gradient-to-br from-emerald-500/10 via-card to-primary/5 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden"
    >
      <button onClick={onDismiss} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 bg-emerald-500/15 rounded-lg flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-emerald-500" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Your Lead Capture Form is Ready</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        We've created a branded signup page for your gym. Share the link anywhere — your website, social media, QR codes at the front desk — and new leads flow directly into your pipeline.
      </p>

      <div className="grid gap-4">
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-foreground">Share your unique link</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">This URL was created just for your gym. Copy it and put it anywhere prospects can find it.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-foreground bg-muted/30 px-3 py-1.5 rounded-lg truncate">
                {publicUrl}
              </code>
              <button
                onClick={onCopy}
                className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-foreground">Customize the experience</p>
            <p className="text-xs text-muted-foreground mt-0.5">Use the <span className="font-medium text-foreground">Form Setup</span> tab below to change the headline, button text, and which fields appear. Your changes go live instantly.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Watch leads roll in</p>
            <p className="text-xs text-muted-foreground mt-0.5">Every submission appears here and in your Leads pipeline automatically. No manual entry needed.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/50">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <Eye className="h-4 w-4" />
          Preview Form
        </button>
        <button
          onClick={onCopy}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          {copied ? "Link Copied!" : "Copy Share Link"}
        </button>
      </div>
    </motion.div>
  );
}

function TabHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-muted/20 rounded-lg px-3 py-2.5 mb-4">
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function FormPreviewModal({ publicUrl, onClose }: { publicUrl: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Form Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={publicUrl}
            className="w-full border-0"
            style={{ height: "70vh" }}
            title="Lead Capture Form Preview"
          />
        </div>
      </motion.div>
    </motion.div>
  );
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
  const [showGuide, setShowGuide] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!activeGymId) return;
    Promise.all([
      fetch(`${API_BASE}/api/gyms/${activeGymId}/lead-capture-config`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/gyms/${activeGymId}/lead-capture-analytics`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([cfg, ana]) => {
      if (cfg) setConfig(cfg);
      if (ana) {
        setAnalytics(ana);
        if (ana.total > 5) setShowGuide(false);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeGymId]);

  const publicUrl = config?.slug
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/join/${config.slug}`
    : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
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
      toast({ title: updated.isEnabled ? "Form is now live" : "Form disabled" });
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
    { key: "form" as const, label: "Form Setup", icon: Palette },
    { key: "settings" as const, label: "Attribution", icon: TrendingUp },
  ];

  const isFirstTime = analytics ? analytics.total === 0 : true;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="h-9 w-9 bg-emerald-500/15 rounded-xl flex items-center justify-center">
          <Globe className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Lead Capture Form</h2>
          <p className="text-xs text-muted-foreground">Collect new leads from a shareable signup page</p>
        </div>
        <div className="flex items-center gap-2">
          {publicUrl && (
            <button
              onClick={() => setShowPreview(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          )}
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
      </div>

      <AnimatePresence>
        {showGuide && publicUrl && (
          <GettingStartedGuide
            publicUrl={publicUrl}
            onCopy={copyUrl}
            copied={copied}
            onPreview={() => setShowPreview(true)}
            onDismiss={() => setShowGuide(false)}
          />
        )}
      </AnimatePresence>

      {!showGuide && publicUrl && (
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-emerald-500/10 rounded-md flex items-center justify-center shrink-0">
              <Share2 className="h-3 w-3 text-emerald-500" />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">Your form link</span>
            <code className="flex-1 text-xs text-foreground bg-muted/30 px-2.5 py-1.5 rounded-md truncate">
              {publicUrl}
            </code>
            <button
              onClick={copyUrl}
              className="p-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors shrink-0"
              title="Copy URL"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="p-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors shrink-0"
              title="Preview form"
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors shrink-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        </div>
      )}

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Leads", value: analytics.total, color: "text-foreground" },
            { label: "Last 7 Days", value: analytics.last7Days, color: analytics.last7Days > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground" },
            { label: "Last 30 Days", value: analytics.last30Days, color: analytics.last30Days > 0 ? "text-blue-600 dark:text-blue-400" : "text-foreground" },
            { label: "Converted", value: analytics.converted, color: analytics.converted > 0 ? "text-primary" : "text-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
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
            <TabHint>
              This tab shows submissions that came through your lead capture form. Each person who fills out the form is automatically added to your Leads pipeline where you can track and follow up with them.
            </TabHint>
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
                <p className="text-sm font-medium text-foreground mb-1">No submissions yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Once you share your form link, submissions will appear here automatically.
                  {!showGuide && " Scroll up to copy your share link."}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "form" && config && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <TabHint>
              Customize how your signup page looks and what information you collect. Changes are saved when you click "Save Changes" and update the live form immediately. Use the Preview button above to see your changes.
            </TabHint>
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Page Copy</h3>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Headline</label>
                <input
                  value={config.headline || ""}
                  onChange={(e) => setConfig({ ...config, headline: e.target.value || null })}
                  placeholder="Start your fitness journey today"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Shown prominently at the top of your form</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Subheadline</label>
                <input
                  value={config.subheadline || ""}
                  onChange={(e) => setConfig({ ...config, subheadline: e.target.value || null })}
                  placeholder="Fill out the form below and we'll reach out..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Appears below the form title to set expectations</p>
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
                <p className="text-[10px] text-muted-foreground mt-1">What the prospect sees after submitting</p>
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
              <div>
                <h3 className="text-sm font-medium text-foreground">Fields & Options</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Choose what information to collect. Name and email are always required.</p>
              </div>
              {[
                { key: "showPhone" as const, label: "Phone number field", desc: "Let prospects share their phone number" },
                { key: "phoneRequired" as const, label: "Require phone number", desc: "Make phone mandatory to submit" },
                { key: "showInterests" as const, label: "Interests / goals field", desc: "Free-text field for what they're looking for" },
                { key: "showAddress" as const, label: "Show gym address", desc: "Display your gym's address on the form page" },
                { key: "showConsent" as const, label: "Consent checkbox", desc: "Require opt-in before submitting" },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-sm text-foreground">{label}</span>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, [key]: !config[key] })}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ml-3 ${
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
            <TabHint>
              Attribution helps you track where leads come from. These settings tag every form submission so you can measure which channels drive the most signups. This is especially useful if you use different campaign tags for different promotions.
            </TabHint>
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
                <p className="text-[10px] text-muted-foreground mt-1">Tags where this lead came from (e.g. "website", "instagram", "flyer")</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Campaign Tag</label>
                <input
                  value={config.campaignTag || ""}
                  onChange={(e) => setConfig({ ...config, campaignTag: e.target.value || null })}
                  placeholder="spring-2026-promo"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Optional tag to group leads from a specific campaign or promotion</p>
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
                <p className="text-[10px] text-muted-foreground mt-1">Which pipeline stage new form submissions land in</p>
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

      <AnimatePresence>
        {showPreview && publicUrl && (
          <FormPreviewModal publicUrl={publicUrl} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
