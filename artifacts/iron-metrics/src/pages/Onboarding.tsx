import React, { useState, useEffect, useCallback } from "react";
import { useGym } from "@/store/GymContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { STEPS, apiFetch } from "./onboarding/types";
import type { StepId, OnboardingState } from "./onboarding/types";
import { BasicsStep } from "./onboarding/BasicsStep";
import { ConnectDataStep } from "./onboarding/ConnectDataStep";
import { EmailBrandingStep } from "./onboarding/EmailBrandingStep";
import { FinishStep } from "./onboarding/FinishStep";

export function Onboarding() {
  const { activeGymId } = useGym();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>("gym_details");

  const fetchOnboarding = useCallback(async () => {
    if (!activeGymId) return;
    try {
      const data = await apiFetch(`/api/gyms/${activeGymId}/onboarding`);
      setState(data);
      if (data.isComplete) {
        setActiveStep("finish");
      } else {
        const validStepIds = STEPS.map((s) => s.id) as readonly string[];
        if (validStepIds.includes(data.currentStep)) {
          setActiveStep(data.currentStep as StepId);
        } else {
          setActiveStep("gym_details");
        }
      }
    } catch (e) {
      console.error("Failed to fetch onboarding state", e);
    } finally {
      setLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => { fetchOnboarding(); }, [fetchOnboarding]);

  const updateStep = async (action: string, step?: string): Promise<boolean> => {
    if (!activeGymId) return false;
    try {
      const data = await apiFetch(`/api/gyms/${activeGymId}/onboarding`, {
        method: "PATCH",
        body: JSON.stringify({ action, step }),
      });
      setState(data);
      return true;
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
      return false;
    }
  };

  const handleComplete = async (step: StepId) => {
    const ok = await updateStep("complete_step", step);
    if (!ok) return;
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) {
      setActiveStep(STEPS[idx + 1].id);
    }
  };

  const handleSkip = async (step: StepId) => {
    const ok = await updateStep("skip_step", step);
    if (!ok) return;
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) {
      setActiveStep(STEPS[idx + 1].id);
    }
  };

  const handleBack = () => {
    const idx = STEPS.findIndex((s) => s.id === activeStep);
    if (idx > 0) setActiveStep(STEPS[idx - 1].id);
  };

  const handleGoToStep = (stepId: string) => {
    const validStepIds = STEPS.map((s) => s.id) as readonly string[];
    if (validStepIds.includes(stepId)) {
      setActiveStep(stepId as StepId);
      updateStep("go_to_step", stepId);
    }
  };

  const handleFinish = async () => {
    const ok = await updateStep("finish");
    if (!ok) return;
    setLocation("/dashboard");
  };

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a business first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const isStepComplete = (id: string) => state?.completedSteps.includes(id) || state?.stepStatus[id] || false;
  const isStepSkipped = (id: string) => state?.skippedSteps.includes(id) || false;
  const progress = state ? ((state.completedSteps.length + state.skippedSteps.length) / (STEPS.length - 1)) * 100 : 0;

  return (
    <div className="min-h-[80vh] pb-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Set Up Your Business
            </h1>
            <p className="text-muted-foreground">
              Complete these steps and you'll be ready to run your business.
            </p>
          </motion.div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-1 mb-3">
            {STEPS.map((step, i) => {
              const complete = isStepComplete(step.id);
              const skipped = isStepSkipped(step.id);
              const active = step.id === activeStep;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => {
                      setActiveStep(step.id);
                      updateStep("go_to_step", step.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : complete
                        ? "bg-green-500/10 text-green-400 hover:bg-green-500/15"
                        : skipped
                        ? "bg-muted/50 text-muted-foreground hover:bg-muted"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                      complete ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className="hidden md:inline">{step.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 max-w-6 ${complete ? "bg-green-500/50" : "bg-border"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="h-1 bg-card rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeStep === "gym_details" && (
              <BasicsStep
                gymId={activeGymId}
                onComplete={() => handleComplete("gym_details")}
                onSkip={() => handleSkip("gym_details")}
                isComplete={isStepComplete("gym_details")}
              />
            )}
            {activeStep === "connect_data" && (
              <ConnectDataStep
                gymId={activeGymId}
                onComplete={() => handleComplete("connect_data")}
                onSkip={() => handleSkip("connect_data")}
                onBack={handleBack}
                isComplete={isStepComplete("connect_data")}
              />
            )}
            {activeStep === "email_branding" && (
              <EmailBrandingStep
                gymId={activeGymId}
                onComplete={() => handleComplete("email_branding")}
                onSkip={() => handleSkip("email_branding")}
                onBack={handleBack}
                isComplete={isStepComplete("email_branding")}
              />
            )}
            {activeStep === "finish" && (
              <FinishStep
                state={state}
                onFinish={handleFinish}
                onBack={handleBack}
                onGoToStep={handleGoToStep}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
