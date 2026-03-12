import React, { useState, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import { useGetGym, useListStaff, useInviteStaff, useUpdateGym, getListStaffQueryKey, getGetGymQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Settings as SettingsIcon, Users, Building2, Plus, Mail, Save, CheckCircle2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Settings() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: gym, isLoading: gymLoading } = useGetGym(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: staff, isLoading: staffLoading } = useListStaff(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const inviteStaffMutation = useInviteStaff();
  const updateGymMutation = useUpdateGym();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", firstName: "", lastName: "", role: "coach" as string });
  const [emailForm, setEmailForm] = useState({ fromName: "", fromEmail: "" });
  const [emailFormDirty, setEmailFormDirty] = useState(false);

  useEffect(() => {
    if (gym) {
      setEmailForm({
        fromName: gym.fromName || "",
        fromEmail: gym.fromEmail || "",
      });
    }
  }, [gym]);

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view settings.</p>
      </div>
    );
  }

  const isLoading = gymLoading || staffLoading;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const handleSaveEmailSettings = () => {
    if (emailForm.fromEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailForm.fromEmail)) {
        toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
        return;
      }
    }
    updateGymMutation.mutate(
      { gymId: activeGymId as number, data: { fromName: emailForm.fromName || null, fromEmail: emailForm.fromEmail || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(activeGymId as number) });
          toast({ title: "Email Settings Saved", description: "Your outbound email settings have been updated." });
          setEmailFormDirty(false);
        },
        onError: (error: any) => {
          const msg = error?.data?.error || error?.message || "Failed to save email settings.";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleInviteStaff = () => {
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) return;
    inviteStaffMutation.mutate(
      { gymId: activeGymId, data: { email: inviteForm.email, firstName: inviteForm.firstName, lastName: inviteForm.lastName, role: inviteForm.role as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(activeGymId) });
          toast({ title: "Staff invited", description: `${inviteForm.firstName} ${inviteForm.lastName} has been invited.` });
          setInviteOpen(false);
          setInviteForm({ email: "", firstName: "", lastName: "", role: "coach" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to invite staff member." });
        }
      }
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground mt-1">Gym configuration and staff management.</p>
      </header>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="space-y-4 mt-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">Gym Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Gym Name</Label>
                  <p className="text-foreground font-medium mt-1">{gym?.name || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Address</Label>
                  <p className="text-foreground font-medium mt-1">{gym?.address || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Phone</Label>
                  <p className="text-foreground font-medium mt-1">{gym?.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Timezone</Label>
                  <p className="text-foreground font-medium mt-1">{gym?.timezone || "—"}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Email Settings</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-5">Configure how outbound emails appear to your members. Emails sent from the AI Operator will use these settings.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={emailForm.fromName}
                    onChange={(e) => { setEmailForm({ ...emailForm, fromName: e.target.value }); setEmailFormDirty(true); }}
                    placeholder='e.g. "Coach Mike" or "Iron Haven CrossFit"'
                  />
                  <p className="text-xs text-muted-foreground">The name members will see in their inbox.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={emailForm.fromEmail}
                    onChange={(e) => { setEmailForm({ ...emailForm, fromEmail: e.target.value }); setEmailFormDirty(true); }}
                    placeholder="e.g. mike@ironhavencrossfit.com"
                  />
                  <p className="text-xs text-muted-foreground">Must be a verified domain on your email provider.</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  {gym?.fromEmail ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Email sender configured
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No email sender configured yet</span>
                  )}
                </div>
                <button
                  onClick={handleSaveEmailSettings}
                  disabled={updateGymMutation.isPending || !emailFormDirty}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {updateGymMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Email Settings
                </button>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Staff Members</h3>
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
              >
                <Plus className="h-5 w-5" />
                <span>Invite Staff</span>
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold">Role</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staff?.map((member: any, i: number) => (
                      <motion.tr
                        key={member.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-foreground">{member.firstName} {member.lastName}</td>
                        <td className="px-6 py-4 text-muted-foreground">{member.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
                            {member.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                            member.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {member.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    {(!staff || staff.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                          No staff members yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })} placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="front_desk">Front Desk</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setInviteOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleInviteStaff}
              disabled={inviteStaffMutation.isPending || !inviteForm.email || !inviteForm.firstName || !inviteForm.lastName}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {inviteStaffMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Mail className="h-4 w-4" />
              Send Invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
