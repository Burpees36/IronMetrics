import React, { useState, useEffect, useCallback } from "react";
import { useGym } from "@/store/GymContext";
import {
  useCreateMember, useCheckMemberEmail, useListMembershipTypes,
  getListMembersQueryKey,
} from "@workspace/api-client-react";
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
  UserPlus, Eye, Plus, ClipboardList,
} from "lucide-react";

type WizardStep = "personal" | "contact" | "membership" | "review";
const STEPS: WizardStep[] = ["personal", "contact", "membership", "review"];
const STEP_LABELS: Record<WizardStep, string> = {
  personal: "Personal Info",
  contact: "Contact & Emergency",
  membership: "Membership",
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const [customType, setCustomType] = useState("");

  const createMutation = useCreateMember();

  const { data: emailCheck } = useCheckMemberEmail(gymId, { email: debouncedEmail }, {
    query: { enabled: !!gymId && debouncedEmail.length > 3 && debouncedEmail.includes("@") } as any,
  });

  const { data: membershipTypes } = useListMembershipTypes(gymId, {
    query: { enabled: !!gymId } as any,
  });

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
        setCustomType("");
      }, 200);
    }
  }, [open]);

  const updateField = useCallback((field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }, []);

  const validateStep = (s: WizardStep): boolean => {
    const e: Record<string, string> = {};
    if (s === "personal") {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.lastName.trim()) e.lastName = "Last name is required";
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Invalid email format";
      if (emailCheck?.exists) e.email = `Already in use by ${emailCheck.memberName}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleSubmit = () => {
    if (!validateStep("personal")) { setStep("personal"); return; }

    const resolvedType = form.membershipType === "__custom__" ? customType.trim() : form.membershipType;

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
        membershipType: resolvedType || null,
        waiverSigned: form.waiverSigned,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      },
    }, {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(gymId) });
        setCreatedMemberId(data.id);
        setShowSuccess(true);
      },
      onError: (err: any) => {
        const fieldErrors = err?.response?.data?.fieldErrors;
        if (fieldErrors) {
          setErrors(fieldErrors);
          if (fieldErrors.firstName || fieldErrors.lastName || fieldErrors.email) setStep("personal");
        } else {
          toast({ title: "Error", description: err?.response?.data?.error || "Failed to create member.", variant: "destructive" });
        }
      },
    });
  };

  const stepIndex = STEPS.indexOf(step);

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
            <p className="text-sm text-muted-foreground mb-6">
              <span className="font-semibold text-foreground">{form.firstName} {form.lastName}</span> has been successfully added to your gym.
            </p>
            <div className="flex gap-3 w-full">
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
                  setCustomType("");
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
              <p className="text-xs text-muted-foreground">Step {stepIndex + 1} of {STEPS.length} — {STEP_LABELS[step]}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
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
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
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
                    <select
                      value={form.membershipType}
                      onChange={e => updateField("membershipType", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">No plan selected</option>
                      {(membershipTypes as string[] || []).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value="__custom__">+ Enter custom plan...</option>
                    </select>
                  </FormField>
                  {form.membershipType === "__custom__" && (
                    <FormField label="Custom Plan Name">
                      <Input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="e.g. 5x Week Premium" className="bg-background" />
                    </FormField>
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
                      <span className="text-sm font-semibold text-foreground">Membership</span>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-sm">
                      <ReviewRow label="Plan" value={(form.membershipType === "__custom__" ? customType : form.membershipType) || "None selected"} />
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
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
