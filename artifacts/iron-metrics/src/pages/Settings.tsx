import React, { useState, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import { useGetGym } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Building2, Users, Mail, CreditCard, Shield, ShieldOff, Palette, Puzzle, AlertTriangle, Settings as SettingsIcon, Dumbbell, MessageSquare, Loader2 } from "lucide-react";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { StaffSettings } from "@/components/settings/StaffSettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { SmsSettings } from "@/components/settings/SmsSettings";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { PlatformBillingSettings } from "@/components/settings/PlatformBillingSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { ProgrammingSettings } from "@/components/settings/ProgrammingSettings";
import { DangerZone } from "@/components/settings/DangerZone";
import { CommunicationStyleSettings } from "@/components/settings/CommunicationStyleSettings";
import { PageError } from "@/components/ui/page-error";

const SECTIONS = [
  { id: "general", label: "General", icon: Building2 },
  { id: "staff", label: "Staff & Access", icon: Users },
  { id: "programming", label: "Programming", icon: Dumbbell },
  { id: "email", label: "Email & Notifications", icon: Mail },
  { id: "sms", label: "SMS / Text Messaging", icon: MessageSquare },
  { id: "platform-billing", label: "Platform Subscription", icon: CreditCard },
  { id: "billing", label: "Member Payment Policies", icon: ShieldOff },
  { id: "security", label: "Security", icon: Shield },
  { id: "communication", label: "Communication Style", icon: MessageSquare },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Puzzle },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function Settings() {
  const { activeGymId } = useGym();
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const { data: gym, isLoading: gymLoading, isError: gymError, refetch: refetchGym } = useGetGym(activeGymId as number, { query: { enabled: !!activeGymId } });
  const [location] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");
    if (section && SECTIONS.some(s => s.id === section)) {
      setActiveSection(section as SectionId);
    }
  }, [location]);

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view settings.</p>
      </div>
    );
  }

  if (gymLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (gymError) {
    return (
      <PageError
        title="Unable to load settings"
        message="We couldn't load your gym settings. Check your connection and try again."
        onRetry={() => refetchGym()}
      />
    );
  }

  const currentSection = SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 mb-4 md:mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your gym, team, and platform configuration.</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 min-h-0">
        <nav className="shrink-0 lg:w-56">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible scrollbar-none pb-2 lg:pb-0">
            {SECTIONS.map(section => {
              const isActive = section.id === activeSection;
              const isDanger = section.id === "danger";
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? isDanger
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                      : isDanger
                        ? "text-destructive/70 hover:bg-destructive/5 border border-transparent"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                  }`}
                >
                  <section.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{section.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pb-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-4 lg:mb-6">
              <h2 className="text-xl font-semibold text-foreground">{currentSection.label}</h2>
            </div>

            {activeSection === "general" && <GeneralSettings gymId={activeGymId} />}
            {activeSection === "staff" && <StaffSettings gymId={activeGymId} />}
            {activeSection === "programming" && <ProgrammingSettings gymId={activeGymId} />}
            {activeSection === "email" && <EmailSettings gymId={activeGymId} />}
            {activeSection === "sms" && <SmsSettings gymId={activeGymId} />}
            {activeSection === "platform-billing" && <PlatformBillingSettings />}
            {activeSection === "billing" && <BillingSettings />}
            {activeSection === "security" && <SecuritySettings />}
            {activeSection === "communication" && <CommunicationStyleSettings gymId={activeGymId} />}
            {activeSection === "branding" && <BrandingSettings gymId={activeGymId} />}
            {activeSection === "integrations" && <IntegrationsSettings gymId={activeGymId} onNavigateToSection={(id) => setActiveSection(id as SectionId)} />}
            {activeSection === "danger" && <DangerZone gymName={gym?.name || "gym"} />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
