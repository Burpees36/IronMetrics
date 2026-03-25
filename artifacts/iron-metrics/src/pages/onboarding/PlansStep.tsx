import React, { useState, useEffect } from "react";
import { Loader2, CreditCard, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { StepCard } from "./StepCard";
import { apiFetch } from "./types";
import type { StepProps } from "./types";

export function PlansStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", price: "", billingInterval: "monthly", description: "",
  });

  const fetchPlans = async () => {
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/plans`);
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, [gymId]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}/plans`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: form.price,
          gymId,
        }),
      });
      toast({ title: "Plan created" });
      setShowForm(false);
      setForm({ name: "", price: "", billingInterval: "monthly", description: "" });
      await fetchPlans();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Membership Plans" description="Set up your pricing so members know what's available. You can always add more later." onSkip={onSkip} onBack={onBack}>
      {plans.length > 0 && (
        <div className="space-y-3 mb-6">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between bg-background/50 rounded-xl p-4 border border-border">
              <div>
                <p className="font-medium text-foreground">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{plan.description || "No description"}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">${parseFloat(plan.price).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">/{plan.billingInterval}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {plans.length === 0 && !showForm && (
        <div className="text-center py-8 bg-background/30 rounded-xl border border-dashed border-border">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No membership plans yet. Create your first one.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Plan
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Plan Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Unlimited Monthly" />
            </div>
            <div>
              <Label>Price *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="149.00" />
            </div>
            <div>
              <Label>Billing Interval</Label>
              <Select value={form.billingInterval} onValueChange={(v) => setForm({ ...form, billingInterval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Access to all classes" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Plan
            </Button>
          </div>
        </div>
      )}

      {plans.length > 0 && !showForm && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Another
          </Button>
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </StepCard>
  );
}
