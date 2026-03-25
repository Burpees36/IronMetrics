import React, { useState, useEffect } from "react";
import { Loader2, Users2, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { StepCard } from "./StepCard";
import { apiFetch } from "./types";
import type { StepProps } from "./types";

export function StaffStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", role: "coach",
  });

  const fetchStaff = async () => {
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/staff`);
      setStaff(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, [gymId]);

  const handleInvite = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}/staff`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast({ title: "Staff member added" });
      setShowForm(false);
      setForm({ firstName: "", lastName: "", email: "", role: "coach" });
      await fetchStaff();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  const ROLE_LABELS: Record<string, string> = {
    gym_owner: "Owner", admin: "Admin", coach: "Coach", front_desk: "Front Desk", analyst: "Analyst",
  };

  return (
    <StepCard title="Your Team" description="Add your coaches and staff. They can be invited to log in later." onSkip={onSkip} onBack={onBack}>
      {staff.length > 0 && (
        <div className="space-y-3 mb-6">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-4 bg-background/50 rounded-xl p-4 border border-border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {s.firstName[0]}{s.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{s.firstName} {s.lastName}</p>
                <p className="text-sm text-muted-foreground">{s.email}</p>
              </div>
              <Badge variant="secondary">{ROLE_LABELS[s.role] || s.role}</Badge>
            </div>
          ))}
        </div>
      )}

      {staff.length <= 1 && !showForm && (
        <div className="text-center py-8 bg-background/30 rounded-xl border border-dashed border-border mb-4">
          <Users2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            {staff.length === 1 ? "It's just you so far. Add your coaches and staff." : "Add your team members."}
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff Member
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Sarah" />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Johnson" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sarah@yourgym.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="front_desk">Front Desk</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Staff
            </Button>
          </div>
        </div>
      )}

      {staff.length > 1 && !showForm && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Another
          </Button>
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {staff.length <= 1 && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </StepCard>
  );
}
