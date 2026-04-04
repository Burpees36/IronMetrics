import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Puzzle, CheckCircle2, Circle, MessageSquare, ExternalLink } from "lucide-react";
import { WodifyConnectionCard } from "./WodifyConnectionCard";
import { useGetGym } from "@workspace/api-client-react";

const STATIC_INTEGRATIONS = [
  {
    name: "Stripe",
    desc: "Payment processing, subscriptions, and billing.",
    status: "connected" as const,
    statusText: "Connected",
  },
  {
    name: "Resend",
    desc: "Transactional email delivery for member communications.",
    status: "connected" as const,
    statusText: "Connected",
  },
];

interface Props {
  gymId?: number;
  onNavigateToSection?: (sectionId: string) => void;
}

export function IntegrationsSettings({ gymId, onNavigateToSection }: Props) {
  const { data: gym } = useGetGym(gymId as number, { query: { enabled: !!gymId } });

  const gymData = gym as Record<string, unknown> | undefined;
  const smsConfigured = !!(gymData?.twilioAccountSid && gymData?.twilioAuthToken && gymData?.twilioPhoneNumber);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Puzzle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Connected Services</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WodifyConnectionCard />

          {STATIC_INTEGRATIONS.map((integration, i) => {
            const isConnected = integration.status === "connected";
            return (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.05 }}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{integration.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{integration.desc}</p>
                  </div>
                  <Badge variant="outline" className={isConnected ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}>
                    {isConnected ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Circle className="h-3 w-3 mr-1" />}
                    {integration.statusText}
                  </Badge>
                </div>
                <button className="w-full px-4 py-2 text-sm font-medium rounded-xl border transition-colors border-border text-muted-foreground hover:bg-secondary">
                  Manage
                </button>
              </motion.div>
            );
          })}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold text-foreground">SMS / Twilio</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Send text messages for reminders and outreach.</p>
              </div>
              <Badge variant="outline" className={smsConfigured ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}>
                {smsConfigured ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Circle className="h-3 w-3 mr-1" />}
                {smsConfigured ? "Connected" : "Not Configured"}
              </Badge>
            </div>
            <button
              onClick={() => onNavigateToSection?.("sms")}
              className={`w-full px-4 py-2 text-sm font-medium rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                smsConfigured
                  ? "border-border text-muted-foreground hover:bg-secondary"
                  : "border-primary/30 text-primary hover:bg-primary/10"
              }`}
            >
              {smsConfigured ? "Manage" : "Configure"}
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
