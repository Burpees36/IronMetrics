import React, { useState, useEffect } from "react";
import { Loader2, Mail, Phone, Globe, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { StepCard } from "./StepCard";
import { apiFetch, TIMEZONES } from "./types";
import type { StepProps } from "./types";

export function BasicsStep({ gymId, onComplete, onSkip, isComplete }: StepProps) {
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", timezone: "America/New_York",
    address: "", city: "", state: "", zip: "", website: "",
  });

  useEffect(() => {
    apiFetch(`/api/gyms/${gymId}`).then((data) => {
      setGym(data);
      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        timezone: data.timezone || "America/New_York",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
        website: data.website || "",
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gymId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Gym name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      toast({ title: "Gym profile saved" });
      onComplete();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Welcome! Let's set up your gym." description="Start with the basics — your name, location, and how members can reach you." onSkip={onSkip}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Gym Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CrossFit Iron Forge" />
        </div>
        <div>
          <Label>Contact Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@yourgym.com" />
          </div>
        </div>
        <div>
          <Label>Phone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
          </div>
        </div>
        <div>
          <Label>Timezone</Label>
          <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Website</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://yourgym.com" />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" />
          </div>
        </div>
        <div>
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Seattle" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>State</Label>
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="WA" />
          </div>
          <div>
            <Label>ZIP</Label>
            <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="98101" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save & Continue <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </StepCard>
  );
}
