import React, { useState, useEffect } from "react";
import { useGetGym, useUpdateGym, getGetGymQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "America/Toronto",
  "Europe/London", "Europe/Berlin", "Australia/Sydney",
];

interface Props {
  gymId: number;
}

export function GeneralSettings({ gymId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: gym, isLoading } = useGetGym(gymId, { query: { enabled: !!gymId } });
  const updateGymMutation = useUpdateGym();

  const [form, setForm] = useState({
    name: "", businessName: "", description: "", email: "", phone: "",
    address: "", city: "", state: "", zip: "", timezone: "America/New_York", website: "",
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (gym) {
      setForm({
        name: gym.name || "",
        businessName: gym.businessName || "",
        description: gym.description || "",
        email: gym.email || "",
        phone: gym.phone || "",
        address: gym.address || "",
        city: gym.city || "",
        state: gym.state || "",
        zip: gym.zip || "",
        timezone: gym.timezone || "America/New_York",
        website: gym.website || "",
      });
      setDirty(false);
    }
  }, [gym]);

  const update = (field: string, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Validation Error", description: "Gym name is required.", variant: "destructive" });
      return;
    }
    updateGymMutation.mutate(
      {
        gymId,
        data: {
          name: form.name,
          businessName: form.businessName || null,
          description: form.description || null,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          timezone: form.timezone,
          website: form.website || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(gymId) });
          toast({ title: "Settings Saved", description: "Gym information has been updated." });
          setDirty(false);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || error?.message || "Failed to save.", variant: "destructive" });
        },
      }
    );
  };

  const handleCancel = () => {
    if (gym) {
      setForm({
        name: gym.name || "",
        businessName: gym.businessName || "",
        description: gym.description || "",
        email: gym.email || "",
        phone: gym.phone || "",
        address: gym.address || "",
        city: gym.city || "",
        state: gym.state || "",
        zip: gym.zip || "",
        timezone: gym.timezone || "America/New_York",
        website: gym.website || "",
      });
      setDirty(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
            <div className="h-5 w-40 bg-muted rounded mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-1">Gym Identity</h3>
        <p className="text-sm text-muted-foreground mb-5">Your gym's name and branding as it appears across the platform.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gym-name">Gym Name *</Label>
            <Input id="gym-name" value={form.name} onChange={e => update("name", e.target.value)} placeholder="Iron Haven CrossFit" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-name">Legal / Business Name</Label>
            <Input id="business-name" value={form.businessName} onChange={e => update("businessName", e.target.value)} placeholder="Iron Haven Fitness LLC" />
            <p className="text-xs text-muted-foreground">If different from your gym name.</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="gym-desc">Description</Label>
            <Textarea id="gym-desc" value={form.description} onChange={e => update("description", e.target.value)} placeholder="A brief description of your gym..." rows={3} className="resize-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gym-website">Website</Label>
            <Input id="gym-website" value={form.website} onChange={e => update("website", e.target.value)} placeholder="https://ironhavencrossfit.com" />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-1">Contact & Location</h3>
        <p className="text-sm text-muted-foreground mb-5">Address and contact details for your gym.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gym-email">Contact Email</Label>
            <Input id="gym-email" type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="info@ironhavencrossfit.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gym-phone">Phone</Label>
            <Input id="gym-phone" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="gym-address">Street Address</Label>
            <Input id="gym-address" value={form.address} onChange={e => update("address", e.target.value)} placeholder="123 Main Street" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gym-city">City</Label>
            <Input id="gym-city" value={form.city} onChange={e => update("city", e.target.value)} placeholder="Austin" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gym-state">State</Label>
              <Input id="gym-state" value={form.state} onChange={e => update("state", e.target.value)} placeholder="TX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gym-zip">ZIP</Label>
              <Input id="gym-zip" value={form.zip} onChange={e => update("zip", e.target.value)} placeholder="78701" />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-1">Timezone</h3>
        <p className="text-sm text-muted-foreground mb-5">Used for scheduling, reporting, and communications.</p>
        <div className="max-w-sm">
          <Select value={form.timezone} onValueChange={v => update("timezone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {dirty && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-4 z-10">
          <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
            <div className="flex items-center gap-3">
              <button onClick={handleCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-border hover:bg-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateGymMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {updateGymMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
