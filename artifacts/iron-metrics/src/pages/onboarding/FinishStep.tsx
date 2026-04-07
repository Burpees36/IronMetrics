import React from "react";
import { motion } from "framer-motion";
import {
  Database, Building2, Rocket, CreditCard, Mail,
  Check, ChevronLeft, ArrowRight, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OnboardingState } from "./types";

export function FinishStep({ state, onFinish, onBack, onGoToStep }: {
  state: OnboardingState | null;
  onFinish: () => void;
  onBack: () => void;
  onGoToStep?: (step: string) => void;
}) {
  const counts = state?.counts;

  const gymName = state?.gymName;
  const gymTimezone = state?.gymTimezone;
  const essentialsComplete = !!(gymName && gymName.trim() && gymTimezone && gymTimezone.trim());

  const summaryItems = [
    { id: "gym_details", label: "Gym Details", complete: state?.stepStatus?.gym_details, icon: Building2, required: true },
    { id: "connect_billing", label: "Connect Billing", complete: state?.stepStatus?.connect_billing, icon: CreditCard, required: false },
    { id: "connect_data", label: "Member Data", complete: state?.stepStatus?.connect_data, count: counts?.members, icon: Database, required: false },
    { id: "email_branding", label: "Email Branding", complete: state?.stepStatus?.email_branding, icon: Mail, required: false },
  ];

  const isSkipped = (id: string) => state?.skippedSteps?.includes(id) || false;

  return (
    <Card className="p-6 md:p-8 bg-card border-border">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="h-16 w-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Rocket className="h-8 w-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          {essentialsComplete ? "You're All Set!" : "Almost There!"}
        </h2>
        <p className="text-muted-foreground">
          {essentialsComplete
            ? "Here's a summary of your setup. You can always adjust things later in Settings."
            : "Complete the required steps before launching your gym."}
        </p>
      </div>

      {!essentialsComplete && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-500">Required: Gym name and timezone</p>
            <p className="text-xs text-muted-foreground mt-1">
              Go back to Gym Details to set your gym name and timezone before launching.
            </p>
            {onGoToStep && (
              <button
                onClick={() => onGoToStep("gym_details")}
                className="mt-2 text-xs text-primary hover:underline font-medium"
              >
                Go to Gym Details
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex items-center gap-4 bg-background/50 rounded-xl p-4 border border-border">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              item.complete ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
            }`}>
              {item.complete ? <Check className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
            </div>
            <span className="flex-1 text-foreground">
              {item.label}
              {item.required && <span className="text-xs text-muted-foreground ml-1">(required)</span>}
            </span>
            {item.count !== undefined && item.count > 0 && (
              <Badge variant="secondary">{item.count} {item.count === 1 ? "member" : "members"}</Badge>
            )}
            {item.complete ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Complete</Badge>
            ) : isSkipped(item.id) ? (
              <Badge variant="secondary">Skipped</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Not started</Badge>
            )}
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={onFinish} disabled={!essentialsComplete}>
        {essentialsComplete ? (
          <>Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" /></>
        ) : (
          "Complete required steps to launch"
        )}
      </Button>

      <div className="mt-6 pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Go Back
        </Button>
      </div>
    </Card>
  );
}
