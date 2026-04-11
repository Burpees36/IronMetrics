import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Dumbbell, Send } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface FormConfig {
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
}

interface GymInfo {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  formConfig: FormConfig;
}

export function LeadCapture() {
  const params = useParams<{ gymSlug: string }>();
  const gymSlug = params.gymSlug;

  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    if (!gymSlug) return;
    fetch(`${API_BASE}/api/lead-capture/${gymSlug}/info`)
      .then((r) => {
        if (r.status === 403) { setDisabled(true); setLoading(false); return null; }
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        if (data) { setGymInfo(data); setLoading(false); }
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [gymSlug]);

  const fc = gymInfo?.formConfig;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/lead-capture/${gymSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          notes: form.notes.trim() || undefined,
          consentGiven: fc?.showConsent ? consentGiven : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Unable to submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (notFound || disabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">
            {disabled ? "Form Unavailable" : "Gym Not Found"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {disabled
              ? "This form is currently not accepting submissions."
              : "This gym link doesn't seem to be active."}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">You're In!</h1>
          <p className="text-muted-foreground">
            {fc?.successMessage || `Thanks for your interest in ${gymInfo?.name}. We'll be in touch soon to get you started.`}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          {gymInfo?.logoUrl ? (
            <img src={gymInfo.logoUrl} alt={gymInfo.name} className="h-16 w-auto mx-auto mb-4 rounded-lg" />
          ) : (
            <div className="mx-auto w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{gymInfo?.name}</h1>
          {gymInfo?.description && (
            <p className="text-muted-foreground mt-2 text-sm md:text-base">{gymInfo.description}</p>
          )}
          <p className="text-primary font-medium mt-3 text-sm">
            {fc?.headline || "Start your fitness journey today"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {fc?.ctaButtonText ? `${fc.ctaButtonText}` : "Get Started"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {fc?.subheadline || "Fill out the form below and we'll reach out to schedule your first visit."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">First Name *</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Last Name *</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="john@example.com"
              />
            </div>

            {(fc?.showPhone ?? true) && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Phone{fc?.phoneRequired ? " *" : ""}
                </label>
                <input
                  type="tel"
                  required={fc?.phoneRequired}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="(555) 123-4567"
                />
              </div>
            )}

            {(fc?.showInterests ?? true) && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">What are you interested in?</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  placeholder="CrossFit, personal training, group classes..."
                />
              </div>
            )}

            {fc?.showConsent && (
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  required
                />
                <span className="text-xs text-muted-foreground">
                  {fc.consentText || "I agree to receive communications from this gym."}
                </span>
              </label>
            )}

            {fc?.disclaimerText && (
              <p className="text-xs text-muted-foreground/70">{fc.disclaimerText}</p>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {fc?.ctaButtonText || "Get Started"}
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          {(fc?.showAddress ?? true) && gymInfo?.address && gymInfo?.city && gymInfo?.state && (
            <p>{gymInfo.address}, {gymInfo.city}, {gymInfo.state}</p>
          )}
          {gymInfo?.phone && <p className="mt-1">{gymInfo.phone}</p>}
          <p className="mt-2 opacity-60">Powered by ForgeOS</p>
        </div>
      </motion.div>
    </div>
  );
}
