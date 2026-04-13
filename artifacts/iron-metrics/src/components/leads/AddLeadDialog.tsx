import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateLead, getListLeadsQueryKey, getGetLeadInsightsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, User, Mail, Phone, Tag, MessageSquare, Loader2 } from "lucide-react";
import { SOURCE_OPTIONS } from "./lead-utils";

interface AddLeadDialogProps {
  gymId: number;
  open: boolean;
  onClose: () => void;
}

export function AddLeadDialog({ gymId, open, onClose }: AddLeadDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    source: "",
    notes: "",
  });

  const createMutation = useCreateLead();

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) return;
    createMutation.mutate(
      {
        gymId,
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          source: formData.source || null,
          notes: formData.notes || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Lead added", description: `${formData.firstName} ${formData.lastName} is now in your pipeline.` });
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey(gymId) });
          queryClient.invalidateQueries({ queryKey: getGetLeadInsightsQueryKey(gymId) });
          setFormData({ firstName: "", lastName: "", email: "", phone: "", source: "", notes: "" });
          onClose();
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to create lead." });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Add a prospective member to your sales pipeline.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-fn" className="flex items-center gap-1.5 text-xs">
                <User className="h-3 w-3 text-muted-foreground" />
                First Name *
              </Label>
              <Input
                id="add-fn"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-ln" className="text-xs">Last Name *</Label>
              <Input
                id="add-ln"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-email" className="flex items-center gap-1.5 text-xs">
              <Mail className="h-3 w-3 text-muted-foreground" />
              Email *
            </Label>
            <Input
              id="add-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-phone" className="flex items-center gap-1.5 text-xs">
              <Phone className="h-3 w-3 text-muted-foreground" />
              Phone
            </Label>
            <Input
              id="add-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Tag className="h-3 w-3 text-muted-foreground" />
              Source
            </Label>
            <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val })}>
              <SelectTrigger>
                <SelectValue placeholder="How did they find you?" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-notes" className="flex items-center gap-1.5 text-xs">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              Notes
            </Label>
            <textarea
              id="add-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anything to note about this lead..."
              rows={2}
              className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.firstName || !formData.lastName || !formData.email || createMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {createMutation.isPending ? "Adding..." : "Add Lead"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
