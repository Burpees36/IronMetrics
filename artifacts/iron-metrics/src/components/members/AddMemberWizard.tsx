import React, { useState, useEffect, useCallback, useRef } from "react";
import { useGym } from "@/store/GymContext";
import {
  useCreateMember, useCheckMemberEmail, useListMembershipPlans,
  getListMembersQueryKey, useGetStripePublishableKey,
} from "@workspace/api-client-react";
import type { Member, MembershipPlan } from "@workspace/api-client-react";
import type { ApiError } from "@workspace/api-client-react/custom-fetch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User, Mail, Phone, Calendar, MapPin, Shield, Tag, FileCheck,
  ChevronRight, ChevronLeft, Check, Loader2, AlertTriangle,
  UserPlus, Eye, Plus, ClipboardList, CreditCard, DollarSign,
} from "lucide-react";
import { loadStripeJs } from "@/lib/stripe";

interface StripePaymentElementEvent {
  complete: boolean;
  error?: { message: string };
}

interface StripeSetupIntentResult {
  error?: { message: string };
  setupIntent?: {
    id: string;
    payment_method: string;
  };
}

interface StripePaymentElement {
  mount(el: HTMLElement): void;
  on(event: string, handler: (e: StripePaymentElementEvent) => void): void;
  unmount(): void;
}

interface StripeElements {
  create(type: string, options?: Record<string, unknown>): StripePaymentElement;
  getElement(type: string): StripePaymentElement | null;
}

interface StripeInstance {
  elements(options: Record<string, unknown>): StripeElements;
  confirmSetup(options: Record<string, unknown>): Promise<StripeSetupIntentResult>;
}

type WizardStep = "personal" | "contact" | "membership" | "payment" | "review";
const STEPS: WizardStep[] = ["personal", "contact", "membership", "payment", "review"];
const STEP_LABELS: Record<WizardStep, string> = {
  personal: "Personal Info",
  contact: "Contact & Emergency",
  membership: "Membership",
  payment: "Payment",
  review: "Review & Confirm",
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY"
];

const initialForm = {
  firstName: "", lastName: "", email: "", phone: "",
  birthDate: "", address: "", city: "", state: "",
  emergencyContactName: "", emergencyContactPhone: "",
  membershipType: "", waiverSigned: false, tags: "",
};

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground font-medium">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{error}</p>}
    </div>
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${highlight ? "text-amber-400" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function formatPrice(price: number, interval: string): string {
  const formatted = `$${price.toFixed(2)}`;
  const intervalLabel = interval === "monthly" ? "/mo" : interval === "quarterly" ? "/qtr" : interval === "annual" ? "/yr" : `/${interval}`;
  return `${formatted}${intervalLabel}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BASE_URL = import.meta.env.BASE_URL || "/";
const API_BASE = `${BASE_URL}api`.replace(/\/\//g, "/");

export function AddMemberWizard({ open, onOpenChange }: Props) {
  const { activeGymId } = useGym();
  const gymId = activeGymId as number;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<WizardStep>("personal");
  const [form, setForm] = useState({ ...initialForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdMemberId, setCreatedMemberId] = useState<number | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [skipPayment, setSkipPayment] = useState(false);

  const [stripeInstance, setStripeInstance] = useState<StripeInstance | null>(null);
  const [stripeElements, setStripeElements] = useState<StripeElements | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [paymentReady, setPaymentReady] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [confirmedSetupIntentId, setConfirmedSetupIntentId] = useState<string | null>(null);
  const [cardSummary, setCardSummary] = useState<{ brand: string; last4: string } | null>(null);
  const cardMountRef = useRef<HTMLDivElement>(null);
  const cardMountedRef = useRef(false);

  const createMutation = useCreateMember();

  const emailCheckEnabled = !!gymId && debouncedEmail.length > 3 && debouncedEmail.includes("@");
  const { data: emailCheck } = useCheckMemberEmail(gymId, { email: debouncedEmail }, {
    query: { enabled: emailCheckEnabled },
  });

  const { data: plans } = useListMembershipPlans(gymId, {
    query: { enabled: !!gymId },
  });

  const { data: stripeKeyData } = useGetStripePublishableKey(gymId, {
    query: { enabled: !!gymId },
  });

  const activePlans = (plans || []).filter((p: MembershipPlan) => p.isActive);
  const selectedPlan = activePlans.find((p: MembershipPlan) => p.id === selectedPlanId) || null;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.email.trim().includes("@")) {
        setDebouncedEmail(form.email.trim().toLowerCase());
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.email]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("personal");
        setForm({ ...initialForm });
        setErrors({});
        setDebouncedEmail("");
        setShowSuccess(false);
        setCreatedMemberId(null);
        setSelectedPlanId(null);
        setSkipPayment(false);
        setStripeInstance(null);
        setStripeElements(null);
        setStripeClientSecret("");
        setStripeCustomerId("");
        setPaymentReady(false);
        setStripeLoading(false);
        setStripeError("");
        setCardComplete(false);
        setConfirmedSetupIntentId(null);
        setCardSummary(null);
        setSubscriptionError(null);
        cardMountedRef.current = false;
      }, 200);
    }
  }, [open]);

  const updateField = useCallback((field: string, value: string | boolean) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }, []);

  const activeSteps = selectedPlanId && !skipPayment
    ? STEPS
    : STEPS.filter(s => s !== "payment");

  const validateStep = (s: WizardStep): boolean => {
    const e: Record<string, string> = {};
    if (s === "personal") {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.lastName.trim()) e.lastName = "Last name is required";
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Invalid email format";
      if (emailCheck?.exists) e.email = `Already in use by ${emailCheck.memberName}`;
    }
    if (s === "payment") {
      if (!skipPayment && !confirmedSetupIntentId && !cardComplete) {
        e.payment = "Please enter card details";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const initStripePayment = useCallback(async () => {
    if (stripeInstance || stripeLoading || !stripeKeyData?.publishableKey) return;
    setStripeLoading(true);
    setStripeError("");

    try {
      const stripeRaw = await loadStripeJs(stripeKeyData.publishableKey);
      if (!stripeRaw) {
        setStripeError("Failed to load payment system.");
        setStripeLoading(false);
        return;
      }
      const stripe = stripeRaw as StripeInstance;
      setStripeInstance(stripe);

      const res = await fetch(`${API_BASE}/gyms/${gymId}/onboarding/setup-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStripeError(data.error || "Failed to initialize payment.");
        setStripeLoading(false);
        return;
      }

      const data = await res.json();
      setStripeClientSecret(data.clientSecret);
      setStripeCustomerId(data.customerId);

      const elements = stripe.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#FBBF24",
            colorBackground: "hsl(220, 20%, 12%)",
            colorText: "#e4e4e7",
            colorDanger: "#ef4444",
            borderRadius: "8px",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
        },
      });

      const cardElement = elements.create("payment", { layout: "tabs" });
      setStripeElements(elements);
      setPaymentReady(true);
      setStripeLoading(false);

      requestAnimationFrame(() => {
        if (cardMountRef.current && !cardMountedRef.current) {
          cardElement.mount(cardMountRef.current);
          cardMountedRef.current = true;
          cardElement.on("change", (event: StripePaymentElementEvent) => {
            setCardComplete(event.complete);
            if (event.error) {
              setStripeError(event.error.message);
            } else {
              setStripeError("");
            }
          });
        }
      });
    } catch (err: unknown) {
      setStripeError(err instanceof Error ? err.message : "Failed to initialize payment.");
      setStripeLoading(false);
    }
  }, [stripeInstance, stripeLoading, stripeKeyData, gymId, form.email, form.firstName, form.lastName]);

  useEffect(() => {
    if (step === "payment" && selectedPlanId && !skipPayment && !stripeInstance) {
      initStripePayment();
    }
  }, [step, selectedPlanId, skipPayment, stripeInstance, initStripePayment]);

  useEffect(() => {
    if (step === "payment" && paymentReady && stripeElements && cardMountRef.current && !cardMountedRef.current) {
      const paymentElement = stripeElements.getElement("payment");
      if (paymentElement) {
        paymentElement.mount(cardMountRef.current);
        cardMountedRef.current = true;
      }
    }
  }, [step, paymentReady, stripeElements]);

  const goNext = async () => {
    if (!validateStep(step)) return;

    const idx = activeSteps.indexOf(step);
    if (idx < activeSteps.length - 1) {
      const nextStep = activeSteps[idx + 1];
      if (nextStep === "review" && step === "payment" && !skipPayment && !confirmedSetupIntentId) {
        if (!stripeInstance || !stripeElements) {
          setStripeError("Payment system not ready. Please wait.");
          return;
        }
        setStripeLoading(true);
        try {
          const { error: stripeErr, setupIntent } = await stripeInstance.confirmSetup({
            elements: stripeElements,
            redirect: "if_required",
          });
          if (stripeErr) {
            setStripeError(stripeErr.message || "Payment verification failed.");
            setStripeLoading(false);
            return;
          }
          if (setupIntent?.id) {
            setConfirmedSetupIntentId(setupIntent.id);
            if (setupIntent.payment_method) {
              try {
                const pmRes = await fetch(`${API_BASE}/gyms/${gymId}/payment-methods/${setupIntent.payment_method}`);
                if (pmRes.ok) {
                  const pmData = await pmRes.json() as { brand?: string; last4?: string };
                  if (pmData.brand && pmData.last4) {
                    setCardSummary({ brand: pmData.brand, last4: pmData.last4 });
                  }
                }
              } catch {
                setCardSummary({ brand: "card", last4: "****" });
              }
              setCardSummary(prev => prev || { brand: "card", last4: "****" });
            }
          }
          setStripeLoading(false);
        } catch (err: unknown) {
          setStripeError(err instanceof Error ? err.message : "Payment verification failed.");
          setStripeLoading(false);
          return;
        }
      }
      setStep(nextStep);
    }
  };

  const goBack = () => {
    const idx = activeSteps.indexOf(step);
    if (idx > 0) setStep(activeSteps[idx - 1]);
  };

  const handleSubmit = () => {
    if (!validateStep("personal")) { setStep("personal"); return; }

    createMutation.mutate({
      gymId,
      data: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        birthDate: form.birthDate || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        membershipType: selectedPlan?.name || null,
        waiverSigned: form.waiverSigned,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        planId: (selectedPlanId && !skipPayment) ? selectedPlanId : null,
        setupIntentId: (!skipPayment && confirmedSetupIntentId) ? confirmedSetupIntentId : null,
      },
    }, {
      onSuccess: (data: Member & { subscriptionError?: string }) => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(gymId) });
        setCreatedMemberId(data.id);
        if (data.subscriptionError) {
          setSubscriptionError(data.subscriptionError);
        }
        setShowSuccess(true);
      },
      onError: (err: ApiError) => {
        const errData = err.data as { error?: string; fieldErrors?: Record<string, string> } | null;
        const fieldErrors = errData?.fieldErrors;
        if (fieldErrors) {
          setErrors(fieldErrors);
          if (fieldErrors.firstName || fieldErrors.lastName || fieldErrors.email) setStep("personal");
        } else {
          toast({ title: "Error", description: errData?.error || "Failed to create member.", variant: "destructive" });
        }
      },
    });
  };

  const stepIndex = activeSteps.indexOf(step);

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-6 px-2"
          >
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">Member Added!</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-semibold text-foreground">{form.firstName} {form.lastName}</span> has been successfully added to your gym.
            </p>
            {selectedPlan && !subscriptionError && (
              <p className="text-xs text-emerald-500 mb-2 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Subscribed to {selectedPlan.name} ({formatPrice(selectedPlan.price, selectedPlan.billingInterval)})
              </p>
            )}
            {subscriptionError && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Member created but subscription setup needs attention: {subscriptionError}. You can set it up from their billing tab.</span>
              </div>
            )}
            <div className="flex gap-3 w-full mt-4">
              <button
                onClick={() => {
                  if (createdMemberId) setLocation(`/members/${createdMemberId}`);
                  onOpenChange(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Eye className="h-4 w-4" />
                View Profile
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setStep("personal");
                  setForm({ ...initialForm });
                  setErrors({});
                  setDebouncedEmail("");
                  setCreatedMemberId(null);
                  setSelectedPlanId(null);
                  setSkipPayment(false);
                  setStripeInstance(null);
                  setStripeElements(null);
                  setStripeClientSecret("");
                  setStripeCustomerId("");
                  setPaymentReady(false);
                  setStripeLoading(false);
                  setStripeError("");
                  setCardComplete(false);
                  setConfirmedSetupIntentId(null);
                  setCardSummary(null);
                  setSubscriptionError(null);
                  cardMountedRef.current = false;
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Another
              </button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Add New Member</h2>
              <p className="text-xs text-muted-foreground">Step {stepIndex + 1} of {activeSteps.length} — {STEP_LABELS[step]}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeSteps.map((s, i) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => {
                    if (i < stepIndex) setStep(s);
                    else if (i === stepIndex + 1 && validateStep(step)) setStep(s);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    i < stepIndex ? "text-emerald-500 bg-emerald-500/10" :
                    i === stepIndex ? "text-primary bg-primary/10" :
                    "text-muted-foreground"
                  }`}
                >
                  {i < stepIndex ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>{i + 1}</span>
                  )}
                  <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
                </button>
                {i < activeSteps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === "personal" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="First Name" required error={errors.firstName}>
                      <Input value={form.firstName} onChange={e => updateField("firstName", e.target.value)} placeholder="John" className="bg-background" />
                    </FormField>
                    <FormField label="Last Name" required error={errors.lastName}>
                      <Input value={form.lastName} onChange={e => updateField("lastName", e.target.value)} placeholder="Doe" className="bg-background" />
                    </FormField>
                  </div>
                  <FormField label="Email" required error={errors.email}>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={form.email}
                        onChange={e => updateField("email", e.target.value)}
                        placeholder="john@example.com"
                        className={`pl-10 bg-background ${emailCheck?.exists ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      />
                    </div>
                    {emailCheck?.exists && !errors.email && (
                      <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        Email already belongs to {emailCheck.memberName}
                      </p>
                    )}
                  </FormField>
                  <FormField label="Phone">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={form.phone} onChange={e => updateField("phone", e.target.value)} placeholder="+1 (555) 000-0000" className="pl-10 bg-background" />
                    </div>
                  </FormField>
                  <FormField label="Date of Birth">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="date" value={form.birthDate} onChange={e => updateField("birthDate", e.target.value)} className="pl-10 bg-background" />
                    </div>
                  </FormField>
                </div>
              )}

              {step === "contact" && (
                <div className="space-y-4">
                  <FormField label="Street Address">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={form.address} onChange={e => updateField("address", e.target.value)} placeholder="123 Main Street" className="pl-10 bg-background" />
                    </div>
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="City">
                      <Input value={form.city} onChange={e => updateField("city", e.target.value)} placeholder="Austin" className="bg-background" />
                    </FormField>
                    <FormField label="State">
                      <select
                        value={form.state}
                        onChange={e => updateField("state", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select state</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </FormField>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Emergency Contact
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Contact Name">
                        <Input value={form.emergencyContactName} onChange={e => updateField("emergencyContactName", e.target.value)} placeholder="Jane Doe" className="bg-background" />
                      </FormField>
                      <FormField label="Contact Phone">
                        <Input value={form.emergencyContactPhone} onChange={e => updateField("emergencyContactPhone", e.target.value)} placeholder="+1 (555) 000-0000" className="bg-background" />
                      </FormField>
                    </div>
                  </div>
                </div>
              )}

              {step === "membership" && (
                <div className="space-y-4">
                  <FormField label="Membership Plan">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => { setSelectedPlanId(null); setSkipPayment(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                          !selectedPlanId
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">No plan — skip for now</span>
                          {!selectedPlanId && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </button>
                      {activePlans.map((plan: MembershipPlan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                            selectedPlanId === plan.id
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-foreground">{plan.name}</span>
                              {plan.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-primary">
                                {formatPrice(plan.price, plan.billingInterval)}
                              </span>
                              {selectedPlanId === plan.id && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </FormField>

                  {selectedPlanId && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                      <Checkbox
                        id="skip-payment"
                        checked={skipPayment}
                        onCheckedChange={(c) => setSkipPayment(!!c)}
                        className="mt-0.5"
                      />
                      <div>
                        <label htmlFor="skip-payment" className="text-sm font-medium text-foreground cursor-pointer">
                          Skip payment for now
                        </label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Add the member without collecting card info. You can set up billing from their profile later.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                      <Checkbox
                        id="waiver"
                        checked={form.waiverSigned}
                        onCheckedChange={(c) => updateField("waiverSigned", !!c)}
                        className="mt-0.5"
                      />
                      <div>
                        <label htmlFor="waiver" className="text-sm font-medium text-foreground cursor-pointer">
                          Liability Waiver Signed
                        </label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Confirm the member has signed the gym's liability waiver and release form.
                        </p>
                      </div>
                    </div>
                  </div>

                  <FormField label="Tags">
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={form.tags} onChange={e => updateField("tags", e.target.value)} placeholder="vip, morning-class, competition" className="pl-10 bg-background" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Separate multiple tags with commas</p>
                  </FormField>
                </div>
              )}

              {step === "payment" && (
                <div className="space-y-4">
                  {selectedPlan && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{selectedPlan.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {formatPrice(selectedPlan.price, selectedPlan.billingInterval)}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm text-foreground font-medium flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4" /> Card Details
                    </Label>
                    {stripeLoading && !paymentReady && (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span className="text-sm">Loading payment form...</span>
                      </div>
                    )}
                    <div
                      ref={cardMountRef}
                      className="min-h-[60px] rounded-lg border border-input p-3"
                      style={{ display: paymentReady ? "block" : stripeLoading ? "none" : "block" }}
                    />
                    {stripeError && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{stripeError}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Card information is securely processed by Stripe. We never store card details on our servers.
                    </p>
                  </div>
                </div>
              )}

              {step === "review" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-primary/5 px-4 py-2.5 border-b border-border flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Personal Info</span>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-sm">
                      <ReviewRow label="Name" value={`${form.firstName} ${form.lastName}`} />
                      <ReviewRow label="Email" value={form.email} />
                      {form.phone && <ReviewRow label="Phone" value={form.phone} />}
                      {form.birthDate && <ReviewRow label="Date of Birth" value={new Date(form.birthDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />}
                    </div>
                  </div>

                  {(form.address || form.city || form.emergencyContactName) && (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="bg-primary/5 px-4 py-2.5 border-b border-border flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Contact & Emergency</span>
                      </div>
                      <div className="px-4 py-3 space-y-1.5 text-sm">
                        {form.address && <ReviewRow label="Address" value={`${form.address}${form.city ? `, ${form.city}` : ""}${form.state ? `, ${form.state}` : ""}`} />}
                        {form.emergencyContactName && <ReviewRow label="Emergency" value={`${form.emergencyContactName}${form.emergencyContactPhone ? ` (${form.emergencyContactPhone})` : ""}`} />}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-primary/5 px-4 py-2.5 border-b border-border flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Membership & Billing</span>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-sm">
                      {selectedPlan ? (
                        <>
                          <ReviewRow label="Plan" value={selectedPlan.name} />
                          <ReviewRow label="Price" value={formatPrice(selectedPlan.price, selectedPlan.billingInterval)} />
                          {confirmedSetupIntentId ? (
                            <ReviewRow label="Payment" value={cardSummary ? `${cardSummary.brand.toUpperCase()} ····${cardSummary.last4}` : "Card on file"} />
                          ) : skipPayment ? (
                            <ReviewRow label="Payment" value="Skipped — set up later" highlight />
                          ) : null}
                        </>
                      ) : (
                        <ReviewRow label="Plan" value="None selected" highlight />
                      )}
                      <ReviewRow label="Waiver" value={form.waiverSigned ? "Signed" : "Not signed"} highlight={!form.waiverSigned} />
                      {form.tags && <ReviewRow label="Tags" value={form.tags} />}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          {stepIndex > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted"
            >
              Cancel
            </button>
          )}

          {step === "review" ? (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Add Member
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={step === "payment" && stripeLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {step === "payment" && stripeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {step === "payment" ? "Confirm Card" : "Continue"}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
