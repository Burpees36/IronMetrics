import React, { useState, useEffect } from "react";
import { useGetGym, useUpdateGym, getGetGymQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Save, MessageSquare, CheckCircle2, AlertCircle, Send, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE_URL = import.meta.env.BASE_URL || "/";
const API_BASE = `${BASE_URL}api`.replace(/\/+/g, "/");

interface Props {
  gymId: number;
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function SmsSettings({ gymId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: gym, isLoading } = useGetGym(gymId, { query: { enabled: !!gymId } });
  const updateMutation = useUpdateGym();

  const [form, setForm] = useState({
    smsEnabled: false,
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
  });
  const [dirty, setDirty] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    if (gym) {
      setForm({
        smsEnabled: (gym as any).smsEnabled || false,
        twilioAccountSid: (gym as any).twilioAccountSid || "",
        twilioAuthToken: (gym as any).twilioAuthToken || "",
        twilioPhoneNumber: (gym as any).twilioPhoneNumber || "",
      });
      setDirty(false);
    }
  }, [gym]);

  const update = (field: string, value: string | boolean) => {
    setForm(p => ({ ...p, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    if (form.smsEnabled && (!form.twilioAccountSid || !form.twilioAuthToken || !form.twilioPhoneNumber)) {
      toast({ title: "Missing Fields", description: "Please fill in all Twilio credentials before enabling SMS.", variant: "destructive" });
      return;
    }

    updateMutation.mutate(
      {
        gymId,
        data: {
          smsEnabled: form.smsEnabled,
          twilioAccountSid: form.twilioAccountSid || null,
          twilioAuthToken: form.twilioAuthToken || null,
          twilioPhoneNumber: form.twilioPhoneNumber || null,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(gymId) });
          toast({ title: "SMS Settings Saved", description: "Your SMS configuration has been updated." });
          setDirty(false);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || error?.message || "Failed to save.", variant: "destructive" });
        },
      }
    );
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      toast({ title: "Phone Required", description: "Enter a phone number to send a test message.", variant: "destructive" });
      return;
    }

    setTestSending(true);
    try {
      const response = await fetch(`${API_BASE}/gyms/${gymId}/sms/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: testPhone }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: "Test SMS Sent", description: `Message sent to ${testPhone}` });
      } else {
        toast({ title: "Test Failed", description: data.error || "Failed to send test SMS", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error sending test SMS", variant: "destructive" });
    } finally {
      setTestSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const isConfigured = form.smsEnabled && form.twilioAccountSid && form.twilioAuthToken && form.twilioPhoneNumber;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">SMS / Text Messaging</h3>
          </div>
          <ToggleSwitch
            checked={form.smsEnabled}
            onChange={(v) => update("smsEnabled", v)}
            disabled={updateMutation.isPending}
          />
        </div>
        <p className="text-sm text-muted-foreground mb-5">Connect your Twilio account to send text messages to members and leads. US/Canada numbers only.</p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twilioAccountSid">Twilio Account SID</Label>
              <Input
                id="twilioAccountSid"
                value={form.twilioAccountSid}
                onChange={e => update("twilioAccountSid", e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                type="password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilioAuthToken">Twilio Auth Token</Label>
              <Input
                id="twilioAuthToken"
                value={form.twilioAuthToken}
                onChange={e => update("twilioAuthToken", e.target.value)}
                placeholder="Your auth token"
                type="password"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="twilioPhoneNumber">Twilio Phone Number</Label>
            <Input
              id="twilioPhoneNumber"
              value={form.twilioPhoneNumber}
              onChange={e => update("twilioPhoneNumber", e.target.value)}
              placeholder="+1234567890"
            />
            <p className="text-xs text-muted-foreground">The phone number your texts will be sent from. Must be a Twilio number in E.164 format.</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                SMS configured
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                SMS not configured
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </motion.div>

      {isConfigured && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Send Test Message</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Verify your Twilio configuration by sending a test text message.</p>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <button
              onClick={handleTestSms}
              disabled={testSending || !testPhone}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              Send Test
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
