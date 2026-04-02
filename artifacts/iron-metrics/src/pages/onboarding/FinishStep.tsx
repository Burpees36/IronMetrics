import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Database, Building2, Rocket,
  Check, ChevronLeft, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OnboardingState } from "./types";

export function FinishStep({ state, onFinish, onBack }: {
  state: OnboardingState | null;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [, setLocation] = useLocation();
  const counts = state?.counts;

  const summaryItems = [
    { label: "Member Data", complete: state?.stepStatus?.connect_data, count: counts?.members, icon: Database },
    { label: "Gym Details", complete: state?.stepStatus?.gym_details, icon: Building2 },
  ];

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
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">You're All Set!</h2>
        <p className="text-muted-foreground">Here's a summary of your setup. You can always adjust things later in Settings.</p>
      </div>

      <div className="space-y-3 mb-8">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex items-center gap-4 bg-background/50 rounded-xl p-4 border border-border">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              item.complete ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
            }`}>
              {item.complete ? <Check className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
            </div>
            <span className="flex-1 text-foreground">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <Badge variant="secondary">{item.count} {item.count === 1 ? "member" : "members"}</Badge>
            )}
            {item.complete ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Complete</Badge>
            ) : (
              <Badge variant="secondary">Skipped</Badge>
            )}
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={onFinish}>
        Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
      </Button>

      <div className="mt-6 pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Go Back
        </Button>
      </div>
    </Card>
  );
}
