import React from "react";
import { useLocation } from "wouter";
import { Lock, ArrowUpRight, TrendingUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface UpgradePromptProps {
  feature: string;
  requiredTier?: "growth" | "pro";
  className?: string;
}

const TIER_INFO = {
  growth: {
    name: "Growth",
    price: "$199/month",
    icon: TrendingUp,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  pro: {
    name: "Pro",
    price: "$299/month",
    icon: Crown,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
};

export function UpgradePrompt({ feature, requiredTier = "growth", className = "" }: UpgradePromptProps) {
  const [, setLocation] = useLocation();
  const tier = TIER_INFO[requiredTier];
  const Icon = tier.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center min-h-[400px] p-8 text-center ${className}`}
    >
      <div className={`h-16 w-16 ${tier.bgColor} rounded-2xl flex items-center justify-center mb-6`}>
        <Lock className={`h-8 w-8 ${tier.color}`} />
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2">{feature} is locked</h2>
      <p className="text-muted-foreground mb-2 max-w-sm">
        This feature is available on the <strong className={tier.color}>{tier.name}</strong> plan and above.
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        Upgrade to unlock {feature} and take full control of your gym.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => setLocation("/plan-selection")}>
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Upgrade to {tier.name} — {tier.price}
        </Button>
        <Button variant="outline" onClick={() => setLocation("/settings?section=platform-billing")}>
          View current plan
        </Button>
      </div>
    </motion.div>
  );
}
