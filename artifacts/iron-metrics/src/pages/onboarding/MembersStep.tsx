import React, { useState, useEffect } from "react";
import { Loader2, UserPlus, Upload, Check, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImportMembersDialog } from "@/components/members/ImportMembersDialog";
import { StepCard } from "./StepCard";
import { apiFetch } from "./types";
import type { StepProps } from "./types";

export function MembersStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", status: "active",
  });

  const fetchMembers = async () => {
    try {
      const data = await apiFetch(`/api/gyms/${gymId}/members?limit=1`);
      setMemberCount(Array.isArray(data) ? data.length : data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [gymId]);

  const handleAddMember = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/gyms/${gymId}/members`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          joinDate: new Date().toISOString().split("T")[0],
        }),
      });
      toast({ title: "Member added" });
      setShowAddForm(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", status: "active" });
      await fetchMembers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Add Your Members" description="Bring your member list into Iron Metrics. You can import from a CSV or add members one at a time." onSkip={onSkip} onBack={onBack}>
      {memberCount > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 mb-6 flex items-center gap-4">
          <div className="h-10 w-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="font-medium text-green-400">Members found</p>
            <p className="text-sm text-muted-foreground">You already have members in the system.</p>
          </div>
        </div>
      )}

      {memberCount === 0 && !showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setImportOpen(true)}
            className="bg-background/50 border border-border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
          >
            <Upload className="h-8 w-8 text-primary mb-3" />
            <p className="font-medium text-foreground mb-1">Import from CSV</p>
            <p className="text-sm text-muted-foreground">Upload a spreadsheet with your member list. Supports common formats.</p>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-background/50 border border-border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
          >
            <UserPlus className="h-8 w-8 text-primary mb-3" />
            <p className="font-medium text-foreground mb-1">Add Manually</p>
            <p className="text-sm text-muted-foreground">Enter member details one at a time. Good for small teams.</p>
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="John" />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@email.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Member
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        {memberCount > 0 && (
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <ImportMembersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => {
          fetchMembers();
        }}
      />
    </StepCard>
  );
}
