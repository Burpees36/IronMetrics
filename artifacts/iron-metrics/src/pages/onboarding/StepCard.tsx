import React from "react";
import { ChevronLeft, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function StepCard({ children, title, description, onSkip, onBack, skipLabel }: {
  children: React.ReactNode;
  title: string;
  description: string;
  onSkip?: () => void;
  onBack?: () => void;
  skipLabel?: string;
}) {
  return (
    <Card className="p-6 md:p-8 bg-card border-border">
      <div className="mb-6">
        <h2 className="text-xl font-display font-semibold text-foreground mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <div>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
        </div>
        <div>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              <SkipForward className="h-4 w-4 mr-1" /> {skipLabel || "Skip for now"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
